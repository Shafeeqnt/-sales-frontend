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
            <a-button type="link" @click="showBarcode(record)" size="small">
              Barcode
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

    <!-- Barcode Display Modal -->
    <a-modal
      v-model:open="barcodeVisible"
      title="Product Barcode"
      width="600px"
      :footer="null"
      class="barcode-modal"
    >
      <div class="barcode-container" id="barcodeContent">
        <div class="barcode-header">
          <h3>{{ selectedProduct?.name }}</h3>
          <p>Product Code: {{ selectedProduct?.product_code }}</p>
          <div class="price-info">
            <span class="price-item">MRP: ₹{{ selectedProduct?.mrp?.toLocaleString() || 'N/A' }}</span>
            <span class="price-separator">|</span>
            <span class="price-item">Selling: ₹{{ selectedProduct?.price?.toLocaleString() }}</span>
          </div>
        </div>
        
        <div class="barcode-section">
          <canvas ref="barcodeCanvas" class="barcode-canvas"></canvas>
          <div class="barcode-text">
            {{ generatedBarcode }}
          </div>
        </div>

        <div class="barcode-actions">
          <a-button @click="printBarcode" type="primary" size="large">
            Print Barcode
          </a-button>
          <a-button @click="barcodeVisible = false" size="large">
            Close
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Success Modal for New Products -->
    <a-modal
      v-model:open="showSuccessModal"
      title="Product Created Successfully!"
      width="600px"
      :footer="null"
      class="success-modal"
    >
      <div class="success-content">
        <div class="success-icon">
          ✅
        </div>
        <p>Product "{{ newProductName }}" has been created successfully!</p>
        <div class="success-actions">
          <a-button @click="viewNewProductBarcode" type="primary" size="large">
            View Barcode
          </a-button>
          <a-button @click="showSuccessModal = false" size="large">
            Continue
          </a-button>
        </div>
      </div>
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
import { ref, onMounted, computed, watch, nextTick } from "vue"
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

// Barcode related refs
const barcodeVisible = ref(false)
const selectedProduct = ref(null)
const generatedBarcode = ref('')
const barcodeCanvas = ref(null)
const showSuccessModal = ref(false)
const newProductName = ref('')
const newProductId = ref(null)

const columns = [
  { title: "Product Info", key: "product_info", width: 200, fixed: 'left' },
  { title: "Brand, Category & Supplier", key: "brand_category", width: 180 },
  { title: "Size & Color", key: "size_color", width: 120 },
  { title: "Pricing", key: "pricing", width: 150 },
  { title: "Stock", key: "stock", width: 100 },
  { title: "Action", key: "action", width: 250, fixed: 'right' }
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

// Barcode Functions
function generateBarcodeNumber(product) {
  // Generate a unique 12-digit barcode based on product info
  const timestamp = Date.now().toString().slice(-6)
  const productId = product.id.toString().padStart(3, '0').slice(-3)
  const priceCode = Math.floor(product.price).toString().padStart(3, '0').slice(-3)
  return `${timestamp}${productId}${priceCode}`
}

function showBarcode(product) {
  console.log('Showing barcode for product:', product)
  selectedProduct.value = product
  generatedBarcode.value = product.barcode || generateBarcodeNumber(product)
  barcodeVisible.value = true
  
  // Use a longer timeout to ensure modal is rendered
  setTimeout(() => {
    drawBarcode()
  }, 100)
}

function drawBarcode() {
  const canvas = barcodeCanvas.value
  if (!canvas) {
    console.error('Canvas not found')
    return
  }
  
  console.log('Drawing compact barcode:', generatedBarcode.value)
  const ctx = canvas.getContext('2d')
  const barcode = generatedBarcode.value
  
  // Set canvas dimensions for 50mm x 25mm (approx 189px x 94px at 96 DPI)
  canvas.width = 189
  canvas.height = 94
  
  // Clear canvas with white background
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw barcode bars in lower portion
  ctx.fillStyle = 'black'
  const barWidth = 1.5
  const barHeight = 35
  const startX = 10
  const startY = 45 // Start bars lower to leave room for text
  
  // Simple barcode pattern based on digits
  for (let i = 0; i < barcode.length; i++) {
    const digit = parseInt(barcode[i])
    const pattern = digit % 2 === 0 ? [1, 0, 1] : [1, 1, 0, 1]
    
    for (let j = 0; j < pattern.length; j++) {
      if (pattern[j] === 1) {
        const x = startX + (i * 13) + (j * barWidth)
        ctx.fillRect(x, startY, barWidth, barHeight)
      }
    }
  }
  
  // Add barcode number below bars
  ctx.fillStyle = 'black'
  ctx.font = '8px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(barcode, canvas.width / 2, 88)
}

function printBarcode() {
  const canvas = barcodeCanvas.value
  if (!canvas) {
    console.error('Canvas not found for printing')
    return
  }
  
  // Convert canvas to base64 image
  const barcodeImageData = canvas.toDataURL('image/png')
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  
  const printHTML = `
    <html>
      <head>
        <title>Print Barcode Sticker - ${selectedProduct.value?.name}</title>
        <style>
          @page {
            size: 50mm 25mm;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            width: 50mm;
            height: 25mm;
            overflow: hidden;
          }
          
          .sticker-container {
            width: 100%;
            height: 100%;
            padding: 1mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            background: white;
            border: 0.5px solid #000;
          }
          
          .product-info {
            text-align: center;
            margin-bottom: 1mm;
          }
          
          .product-name {
            font-size: 7px;
            font-weight: bold;
            line-height: 8px;
            margin: 0 0 0.5mm 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #000;
          }
          
          .price-line {
            font-size: 10px;
            line-height: 7px;
            margin: 0;
            color: #000;
            font-weight: 600;
          }
          
          .barcode-section {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          
          .barcode-image {
            width: 47mm;
            height: auto;
            max-height: 18mm;
            display: block;
          }
          
          @media print {
            body { 
              margin: 0 !important;
              padding: 0 !important;
            }
            .sticker-container { 
              border: 0.5px solid #000 !important;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="sticker-container">
          <div class="product-info">
            <div class="product-name">${selectedProduct.value?.product_code || ''}</div>
            <div class="price-line">MRP:₹${selectedProduct.value?.mrp?.toLocaleString() || 'N/A'} | SP:₹${selectedProduct.value?.price?.toLocaleString() || 'N/A'}</div>
          </div>
          
          <div class="barcode-section">
            <img src="${barcodeImageData}" alt="Barcode" class="barcode-image" />
          </div>
        </div>
      </body>
    </html>
  `
  
  printWindow.document.write(printHTML)
  printWindow.document.close()
  
  // Wait for image to load, then print
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 1000)
}

