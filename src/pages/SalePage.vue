<template>
  <div class="checkout-page">
    <!-- Page Title -->
    <div class="page-header">
      <h1 class="title">🛒 Point of Sale</h1>
      <a-button @click="$router.push('/products')" type="default">
        ← Back to Products
      </a-button>
    </div>

    <!-- If no items in cart -->
    <div v-if="cart.isEmpty" class="empty-cart">
      <a-empty description="Your cart is empty. Add products to begin checkout.">
        <a-button type="primary" @click="$router.push('/products')">
          Browse Products
        </a-button>
      </a-empty>
    </div>

    <!-- If items exist -->
    <div v-else>
      <a-row :gutter="24">
        <!-- Left Column - Cart Items -->
        <a-col :span="14">
          <a-card title="Cart Items" bordered class="cart-card">
            <a-table
              :data-source="cart.items"
              :columns="cartColumns"
              row-key="id"
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <!-- Product Info -->
                <template v-if="column.key === 'product'">
                  <div>
                    <div style="font-weight: bold;">{{ record.product_name }}</div>
                    <div style="font-size: 12px; color: #666;">
                      Code: {{ record.product_code }}
                    </div>
                  </div>
                </template>

                <!-- Quantity with controls -->
                <template v-if="column.key === 'quantity'">
                  <a-input-number
                    :value="record.quantity"
                    @change="(value) => cart.updateQuantity(record.id, value)"
                    :min="1"
                    :max="record.available_stock"
                    size="small"
                    style="width: 80px"
                  />
                </template>

                <!-- Unit Price -->
                <template v-if="column.key === 'unit_price'">
                  ₹{{ Number(record.unit_price).toLocaleString() }}
                </template>

                <!-- Total Price -->
                <template v-if="column.key === 'total_price'">
                  <strong>₹{{ Number(record.total_price).toLocaleString() }}</strong>
                </template>

                <!-- Action -->
                <template v-if="column.key === 'action'">
                  <a-popconfirm
                    title="Remove this item?"
                    ok-text="Yes"
                    cancel-text="No"
                    @confirm="cart.removeFromCart(record.id)"
                  >
                    <a-button type="text" danger size="small">
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-popconfirm>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>

        <!-- Right Column - Customer Info & Checkout -->
        <a-col :span="10">
          <!-- Customer Information -->
          <a-card title="Customer Information" bordered class="customer-card">
            <a-form layout="vertical">
              <a-form-item label="Customer Name">
                <a-input 
                  v-model:value="customerInfo.name" 
                  placeholder="Optional"
                />
              </a-form-item>
              <a-form-item label="Phone Number">
                <a-input 
                  v-model:value="customerInfo.phone" 
                  placeholder="Optional"
                />
              </a-form-item>
              <a-form-item label="Email">
                <a-input 
                  v-model:value="customerInfo.email" 
                  placeholder="Optional"
                />
              </a-form-item>
            </a-form>
          </a-card>

          <!-- Sale Details -->
          <a-card title="Sale Details" bordered class="sale-card">
            <a-form layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="Discount (₹)">
                    <a-input-number
                      v-model:value="saleInfo.discount_amount"
                      :min="0"
                      :max="cart.subtotal"
                      style="width: 100%"
                      :precision="2"
                    />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="Tax (₹)">
                    <a-input-number
                      v-model:value="saleInfo.tax_amount"
                      :min="0"
                      style="width: 100%"
                      :precision="2"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
              
              <a-form-item label="Payment Method">
                <a-select v-model:value="saleInfo.payment_method" style="width: 100%">
                  <a-select-option value="cash">Cash</a-select-option>
                  <a-select-option value="card">Card</a-select-option>
                  <a-select-option value="upi">UPI</a-select-option>
                  <a-select-option value="bank_transfer">Bank Transfer</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item label="Notes">
                <a-textarea 
                  v-model:value="saleInfo.notes" 
                  rows="2" 
                  placeholder="Optional notes"
                />
              </a-form-item>
            </a-form>
          </a-card>

          <!-- Order Summary -->
          <a-card title="Order Summary" bordered class="summary-card">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>₹{{ cart.subtotal.toLocaleString() }}</span>
            </div>
            <div class="summary-row" v-if="saleInfo.discount_amount > 0">
              <span>Discount:</span>
              <span class="discount">-₹{{ Number(saleInfo.discount_amount).toLocaleString() }}</span>
            </div>
            <div class="summary-row" v-if="saleInfo.tax_amount > 0">
              <span>Tax:</span>
              <span>+₹{{ Number(saleInfo.tax_amount).toLocaleString() }}</span>
            </div>
            <a-divider style="margin: 12px 0" />
            <div class="summary-row total-row">
              <span>Total Amount:</span>
              <span>₹{{ cart.totalAmount.toLocaleString() }}</span>
            </div>

            <!-- Checkout Button -->
            <a-button
              type="primary"
              size="large"
              block
              @click="handleCheckout"
              :loading="processing"
              :disabled="cart.isEmpty"
              style="margin-top: 16px"
            >
              💳 Complete Sale
            </a-button>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- Success Modal -->
    <a-modal
      v-model:open="successModalVisible"
      title="Sale Completed Successfully!"
      :footer="null"
      width="400px"
    >
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; color: #52c41a; margin-bottom: 16px;">
          ✅
        </div>
        <h3>Sale #{{ completedSale.saleNumber }}</h3>
        <p style="font-size: 18px; margin: 16px 0;">
          Total: ₹{{ completedSale.finalAmount?.toLocaleString() }}
        </p>
        <a-space>
          <a-button @click="successModalVisible = false">Close</a-button>
          <a-button type="primary" @click="startNewSale">New Sale</a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { useCartStore } from "../stores/cartStore";
