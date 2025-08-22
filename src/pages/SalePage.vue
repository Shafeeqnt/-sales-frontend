<template>
  <div class="checkout-page">
    <!-- Page Title -->
    <h1 class="title">🛒 Checkout</h1>

    <!-- If no items in cart -->
    <div v-if="cart.items.length === 0" class="empty-cart">
      <a-empty description="Your cart is empty. Add products to begin checkout." />
    </div>

    <!-- If items exist -->
    <div v-else>
      <!-- Cart Table -->
      <a-card bordered class="cart-card">
        <a-table
          :data-source="cart.items"
          :columns="columns"
          row-key="productId"
          bordered
          size="middle"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <!-- Quantity editable -->
            <template v-if="column.key === 'quantity'">
              <a-input-number
                v-model:value="record.quantity"
                :min="1"
                style="width: 80px"
              />
            </template>

            <!-- Action -->
            <template v-if="column.key === 'action'">
              <a-popconfirm
                title="Remove this item?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="cart.removeFromCart(record.productId)"
              >
                <a-button type="primary" danger size="small">Remove</a-button>
              </a-popconfirm>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- Checkout Summary -->
      <a-card class="summary-card" bordered>
        <h2 class="summary-title">💳 Payment & Summary</h2>

        <a-row gutter="16">
          <a-col :span="12">
            <a-form layout="vertical">
              <a-form-item label="Payment Method">
                <a-select v-model:value="paymentMethod" style="width: 100%">
                  <a-select-option value="Cash">Cash</a-select-option>
                  <a-select-option value="Card">Card</a-select-option>
                  <a-select-option value="UPI">UPI</a-select-option>
                </a-select>
              </a-form-item>
            </a-form>
          </a-col>

          <a-col :span="12" class="total-section">
            <div class="total-label">Total Amount</div>
            <div class="total-value">₹ {{ (cart.totalAmount || 0).toFixed(2) }}</div>
          </a-col>
        </a-row>

        <!-- Checkout Button -->
        <div class="checkout-btn">
          <a-button
            type="primary"
            size="large"
            @click="checkout"
            :disabled="cart.items.length === 0"
          >
            ✅ Complete Sale
          </a-button>
        </div>
      </a-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useCartStore } from "../stores/cartStore";
import { supabase } from "@/lib/supabase";

const cart = useCartStore();
const paymentMethod = ref("Cash");

const columns = [
  { title: "Product", dataIndex: ["product", "name"], key: "product" },
  { title: "Qty", key: "quantity" },
  {
    title: "Unit Price",
    dataIndex: "unitPrice",
    key: "unitPrice",
    customRender: ({ record }) => `₹ ${(record.unitPrice || 0).toFixed(2)}`,
  },
  {
    title: "Total",
    key: "total",
    customRender: ({ record }) =>
      `₹ ${(record.quantity * (record.unitPrice || 0)).toFixed(2)}`,
  },
  { title: "Action", key: "action" },
];

async function checkout() {
  try {
    console.log('Starting checkout process...');
    console.log('Cart items:', cart.items);
    console.log('Total amount:', cart.totalAmount);
    console.log('Payment method:', paymentMethod.value);

    // Step 1: insert into sales (using lowercase column names to match database)
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([
        {
          saledate: new Date(),
          totalamount: cart.totalAmount,
          paymentmethod: paymentMethod.value,
        },
      ])
      .select()
      .single();

    if (saleError) {
      console.error('Sale insert error:', saleError);
      throw saleError;
    }

    console.log('Sale created:', sale);

    // Step 2: insert into sale_items (using lowercase column names)
    const saleItems = cart.items.map((i) => ({
      sale_id: sale.id,
      product_id: i.productId,
      quantity: i.quantity,
      unitprice: i.unitPrice,
    }));

    console.log('Sale items to insert:', saleItems);

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems);
    
    if (itemsError) {
      console.error('Sale items insert error:', itemsError);
      throw itemsError;
    }

    console.log('Sale items inserted successfully');

    // Step 3: decrement stock (if you have this function)
    for (let i of cart.items) {
      try {
        await supabase.rpc("decrement_stock", {
          p_id: i.productId,
          p_qty: i.quantity,
        });
        console.log(`Stock decremented for product ${i.productId}`);
      } catch (stockError) {
        console.warn('Stock decrement failed (function may not exist):', stockError);
        // Continue even if stock decrement fails
      }
    }

    cart.clearCart();
    alert("✅ Sale completed successfully!");
  } catch (err) {
    console.error("❌ Checkout failed:", err);
    alert(`Error during checkout: ${err.message}`);
  }
}
</script>

<style scoped>
.checkout-page {
  padding: 20px;
}

.title {
  margin-bottom: 20px;
  font-weight: bold;
}

.cart-card {
  margin-bottom: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.summary-card {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-top: 20px;
}

.summary-title {
  font-size: 18px;
  margin-bottom: 15px;
}

.total-section {
  text-align: right;
  padding: 10px 0;
}

.total-label {
  font-size: 14px;
  color: #888;
}

.total-value {
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
}

.checkout-btn {
  text-align: right;
  margin-top: 20px;
}

.empty-cart {
  padding: 50px;
  text-align: center;
}
</style>