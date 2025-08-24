<template>
  <div>
    <div class="page-header">
      <h2>👟 Shalom - Product Management</h2>
      <div class="header-actions">
        <a-input-search
          v-model:value="searchQuery"
          placeholder="Search products..."
          style="width: 300px; margin-right: 16px"
          @search="handleSearch"
        />
        <a-button 
          v-if="authStore.canManageProducts()" 
          type="primary" 
          @click="showForm(null)"
        >
          + Add Product
        </a-button>
      </div>
    </div>

    <!-- Low Stock Alert -->
    <a-alert
      v-if="lowStockProducts.length > 0"
      :message="`${lowStockProducts.length} products are running low on stock`"
      type="warning"
      show-icon
      closable
      style="margin-bottom: 16px"
    />

    <a-table
      :data-source="filteredProducts"
      :columns="columns"
      row-key="id"
      bordered
      size="middle"
      :pagination="{ pageSize: 10, showSizeChanger: true }"
      :scroll="{ x: 1400 }"
    >
      <!-- Custom Cells -->
      <template #bodyCell="{ column, record }">
        <!-- Product Info -->
        <template v-if="column.key === 'product_info'">
          <div>
            <div style="font-weight: bold;">{{ record.name }}</div>
            <div style="font-size: 12px; color: #666;">
              Code: {{ record.product_code }}
            </div>
            <div v-if="record.barcode" style="font-size: 12px; color: #666;">
              Barcode: {{ record.barcode }}
            </div>
          </div>
        </template>

        <!-- Brand, Category & Supplier -->
        <template v-if="column.key === 'brand_category'">
          <div>
            <a-tag v-if="record.brand" color="blue">{{ record.brand }}</a-tag>
            <a-tag v-if="record.category" color="green">{{ record.category }}</a-tag>
            <div v-if="record.supplier" style="font-size: 11px; color: #666; margin-top: 2px;">
              Supplier: {{ record.supplier }}
            </div>
          </div>
        </template>

        <!-- Size & Color -->
        <template v-if="column.key === 'size_color'">
          <div>
            <a-tag v-if="record.size" color="orange">Size: {{ record.size }}</a-tag>
            <a-tag v-if="record.color" :color="getColorTag(record.color)">{{ record.color }}</a-tag>
          </div>
        </template>

        <!-- Pricing -->
        <template v-if="column.key === 'pricing'">
          <div>
            <div style="font-size: 11px; color: #666;">
              MRP: ₹{{ Number(record.mrp || 0).toLocaleString() }}
            </div>
            <div style="font-size: 11px; color: #666;">
              Stock: ₹{{ Number(record.stock_price || 0).toLocaleString() }}
            </div>
            <div v-if="record.discount_percentage > 0" style="font-size: 11px; color: #f5222d;">
              Discount: {{ record.discount_percentage }}%
            </div>
            <div style="font-weight: bold; color: #1890ff; font-size: 13px;">
              Selling: ₹{{ Number(record.price || 0).toLocaleString() }}
            </div>
          </div>
        </template>

        <!-- Stock -->
        <template v-if="column.key === 'stock'">
          <div>
            <a-tag :color="getStockColor(record)">
              {{ record.stock_quantity }} units
            </a-tag>
            <div style="font-size: 12px; color: #666;">
              Min: {{ record.min_stock_level }}
            </div>
          </div>
        </template>

        <!-- Action Buttons -->
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button 
              v-if="authStore.canManageProducts()" 
              type="link" 
              @click="showForm(record)" 
              size="small"
            >
              Edit
            </a-button>
            <a-popconfirm
              v-if="authStore.canManageProducts()"
              title="Are you sure to delete this product?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="store.deleteProduct(record.id)"
            >
              <a-button type="link" danger size="small">Delete</a-button>
            </a-popconfirm>
            <a-button 
              type="primary" 
              @click="cart.addToCart(record)" 
              size="small"
              :disabled="record.stock_quantity <= 0"
            >
              Add to Sale
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- Add/Edit Modal (Only for Admin) -->
    <a-modal
      v-if="authStore.canManageProducts()"
      v-model:open="formVisible"
      :title="editing ? 'Edit Product' : 'Add Product'"
      @ok="handleSave"
      width="800px"
      :ok-button-props="{ loading: saving }"
    >
      <a-form :model="form" layout="vertical" :rules="rules" ref="formRef">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Product Code" name="product_code">
              <a-input v-model:value="form.product_code" placeholder="Auto-generated if empty" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Barcode" name="barcode">
              <a-input v-model:value="form.barcode" placeholder="Optional" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="Product Name" name="name">
              <a-input v-model:value="form.name" placeholder="Enter product name" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="Brand" name="brand">
              <a-input v-model:value="form.brand" placeholder="Enter brand name" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Category" name="category">
              <a-select v-model:value="form.category" placeholder="Select category" allow-clear>
                <a-select-option value="Footwear">Footwear</a-select-option>
                <a-select-option value="Bags">Bags</a-select-option>
                <a-select-option value="Other">Other</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Supplier" name="supplier">
              <a-input v-model:value="form.supplier" placeholder="Enter supplier name" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Size" name="size">
              <a-input v-model:value="form.size" placeholder="Enter size (e.g., 42, L, XL)" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Color" name="color">
              <a-input v-model:value="form.color" placeholder="Enter color" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Pricing Section -->
        <a-divider>Pricing Information</a-divider>
        
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="MRP (₹)" name="mrp">
              <a-input-number 
                v-model:value="form.mrp" 
                style="width: 100%" 
                :min="0"
                :precision="2"
                placeholder="0.00"
                @change="calculateSellingPrice"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Stock Price (₹)" name="stock_price">
              <a-input-number 
                v-model:value="form.stock_price" 
                style="width: 100%" 
                :min="0"
                :precision="2"
                placeholder="0.00"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Discount (%)" name="discount_percentage">
              <a-input-number 
                v-model:value="form.discount_percentage" 
                style="width: 100%" 
                :min="0"
                :max="100"
                :precision="2"
                placeholder="0.00"
                @change="calculateSellingPrice"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="24">
            <a-form-item label="Selling Price (₹)" name="price">
              <a-input-number 
                v-model:value="calculatedSellingPrice" 
                style="width: 100%" 
                :precision="2"
                disabled
                placeholder="Auto-calculated"
              />
              <div style="font-size: 12px; color: #666; margin-top: 4px;">
                Selling Price = MRP - (MRP × Discount%) | 
                <span v-if="form.stock_price && calculatedSellingPrice" style="color: #52c41a;">
                  Profit: ₹{{ (calculatedSellingPrice - (form.stock_price || 0)).toFixed(2) }}
                </span>
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Stock Section -->
        <a-divider>Stock Information</a-divider>
        
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Stock Quantity" name="stock_quantity">
              <a-input-number 
                v-model:value="form.stock_quantity" 
                style="width: 100%" 
                :min="0"
                placeholder="0"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Minimum Stock Level" name="min_stock_level">
              <a-input-number 
                v-model:value="form.min_stock_level" 
                style="width: 100%" 
                :min="0"
                placeholder="5"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Description" name="description">
          <a-textarea v-model:value="form.description" rows="3" placeholder="Product description" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Permission Denied Message for Local Users -->
    <a-modal
      v-if="!authStore.canManageProducts()"
      v-model:open="permissionDeniedVisible"
      title="Access Denied"
      :footer="null"
      width="400px"
    >
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 48px; color: #ff4d4f; margin-bottom: 16px;">
          🚫
        </div>
        <h3>Permission Denied</h3>
        <p>You don't have permission to manage products. Only administrators can add, edit, or delete products.</p>
        <a-button @click="permissionDeniedVisible = false">OK</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from "vue"