import { useRouter } from "vue-router";
import { DeleteOutlined } from '@ant-design/icons-vue';

const cart = useCartStore();
const router = useRouter();

const processing = ref(false);
const successModalVisible = ref(false);
const completedSale = ref({});

const customerInfo = reactive({
  name: '',
  phone: '',
  email: ''
});

const saleInfo = reactive({
  discount_amount: 0,
  tax_amount: 0,
  payment_method: 'cash',
  notes: ''
});

const cartColumns = [
  { title: "Product", key: "product", width: 200 },
  { title: "Qty", key: "quantity", width: 80, align: 'center' },
  { title: "Unit Price", key: "unit_price", width: 100, align: 'right' },
  { title: "Total", key: "total_price", width: 120, align: 'right' },
  { title: "", key: "action", width: 50, align: 'center' }
];

// Watch for changes in customer and sale info
watch(customerInfo, (newVal) => {
  cart.setCustomerInfo(newVal);
}, { deep: true });

watch(saleInfo, (newVal) => {
  cart.setSaleInfo(newVal);
}, { deep: true });

async function handleCheckout() {
  if (cart.isEmpty) {
    return;
  }

  processing.value = true;
  
  try {
    const result = await cart.completeSale();
    
    if (result.success) {
      completedSale.value = result;
      successModalVisible.value = true;
    }
  } catch (error) {
    console.error('Checkout failed:', error);
    
    // Show user-friendly error message
    let errorMessage = 'An error occurred during checkout.';
    if (error.message.includes('stock')) {
      errorMessage = 'Some items are out of stock. Please check your cart.';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    alert(errorMessage);
  } finally {
    processing.value = false;
  }
}

function startNewSale() {
  successModalVisible.value = false;
  router.push('/products');
}
</script>

<style scoped>
.checkout-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  margin: 0;
  font-weight: bold;
  color: #1890ff;
}

.cart-card, .customer-card, .sale-card, .summary-card {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
}

.total-row {
  font-size: 18px;
  font-weight: bold;
  color: #1890ff;
}

.discount {
  color: #f5222d;
}

.empty-cart {
  padding: 100px 20px;
  text-align: center;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>