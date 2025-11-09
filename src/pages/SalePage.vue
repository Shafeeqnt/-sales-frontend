<template>
  <div class="checkout-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="title">🛒 FootPrints - Point of Sale</h1>
      
      <div class="header-actions">
        <!-- Barcode Scanner Status -->
        <div class="scanner-status">
          <a-badge :status="barcodeScanner.isListening.value ? 'processing' : 'default'" />
          <span :style="{ color: barcodeScanner.isListening.value ? '#52c41a' : '#999' }">
            Scanner: {{ barcodeScanner.isListening.value ? 'Active' : 'Inactive' }}
          </span>
          <a-button 
            :type="barcodeScanner.isListening.value ? 'default' : 'primary'"
            size="small"
            @click="toggleScanner"
            style="margin-left: 8px;"
          >
            {{ barcodeScanner.isListening.value ? 'Stop' : 'Start' }} Scanner
          </a-button>
        </div>
        
        <a-button @click="$router.push('/products')" type="default">
          ← Back to Products
        </a-button>
      </div>
    </div>

    <!-- Scanner Alert -->
    <a-alert
      v-if="barcodeScanner.isListening.value"
      message="📱 Barcode Scanner Active - Scan any product barcode to add it to cart"
      type="info"
      show-icon
      closable
      style="margin-bottom: 16px"
      @close="barcodeScanner.stopListening"
    />

    <!-- Last Scanned Product Alert -->
    <a-alert
      v-if="lastScannedProduct"
      :message="`✅ Last Scanned: ${lastScannedProduct.name} - Added to cart!`"
      type="success"
      show-icon
      closable
      style="margin-bottom: 16px"
      @close="lastScannedProduct = null"
    />

    <!-- If no items in cart -->
    <div v-if="cart.isEmpty" class="empty-cart">
      <a-empty description="Your cart is empty. Add products to begin checkout.">
        <a-space>
          <a-button type="primary" @click="$router.push('/products')">
            Browse Products
          </a-button>
          <a-button 
            :type="barcodeScanner.isListening.value ? 'default' : 'primary'"
            @click="toggleScanner"
          >
            {{ barcodeScanner.isListening.value ? 'Stop Scanner' : 'Start Barcode Scanner' }}
          </a-button>
        </a-space>
      </a-empty>
    </div>

    <!-- If items exist -->
    <div v-else>
      <a-row :gutter="24">
        <!-- Left Column - Cart Items -->
        <a-col :span="14">
          <a-card title="Cart Items" bordered class="cart-card">
            <!-- Total Savings Display -->
            <div v-if="cart.totalSavings > 0" class="savings-banner">
              <span style="color: #52c41a; font-weight: bold;">
                🎉 You're saving ₹{{ cart.totalSavings.toFixed(2) }} on this purchase!
              </span>
            </div>

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
                    <div v-if="record.discount_info" style="font-size: 11px; color: #52c41a; margin-top: 2px;">
                      💰 {{ record.discount_info }}
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
                  <div>
                    <div style="font-weight: bold;">₹{{ Number(record.unit_price).toLocaleString() }}</div>
                    <div v-if="record.mrp > record.unit_price" style="font-size: 11px; color: #999; text-decoration: line-through;">
                      MRP: ₹{{ Number(record.mrp).toLocaleString() }}
                    </div>
                  </div>
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

          <!-- Quick Actions -->
          <a-card title="Quick Actions" bordered class="quick-actions-card">
            <a-space direction="vertical" style="width: 100%">
              <a-button 
                block
                :type="barcodeScanner.isListening.value ? 'default' : 'primary'"
                @click="toggleScanner"
                :icon="barcodeScanner.isListening.value ? 'stop' : 'scan'"
              >
                {{ barcodeScanner.isListening.value ? 'Stop Scanner' : 'Start Barcode Scanner' }}
              </a-button>
              
              <a-button 
                block
                @click="clearCart"
                :disabled="cart.isEmpty"
                danger
              >
                Clear Cart
              </a-button>
            </a-space>
          </a-card>

          <!-- Order Summary -->
          <a-card title="Order Summary" bordered class="summary-card">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>₹{{ cart.subtotal.toLocaleString() }}</span>
            </div>
            <div class="summary-row" v-if="cart.totalSavings > 0" style="color: #52c41a;">
              <span>Product Savings:</span>
              <span>-₹{{ cart.totalSavings.toLocaleString() }}</span>
            </div>
            <div class="summary-row" v-if="saleInfo.discount_amount > 0">
              <span>Additional Discount:</span>
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
          <a-button type="default" @click="printBill">🖨️ Print Bill</a-button>
          <a-button type="primary" @click="startNewSale">New Sale</a-button>
        </a-space>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from "vue";
