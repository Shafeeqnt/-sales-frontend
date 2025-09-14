<template>
  <div>
    <!-- Bulk Import Modal -->
    <a-modal
      :open="visible"
      @update:open="$emit('update:visible', $event)"
      title="Bulk Import Products from Excel"
      width="800px"
      :footer="null"
    >
      <div class="bulk-import-container">
        <!-- Step 1: Download Template -->
        <a-card title="Step 1: Download Excel Template" style="margin-bottom: 16px;">
          <p>Download the template Excel file to ensure your data is formatted correctly.</p>
          <a-button type="primary" @click="downloadTemplate">
            Download Template
          </a-button>
        </a-card>

        <!-- Step 2: Upload File -->
        <a-card title="Step 2: Upload Your Excel File" style="margin-bottom: 16px;">
          <a-upload-dragger
            v-model:fileList="fileList"
            :before-upload="handleFileUpload"
            accept=".xlsx,.xls"
            :multiple="false"
            :show-upload-list="true"
          >
            <p class="ant-upload-drag-icon">
              📄
            </p>
            <p class="ant-upload-text">Click or drag Excel file to this area to upload</p>
            <p class="ant-upload-hint">
              Support for .xlsx and .xls files only. Maximum file size: 10MB
            </p>
          </a-upload-dragger>
        </a-card>

        <!-- Step 3: Preview Data -->
        <a-card 
          v-if="previewData.length > 0" 
          title="Step 3: Preview Import Data" 
          style="margin-bottom: 16px;"
        >
          <div style="margin-bottom: 16px;">
            <a-tag color="blue">Total Rows: {{ previewData.length }}</a-tag>
            <a-tag v-if="validRows > 0" color="green">Valid: {{ validRows }}</a-tag>
            <a-tag v-if="invalidRows > 0" color="red">Invalid: {{ invalidRows }}</a-tag>
          </div>

          <a-table
            :data-source="previewData.slice(0, 10)"
            :columns="previewColumns"
            :pagination="false"
            size="small"
            :scroll="{ x: 1200 }"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'status'">
                <a-tag :color="record._validation?.isValid ? 'green' : 'red'">
                  {{ record._validation?.isValid ? 'Valid' : 'Invalid' }}
                </a-tag>
                <div v-if="record._validation?.errors?.length > 0" style="margin-top: 4px;">
                  <a-tooltip>
                    <template #title>
                      <div v-for="error in record._validation.errors" :key="error">
                        • {{ error }}
                      </div>
                    </template>
                    <a-tag color="red" size="small">{{ record._validation.errors.length }} errors</a-tag>
                  </a-tooltip>
                </div>
              </template>
            </template>
          </a-table>

          <div v-if="previewData.length > 10" style="margin-top: 8px; text-align: center; color: #666;">
            Showing first 10 rows of {{ previewData.length }} total rows
          </div>
        </a-card>

        <!-- Step 4: Import Actions -->
        <div v-if="previewData.length > 0" style="text-align: center;">
          <a-space>
            <a-button @click="clearPreview">Clear</a-button>
            <a-button 
              type="primary" 
              @click="startImport"
              :loading="importing"
              :disabled="validRows === 0"
            >
              Import {{ validRows }} Products
            </a-button>
          </a-space>
        </div>

        <!-- Import Progress -->
        <a-card v-if="importing || importResults.length > 0" style="margin-top: 16px;">
          <div v-if="importing">
            <a-progress :percent="importProgress" />
            <p style="text-align: center; margin-top: 8px;">
              Importing products... {{ importedCount }}/{{ totalToImport }}
            </p>
          </div>

          <div v-if="importResults.length > 0 && !importing">
            <h4>Import Results:</h4>
            <a-tag color="green">Success: {{ importResults.filter(r => r.success).length }}</a-tag>
            <a-tag color="red">Failed: {{ importResults.filter(r => !r.success).length }}</a-tag>
            
            <div v-if="importResults.filter(r => !r.success).length > 0" style="margin-top: 16px;">
              <h5>Failed Imports:</h5>
              <a-list size="small" bordered>
                <a-list-item v-for="(result, index) in importResults.filter(r => !r.success)" :key="index">
                  <strong>Row {{ result.rowIndex + 1 }}:</strong> {{ result.product?.name || 'Unknown' }} - 
                  <span style="color: #f5222d;">{{ result.error }}</span>
                </a-list-item>
              </a-list>
            </div>
          </div>
        </a-card>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'
import { useProductStore } from '../stores/productStore'

const productStore = useProductStore()

// Props
defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['update:visible', 'import-complete'])

// Component state
const fileList = ref([])
const previewData = ref([])
const importing = ref(false)
const importResults = ref([])
const importProgress = ref(0)
const importedCount = ref(0)
const totalToImport = ref(0)

// Excel template columns
const templateColumns = [
  'name', 'brand', 'category', 'supplier', 'size', 'color', 
  'stock_price', 'mrp', 'discount_percentage', 'stock_quantity', 
  'min_stock_level', 'description'
]

const previewColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Brand', dataIndex: 'brand', key: 'brand', width: 100 },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 100 },
  { title: 'MRP', dataIndex: 'mrp', key: 'mrp', width: 80 },
  { title: 'Stock', dataIndex: 'stock_quantity', key: 'stock_quantity', width: 80 },
  { title: 'Status', key: 'status', width: 120 }
]

// Computed properties
const validRows = computed(() => 
  previewData.value.filter(row => row._validation?.isValid).length
)