import { useProductStore } from "../stores/productStore"
import { useCartStore } from "../stores/cartStore"
import { useAuthStore } from "../stores/authStore"

const store = useProductStore()
const cart = useCartStore()
const authStore = useAuthStore()

const formVisible = ref(false)
const permissionDeniedVisible = ref(false)
const form = ref({})
const editing = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const formRef = ref()

const columns = [
  { title: "Product Info", key: "product_info", width: 200, fixed: 'left' },
  { title: "Brand, Category & Supplier", key: "brand_category", width: 180 },
  { title: "Size & Color", key: "size_color", width: 120 },
  { title: "Pricing", key: "pricing", width: 150 },
  { title: "Stock", key: "stock", width: 100 },
  { title: "Action", key: "action", width: 200, fixed: 'right' }
]

const rules = {
  name: [{ required: true, message: 'Please enter product name' }],
  mrp: [{ required: true, message: 'Please enter MRP' }],
  stock_quantity: [{ required: true, message: 'Please enter stock quantity' }]
}

// Computed property for calculated selling price
const calculatedSellingPrice = computed(() => {
  const mrp = Number(form.value.mrp) || 0
  const discount = Number(form.value.discount_percentage) || 0
  return Number((mrp * (1 - discount / 100)).toFixed(2))
})

// Watch for changes in MRP or discount to update the form price
watch(calculatedSellingPrice, (newPrice) => {
  form.value.price = newPrice
})

const filteredProducts = computed(() => {
  if (!searchQuery.value) return store.products
  return store.searchProducts(searchQuery.value)
})

const lowStockProducts = computed(() => {
  return store.getLowStockProducts()
})

function calculateSellingPrice() {
  // This function is called when MRP or discount changes
  // The actual calculation is handled by the computed property
  const mrp = Number(form.value.mrp) || 0
  const discount = Number(form.value.discount_percentage) || 0
  form.value.price = Number((mrp * (1 - discount / 100)).toFixed(2))
}

function showForm(product) {
  if (!authStore.canManageProducts()) {
    permissionDeniedVisible.value = true
    return
  }
  
  editing.value = !!product
  form.value = product ? { 
    ...product,
    discount_percentage: product.discount_percentage || 0,
    stock_price: product.stock_price || 0,
    supplier: product.supplier || ''
  } : {
    stock_quantity: 0,
    min_stock_level: 5,
    discount_percentage: 0,
    mrp: 0,
    price: 0,
    stock_price: 0,
    supplier: ''
  }
  formVisible.value = true
}

async function handleSave() {
  try {
    await formRef.value.validate()
    saving.value = true
    
    // Ensure the selling price is calculated before saving
    calculateSellingPrice()
    
    if (editing.value) {
      await store.updateProduct(form.value.id, form.value)
    } else {
      await store.addProduct(form.value)
    }
    
    formVisible.value = false
    form.value = {}
  } catch (error) {
    console.error('Validation failed:', error)
  } finally {
    saving.value = false
  }
}

function handleSearch(value) {
  searchQuery.value = value
}

function getStockColor(record) {
  if (record.stock_quantity <= 0) return 'red'
  if (record.stock_quantity <= record.min_stock_level) return 'orange'
  return 'green'
}

function getColorTag(color) {
  const colorMap = {
    'black': 'default',
    'white': 'default',
    'red': 'red',
    'blue': 'blue',
    'green': 'green',
    'yellow': 'gold',
    'orange': 'orange',
    'purple': 'purple'
  }
  return colorMap[color?.toLowerCase()] || 'default'
}

onMounted(() => {
  store.fetchProducts()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
}

.page-header h2 {
  margin: 0;
}
</style>