import { useCartStore } from "../stores/cartStore";
import { useProductStore } from "../stores/productStore";
import { useRouter } from "vue-router";
import { useBarcodeScanner } from "../composables/useBarcodeScanner";
import { DeleteOutlined } from '@ant-design/icons-vue';

const cart = useCartStore();
const productStore = useProductStore();
const router = useRouter();
const barcodeScanner = useBarcodeScanner();

const processing = ref(false);
const successModalVisible = ref(false);
const completedSale = ref({});
const lastScannedProduct = ref(null);

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
  { title: "Unit Price", key: "unit_price", width: 120, align: 'right' },
  { title: "Total", key: "total_price", width: 120, align: 'right' },
  { title: "", key: "action", width: 50, align: 'center' }
];

const debugBarcodeScan = (barcode) => {
  console.log('🔍 Debugging barcode scan:', barcode);
  const product = barcodeScanner.findProductByBarcode(barcode);
  console.log('📦 Product found:', product);
  
  if (product) {
    barcodeScanner.processScan(barcode);
    lastScannedProduct.value = product;
    console.log('✅ Product added to cart via debug');
  } else {
    console.log('❌ Product not found for barcode:', barcode);
    console.log('📋 Available products:', productStore.products.map(p => ({
      name: p.name,
      barcode: p.barcode,
      product_code: p.product_code,
      id: p.id
    })));
  }
};

// Expose to window for console access
window.debugBarcodeScan = debugBarcodeScan;
window.barcodeScanner = barcodeScanner;
window.cartStore = cart;

console.log('🐛 Debug functions loaded!');
console.log('Available commands: debugBarcodeScan(barcode), barcodeScanner, cartStore');

// Watch for successful barcode scans
watch(() => barcodeScanner.lastScannedCode.value, (newCode) => {
  if (newCode) {
    const product = barcodeScanner.findProductByBarcode(newCode)
    if (product) {
      lastScannedProduct.value = product
      setTimeout(() => {
        lastScannedProduct.value = null
      }, 5000)
    }
  }
})

// Watch for changes in customer and sale info
watch(customerInfo, (newVal) => {
  cart.setCustomerInfo(newVal);
}, { deep: true });

watch(saleInfo, (newVal) => {
  cart.setSaleInfo(newVal);
}, { deep: true });

// Toggle barcode scanner
const toggleScanner = () => {
  if (barcodeScanner.isListening.value) {
    barcodeScanner.stopListening()
  } else {
    barcodeScanner.startListening()
  }
}

// Clear cart
const clearCart = () => {
  if (confirm('Are you sure you want to clear the cart?')) {
    cart.clearCart()
  }
}