const invalidRows = computed(() => 
  previewData.value.filter(row => !row._validation?.isValid).length
)

// Methods
function downloadTemplate() {
  const templateData = [
    {
      name: 'Nike Air Force 1',
      brand: 'Nike',
      category: 'Footwear',
      supplier: 'Nike India',
      size: '42',
      color: 'White',
      stock_price: 4500,
      mrp: 7995,
      discount_percentage: 10,
      stock_quantity: 50,
      min_stock_level: 5,
      description: 'Classic white sneakers'
    },
    {
      name: 'Adidas Ultraboost',
      brand: 'Adidas',
      category: 'Footwear',
      supplier: 'Adidas India',
      size: '43',
      color: 'Black',
      stock_price: 8000,
      mrp: 12995,
      discount_percentage: 15,
      stock_quantity: 30,
      min_stock_level: 5,
      description: 'Premium running shoes'
    }
  ]

  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products Template')
  
  XLSX.writeFile(wb, 'footprints_products_template.xlsx')
}

function handleFileUpload(file) {
  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
      
      if (jsonData.length < 2) {
        alert('Excel file must contain at least a header row and one data row')
        return
      }
      
      // Process the data
      processExcelData(jsonData)
      
    } catch (error) {
      console.error('Error reading Excel file:', error)
      alert('Error reading Excel file. Please check the file format.')
    }
  }
  
  reader.readAsArrayBuffer(file)
  return false // Prevent upload
}

function processExcelData(jsonData) {
  const headers = jsonData[0].map(h => h?.toString().toLowerCase().trim())
  const rows = jsonData.slice(1)
  
  const processedData = rows.map((row, index) => {
    const product = {}
    
    // Map Excel columns to product fields
    headers.forEach((header, colIndex) => {
      const value = row[colIndex]
      
      switch (header) {
        case 'name':
        case 'product name':
          product.name = value?.toString().trim()
          break
        case 'brand':
          product.brand = value?.toString().trim()
          break
        case 'category':
          product.category = value?.toString().trim()
          break
        case 'supplier':
          product.supplier = value?.toString().trim()
          break
        case 'size':
          product.size = value?.toString().trim()
          break
        case 'color':
          product.color = value?.toString().trim()
          break
        case 'stock_price':
        case 'stock price':
          product.stock_price = parseFloat(value) || 0
          break
        case 'mrp':
          product.mrp = parseFloat(value) || 0
          break
        case 'discount_percentage':
        case 'discount %':
        case 'discount':
          product.discount_percentage = parseFloat(value) || 0
          break
        case 'stock_quantity':
        case 'stock':
        case 'quantity':
          product.stock_quantity = parseInt(value) || 0
          break
        case 'min_stock_level':
        case 'min stock':
          product.min_stock_level = parseInt(value) || 5
          break
        case 'description':
          product.description = value?.toString().trim()
          break
      }
    })
    
    // Add validation
    product._validation = validateProduct(product, index)
    product._rowIndex = index
    
    return product
  })
  
  previewData.value = processedData.filter(p => 
    p.name || p.brand || p.mrp // Filter out completely empty rows
  )
}

function validateProduct(product, rowIndex) {
  const errors = []
  
  if (!product.name || product.name.length < 2) {
    errors.push('Product name is required (min 2 characters)')
  }
  
  if (!product.mrp || product.mrp <= 0) {
    errors.push('MRP must be greater than 0')
  }
  
  if (product.stock_quantity < 0) {
    errors.push('Stock quantity cannot be negative')
  }
  
  if (product.discount_percentage < 0 || product.discount_percentage > 100) {
    errors.push('Discount percentage must be between 0-100')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

function clearPreview() {
  previewData.value = []
  fileList.value = []
  importResults.value = []
  importProgress.value = 0
}

async function startImport() {
  const validProducts = previewData.value.filter(p => p._validation.isValid)
  
  if (validProducts.length === 0) {
    alert('No valid products to import')
    return
  }
  
  importing.value = true
  importResults.value = []
  importProgress.value = 0
  importedCount.value = 0
  totalToImport.value = validProducts.length
  
  for (let i = 0; i < validProducts.length; i++) {
    const product = validProducts[i]
    
    try {
      // Remove validation data before sending to store
      const { _validation, _rowIndex, ...cleanProduct } = product
      
      const result = await productStore.addProduct(cleanProduct)
      
      importResults.value.push({
        success: result.success,
        product: cleanProduct,
        rowIndex: _rowIndex,
        error: result.error
      })
      
      if (result.success) {
        importedCount.value++
      }
      
    } catch (error) {
      importResults.value.push({
        success: false,
        product,
        rowIndex: product._rowIndex,
        error: error.message
      })
    }
    
    // Update progress
    importProgress.value = Math.round(((i + 1) / validProducts.length) * 100)
    
    // Small delay to prevent overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  importing.value = false
  
  // Refresh products list and notify parent
  await productStore.fetchProducts()
  emit('import-complete')
  
  // Show completion message
  const successCount = importResults.value.filter(r => r.success).length
  const failureCount = importResults.value.filter(r => !r.success).length
  
  alert(`Import completed! ${successCount} products imported successfully. ${failureCount} failed.`)
}
</script>

<style scoped>
.bulk-import-container {
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.ant-upload-drag) {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

:deep(.ant-upload-drag:hover) {
  border-color: #1890ff;
}

:deep(.ant-upload-drag.ant-upload-drag-hover) {
  border-color: #40a9ff;
}
</style>