function viewNewProductBarcode() {
  showSuccessModal.value = false
  
  // Add a small delay to ensure DOM is ready
  nextTick(() => {
    const product = store.products.find(p => p.id === newProductId.value)
    if (product) {
      console.log('Found product for barcode:', product)
      showBarcode(product)
    } else {
      console.error('Product not found:', newProductId.value)
      // Try to find by name as fallback
      const productByName = store.products.find(p => p.name === newProductName.value)
      if (productByName) {
        console.log('Found product by name:', productByName)
        showBarcode(productByName)
      }
    }
  })
}

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
    
    let savedProduct
    if (editing.value) {
      savedProduct = await store.updateProduct(form.value.id, form.value)
    } else {
      savedProduct = await store.addProduct(form.value)
      // Store the product info for success modal
      newProductName.value = form.value.name
      // Wait for the product to be added to the store
      await nextTick()
      const createdProduct = store.products.find(p => p.name === form.value.name && p.product_code === form.value.product_code)
      if (createdProduct) {
        newProductId.value = createdProduct.id
      }
      showSuccessModal.value = true
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

.barcode-container {
  text-align: center;
  padding: 20px;
}

.barcode-header h3 {
  margin-bottom: 5px;
  font-size: 18px;
  color: #1890ff;
}

.barcode-header p {
  margin-bottom: 10px;
  color: #666;
}

.price-info {
  margin-bottom: 20px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.price-item {
  display: inline-block;
  margin: 0 8px;
}

.price-separator {
  margin: 0 8px;
  color: #666;
}

.barcode-section {
  margin: 20px 0;
  padding: 20px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background-color: #fafafa;
}

.barcode-canvas {
  display: block;
  margin: 0 auto 10px;
  border: 1px solid #d9d9d9;
  background-color: white;
}

.barcode-text {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 2px;
  margin-top: 10px;
}

.barcode-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.success-content {
  text-align: center;
  padding: 20px;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.success-content p {
  font-size: 16px;
  margin-bottom: 20px;
  color: #52c41a;
  font-weight: 500;
}

.success-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* Print styles */
@media print {
  .barcode-actions {
    display: none !important;
  }
  
  .barcode-container {
    border: 1px solid #000;
    padding: 20px;
    margin: 20px;
  }
  
  .barcode-section {
    border: 2px solid #000;
    background-color: white !important;
  }
}
</style>