async function handleCheckout() {
  if (cart.isEmpty) {
    return;
  }

  processing.value = true;
  
  try {
    // CRITICAL: Store cart data BEFORE completing sale (cart will be cleared after)
    const savedCartData = {
      items: cart.items.map(item => ({
        product_name: item.product_name,
        product_code: item.product_code,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        mrp: item.mrp
      })),
      subtotal: cart.subtotal,
      totalAmount: cart.totalAmount,
      totalSavings: cart.totalSavings,
      discount: Number(saleInfo.discount_amount) || 0,
      tax: Number(saleInfo.tax_amount) || 0,
      payment: saleInfo.payment_method
    };
    
    console.log('Saved cart data before sale:', savedCartData);
    
    const result = await cart.completeSale();
    
    if (result.success) {
      completedSale.value = {
        saleNumber: result.saleNumber,
        finalAmount: result.finalAmount,
        ...savedCartData
      };
      console.log('completedSale after checkout:', completedSale.value);
      successModalVisible.value = true;
    }
  } catch (error) {
    console.error('Checkout failed:', error);
    
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

function printBill() {
  console.log('🖨️ Printing bill. completedSale:', completedSale.value);
  
  const billDate = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Get data directly from completedSale (saved before cart was cleared)
  const subtotal = completedSale.value.subtotal || 0;
  const discount = completedSale.value.discount || 0;
  const tax = completedSale.value.tax || 0;
  const grandTotal = completedSale.value.finalAmount || 0;
  const paymentMethod = completedSale.value.payment || 'cash';

  // Build items HTML
  let itemsHTML = '';
  const items = completedSale.value.items || [];
  
  console.log('📦 Items to print:', items);
  
  if (items.length === 0) {
    console.error('❌ No items found in completedSale!');
    alert('Error: No items to print. Please try again.');
    return;
  }
  
  items.forEach(item => {
    const itemTotal = (item.unit_price * item.quantity).toFixed(2);
    itemsHTML += `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd;">${item.product_name}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: right;">₹${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: right;">₹${itemTotal}</td>
      </tr>
    `;
  });

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bill - ${completedSale.value.saleNumber}</title>
      <style>
        @media print {
          @page {
            size: 33cm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        
        body {
          font-family: 'Courier New', monospace;
          width: 33cm;
          margin: 0 auto;
          padding: 1cm;
          font-size: 14px;
        }
        
        .bill-container {
          width: 100%;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #000;
          padding-bottom: 15px;
        }
        
        .store-name {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
        }
        
        .store-tagline {
          font-size: 14px;
          margin: 2px 0;
          color: #666;
        }
        
        .bill-info {
          margin: 15px 0;
          font-size: 14px;
        }
        
        .bill-info-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }
        
        .separator {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }
        
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        
        .items-table th {
          text-align: left;
          padding: 8px 4px;
          border-bottom: 2px solid #000;
          font-weight: bold;
          font-size: 14px;
        }
        
        .items-table td {
          padding: 8px 4px;
          font-size: 14px;
        }
        
        .totals {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid #000;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 6px 0;
          font-size: 14px;
        }
        
        .grand-total {
          font-weight: bold;
          font-size: 18px;
          padding-top: 10px;
          border-top: 2px solid #000;
          margin-top: 10px;
        }
        
        .footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px dashed #000;
          font-size: 14px;
        }
        
        .footer-note {
          margin: 6px 0;
        }
      </style>
    </head>
    <body>
      <div class="bill-container">
        <!-- Header -->
        <div class="header">
          <div style="font-size: 24px;">👟</div>
          <h1 class="store-name">FootPrints</h1>
          <div class="store-tagline">Point of Sale System</div>
        </div>
        
        <!-- Bill Information -->
        <div class="bill-info">
          <div class="bill-info-row">
            <span>Bill No:</span>
            <span><strong>${completedSale.value.saleNumber}</strong></span>
          </div>
          <div class="bill-info-row">
            <span>Time:</span>
            <span>${billDate}</span>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- Items Table -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 45%;">Item</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Price</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="separator"></div>
        
        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${Number(subtotal).toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
          <div class="total-row">
            <span>Discount:</span>
            <span>-₹${Number(discount).toFixed(2)}</span>
          </div>
          ` : ''}
          ${tax > 0 ? `
          <div class="total-row">
            <span>Tax:</span>
            <span>+₹${Number(tax).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row grand-total">
            <span>Grand Total:</span>
            <span>₹${Number(grandTotal).toFixed(2)}</span>
          </div>
          <div class="total-row" style="margin-top: 8px;">
            <span>Payment Method:</span>
            <span style="text-transform: uppercase;">${paymentMethod.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="separator"></div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="footer-note">Thank you for your purchase!</div>
          <div class="footer-note">Visit again 🙏</div>
          <div class="footer-note" style="margin-top: 8px; font-size: 12px;">
            Powered by FootPrints POS
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Open print window with larger dimensions
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  printWindow.document.write(printHTML);
  printWindow.document.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 500);
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.scanner-status {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: #fafafa;
}

.title {
  margin: 0;
  font-weight: bold;
  color: #1890ff;
}

.savings-banner {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
  text-align: center;
}

.cart-card, .customer-card, .sale-card, .summary-card, .quick-actions-card {
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