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
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSalesStore } from '../stores/salesStore'
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

onMounted(async () => {
  try {
    await salesStore.fetchSales()
  } catch (error) {
    message.error('Failed to load sales data')
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

