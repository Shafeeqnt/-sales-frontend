<template>
  <div class="sales-summary">
    <a-page-header
      title="Sales Summary"
      sub-title="View and filter your sales data"
      style="margin-bottom: 24px"
    />

    <!-- Filters Section -->
    <a-card title="Filters" style="margin-bottom: 24px">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Start Date">
            <a-date-picker
              v-model:value="filters.startDate"
              placeholder="Select start date"
              style="width: 100%"
              format="YYYY-MM-DD"
              @change="handleFilterChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="End Date">
            <a-date-picker
              v-model:value="filters.endDate"
              placeholder="Select end date"
              style="width: 100%"
              format="YYYY-MM-DD"
              @change="handleFilterChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Payment Method">
            <a-select
              v-model:value="filters.paymentMethod"
              placeholder="All payment methods"
              allow-clear
              style="width: 100%"
              @change="handleFilterChange"
            >
              <a-select-option value="cash">Cash</a-select-option>
              <a-select-option value="card">Card</a-select-option>
              <a-select-option value="upi">UPI</a-select-option>
              <a-select-option value="online">Online</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row>
        <a-col :span="24">
          <a-space>
            <a-button type="primary" @click="handleFilterChange">
              Apply Filters
            </a-button>
            <a-button @click="handleClearFilters">
              Clear Filters
            </a-button>
          </a-space>
        </a-col>
      </a-row>
    </a-card>

    <!-- Summary Cards -->
    <a-row :gutter="16" style="margin-bottom: 24px">
      <a-col :span="6">
        <a-statistic
          title="Total Sales"
          :value="filteredSales.length"
          :precision="0"
        />
      </a-col>
      <a-col :span="6">
        <a-statistic
          title="Total Revenue"
          :value="totalRevenue"
          :precision="2"
          prefix="₹"
        />
      </a-col>
      <a-col :span="6">
        <a-statistic
          title="Total Discount"
          :value="totalDiscount"
          :precision="2"
          prefix="₹"
        />
      </a-col>
      <a-col :span="6">
        <a-statistic
          title="Total Tax"
          :value="totalTax"
          :precision="2"
          prefix="₹"
        />
      </a-col>
    </a-row>

    <!-- Sales Table -->
    <a-card>
      <template #title>
        <span>Sales List</span>
        <a-button
          type="link"
          :loading="loading"
          @click="handleRefresh"
          style="float: right"
        >
          Refresh
        </a-button>
      </template>

      <a-table
        :columns="columns"
        :data-source="filteredSales"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sale_date'">
            {{ formatDate(record.sale_date) }}
          </template>
          <template v-else-if="column.key === 'amounts'">
            <div>
              <div>Total: ₹{{ parseFloat(record.total_amount).toFixed(2) }}</div>
              <div style="font-size: 12px; color: #888">
                Final: ₹{{ parseFloat(record.final_amount).toFixed(2) }}
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'customer'">
            <div v-if="record.customer_name">
              <div>{{ record.customer_name }}</div>
              <div v-if="record.customer_phone" style="font-size: 12px; color: #888">
                {{ record.customer_phone }}
              </div>
            </div>
            <span v-else style="color: #999">-</span>
          </template>
          <template v-else-if="column.key === 'payment_method'">
            <a-tag :color="getPaymentMethodColor(record.payment_method)">
              {{ record.payment_method?.toUpperCase() || 'N/A' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button type="primary" size="small" @click="handleViewDetails(record)">
              View Bill
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Bill Details Modal -->
    <a-modal
      v-model:open="isModalOpen"
      title="Bill Details"
      :footer="null"
      width="650px"
    >
      <div v-if="selectedSale" style="padding: 10px 0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
          <div>
            <strong>Bill No:</strong> {{ selectedSale.sale_number }}<br />
            <strong>Date:</strong> {{ formatDate(selectedSale.sale_date) }}
          </div>
          <div style="text-align: right;">
            <strong>Payment Method:</strong> 
            <a-tag :color="getPaymentMethodColor(selectedSale.payment_method)">
              {{ selectedSale.payment_method?.toUpperCase() || 'N/A' }}
            </a-tag>
          </div>
        </div>

        <div style="margin-bottom: 16px; padding: 12px; background-color: #fafafa; border-radius: 6px;">
          <h4 style="margin-top: 0; margin-bottom: 8px;">Customer Information</h4>
          <div v-if="selectedSale.customer_name">
            <strong>Name:</strong> {{ selectedSale.customer_name }}<br />
            <span v-if="selectedSale.customer_phone"><strong>Phone:</strong> {{ selectedSale.customer_phone }}<br /></span>
            <span v-if="selectedSale.customer_email"><strong>Email:</strong> {{ selectedSale.customer_email }}</span>
          </div>
          <div v-else style="color: #888; font-style: italic;">
            No customer details recorded
          </div>
        </div>

        <h4 style="margin-bottom: 8px;">Items</h4>
        <a-table
          :data-source="saleItems"
          :columns="modalColumns"
          row-key="id"
          :pagination="false"
          :loading="loadingItems"
          size="small"
          style="margin-bottom: 16px;"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'unit_price'">
              ₹{{ parseFloat(record.unit_price).toFixed(2) }}
            </template>
            <template v-if="column.key === 'total_price'">
              ₹{{ parseFloat(record.total_price).toFixed(2) }}
            </template>
          </template>
        </a-table>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
          <div style="width: 250px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Subtotal:</span>
              <span>₹{{ parseFloat(selectedSale.total_amount || 0).toFixed(2) }}</span>
            </div>
            <div v-if="selectedSale.discount_amount > 0" style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #f5222d;">
              <span>Discount:</span>
              <span>-₹{{ parseFloat(selectedSale.discount_amount || 0).toFixed(2) }}</span>
            </div>
            <div v-if="selectedSale.tax_amount > 0" style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>Tax:</span>
              <span>+₹{{ parseFloat(selectedSale.tax_amount || 0).toFixed(2) }}</span>
            </div>
            <a-divider style="margin: 8px 0;" />
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
              <span>Grand Total:</span>
              <span>₹{{ parseFloat(selectedSale.final_amount || 0).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <div v-if="selectedSale.notes" style="margin-bottom: 24px; padding: 12px; border-left: 3px solid #1890ff; background: #e6f7ff;">
          <strong>Notes:</strong> {{ selectedSale.notes }}
        </div>

        <div style="text-align: right;">
          <a-space>
            <a-button @click="isModalOpen = false">Close</a-button>
            <a-button type="primary" @click="printBillAgain">
              🖨️ Print Bill Again
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSalesStore } from '../stores/salesStore'
import { useProductStore } from '../stores/productStore'
import { supabase } from '../lib/supabase.js'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

const salesStore = useSalesStore()
const loading = computed(() => salesStore.loading)
const filteredSales = computed(() => salesStore.filteredSales)
const totalRevenue = computed(() => {
  return salesStore.filteredSales.reduce((sum, sale) => sum + parseFloat(sale.final_amount || 0), 0)
})
const totalDiscount = computed(() => {
  return salesStore.filteredSales.reduce((sum, sale) => sum + parseFloat(sale.discount_amount || 0), 0)
})
const totalTax = computed(() => {
  return salesStore.filteredSales.reduce((sum, sale) => sum + parseFloat(sale.tax_amount || 0), 0)
})

const filters = ref({
  startDate: null,
  endDate: null,
  paymentMethod: null,
})

const columns = [
  {
    title: 'Sale Number',
    dataIndex: 'sale_number',
    key: 'sale_number',
    width: 120,
  },
  {
    title: 'Date',
    key: 'sale_date',
    width: 150,
  },
  {
    title: 'Customer',
    key: 'customer',
    width: 200,
  },
  {
    title: 'Amount',
    key: 'amounts',
    width: 150,
  },
  {
    title: 'Discount',
    dataIndex: 'discount_amount',
    key: 'discount_amount',
    width: 100,
    render: (value) => `₹${parseFloat(value || 0).toFixed(2)}`,
  },
  {
    title: 'Payment',
    key: 'payment_method',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    align: 'center',
  },
]

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return dayjs(dateString).format('DD MMM YYYY, HH:mm')
}

const getPaymentMethodColor = (method) => {
  const colors = {
    cash: 'green',
    card: 'blue',
    upi: 'purple',
    online: 'orange',
  }
  return colors[method?.toLowerCase()] || 'default'
}

const handleFilterChange = () => {
  // Convert dayjs objects to Date objects for filtering
  const startDate = filters.value.startDate ? filters.value.startDate.toDate() : null
  const endDate = filters.value.endDate ? filters.value.endDate.toDate() : null
  
  salesStore.setFilter('startDate', startDate)
  salesStore.setFilter('endDate', endDate)
  salesStore.setFilter('paymentMethod', filters.value.paymentMethod)
}

const handleClearFilters = () => {
  filters.value = {
    startDate: null,
    endDate: null,
    paymentMethod: null,
  }
  salesStore.clearFilters()
}

const handleRefresh = async () => {
  try {
    await salesStore.fetchSales()
    message.success('Sales data refreshed')
  } catch (error) {
    message.error('Failed to refresh sales data')
  }
}

const productStore = useProductStore()
const isModalOpen = ref(false)
const selectedSale = ref(null)
const saleItems = ref([])
const loadingItems = ref(false)

const modalColumns = [
  { title: "Product Name", dataIndex: "product_name", key: "product_name" },
  { title: "Product Code", dataIndex: "product_code", key: "product_code", width: 120 },
  { title: "Qty", dataIndex: "quantity", key: "quantity", width: 80, align: 'center' },
  { title: "Unit Price", dataIndex: "unit_price", key: "unit_price", width: 120, align: 'right' },
  { title: "Total Price", dataIndex: "total_price", key: "total_price", width: 120, align: 'right' },
]

async function handleViewDetails(sale) {
  selectedSale.value = sale
  isModalOpen.value = true
  loadingItems.value = true
  saleItems.value = []

  try {
    const { data, error } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale.id)

    if (error) throw error
    saleItems.value = data || []
  } catch (error) {
    console.error('Failed to fetch sale items:', error)
    message.error('Failed to load bill items')
  } finally {
    loadingItems.value = false
  }
}

function printBillAgain() {
  if (!selectedSale.value) return;
  console.log('🖨️ Reprinting bill. selectedSale:', selectedSale.value);

  const billDate = new Date(selectedSale.value.sale_date).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const items = saleItems.value || [];
  const discount = Number(selectedSale.value.discount_amount) || 0;
  const tax = Number(selectedSale.value.tax_amount) || 0;
  const grandTotal = Number(selectedSale.value.final_amount) || 0;
  const paymentMethod = selectedSale.value.payment_method || 'cash';

  console.log('📦 Items to print:', items);

  if (items.length === 0) {
    console.error('❌ No items found for reprint!');
    message.error('Error: No items to print. Please try again.');
    return;
  }

  // Calculate totals
  let totalMRP = 0;
  let subtotalAfterDiscount = 0;
  let productSavings = 0;

  // Build items HTML and calculate savings
  let itemsHTML = '';
  items.forEach(item => {
    // Find product in productStore to resolve original MRP
    const product = productStore.products.find(p => p.id === item.product_id);
    const mrpVal = product ? Number(product.mrp) : Number(item.unit_price);
    
    const itemMRP = mrpVal * Number(item.quantity);
    const itemTotal = Number(item.unit_price) * Number(item.quantity);
    const itemSavings = itemMRP - itemTotal;

    totalMRP += itemMRP;
    subtotalAfterDiscount += itemTotal;
    productSavings += itemSavings;

    itemsHTML += `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd;">${item.product_name}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: right;">₹${Number(mrpVal).toFixed(2)}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: right;">₹${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding: 8px 4px; border-bottom: 1px dashed #ddd; text-align: right;">₹${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  });

  // Calculate total savings (product discounts + additional discount)
  const totalSavings = productSavings + discount;

  const printHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Bill - ${selectedSale.value.sale_number}</title>
       <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        
        body {
          font-family: 'Courier New', monospace;
          width: 80mm;
          margin: 0 auto;
          padding: 2mm;
          font-size: 11px;
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
          font-size: 13px;
          margin: 2px 0;
          color: #666;
        }
        .store-location-tagline {
          font-size: 12px;
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
        
        .savings-row {
          display: flex;
          justify-content: space-between;
          margin: 6px 0;
          font-size: 14px;
          color: #2d7c2d;
          font-weight: 500;
        }
        
        .savings-highlight {
          background: #f0f0f0;
          padding: 8px;
          margin: 10px 0;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 15px;
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
          <div class="store-tagline">A place for genuine leather.</div>
          <div class="store-location-tagline">Kalayapuram, Ph:9947141283</div>
        </div>
        
        <!-- Bill Information -->
        <div class="bill-info">
          <div class="bill-info-row">
            <span>Bill No:</span>
            <span><strong>${selectedSale.value.sale_number}</strong></span>
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
              <th style="width: 10%; text-align: center;">Qty</th>
              <th style="width: 15%; text-align: right;">MRP</th>
              <th style="width: 15%; text-align: right;">Disc Rate</th>
              <th style="width: 15%; text-align: right;">Total</th>
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
            <span>Total MRP:</span>
            <span>₹${Number(totalMRP).toFixed(2)}</span>
          </div>
          ${productSavings > 0 ? `
          <div class="savings-row">
            <span>Product Discounts:</span>
            <span>-₹${Number(productSavings).toFixed(2)}</span>
          </div>
          ` : ''}
          <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${Number(subtotalAfterDiscount).toFixed(2)}</span>
          </div>
          ${discount > 0 ? `
          <div class="savings-row">
            <span>Additional Discount:</span>
            <span>-₹${Number(discount).toFixed(2)}</span>
          </div>
          ` : ''}
          ${tax > 0 ? `
          <div class="total-row">
            <span>Tax:</span>
            <span>+₹${Number(tax).toFixed(2)}</span>
          </div>
          ` : ''}
          
          ${totalSavings > 0 ? `
          <div class="savings-highlight">
            🎉 You Saved: ₹${Number(totalSavings).toFixed(2)}
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

  // Open print window
  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  printWindow.document.write(printHTML);
  printWindow.document.close();

  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

onMounted(async () => {
  try {
    await salesStore.fetchSales()
  } catch (error) {
    message.error('Failed to load sales data')
  }
  try {
    if (productStore.products.length === 0) {
      await productStore.fetchProducts()
    }
  } catch (error) {
    console.error('Failed to load products:', error)
  }
})
</script>

<style scoped>
.sales-summary {
  padding: 0;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
}
</style>

