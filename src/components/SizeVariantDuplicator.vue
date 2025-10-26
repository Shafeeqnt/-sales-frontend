<template>
  <a-modal
    :open="visible"
    @update:open="$emit('update:visible', $event)"
    title="Create Size Variants"
    width="900px"
    :footer="null"
  >
    <div class="size-variant-container">
      <!-- Product Info -->
      <a-card title="Base Product" size="small" style="margin-bottom: 16px;">
        <div>
          <p><strong>{{ product?.name }}</strong></p>
          <p style="font-size: 12px; color: #666;">
            Brand: {{ product?.brand || 'N/A' }} | Category: {{ product?.category || 'N/A' }}
          </p>
          <p style="font-size: 12px; color: #666;">
            Current Size: {{ product?.size || 'Not set' }} | Color: {{ product?.color || 'N/A' }}
          </p>
          <p style="margin-top: 8px; color: #1890ff; font-weight: 500;">
            MRP: ₹{{ product?.mrp?.toLocaleString() }} | Selling: ₹{{ product?.price?.toLocaleString() }}
          </p>
        </div>
      </a-card>

      <!-- Common Fields for All Variants -->
      <a-card title="Common Details for All Variants" size="small" style="margin-bottom: 16px;">
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="Color (Optional - applies to all)">
                <a-input 
                  v-model:value="commonFields.color" 
                  placeholder="Leave empty to keep original or enter new color"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Stock Quantity (per variant)">
                <a-input-number 
                  v-model:value="commonFields.stock_quantity" 
                  :min="0"
                  style="width: 100%"
                  placeholder="Stock for each size"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="MRP (₹)">
                <a-input-number 
                  v-model:value="commonFields.mrp" 
                  :min="0"
                  style="width: 100%"
                  placeholder="Keep original or change"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="Stock Price (₹)">
                <a-input-number 
                  v-model:value="commonFields.stock_price" 
                  :min="0"
                  style="width: 100%"
                  placeholder="Cost price"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="Discount (%)">
                <a-input-number 
                  v-model:value="commonFields.discount_percentage" 
                  :min="0"
                  :max="100"
                  style="width: 100%"
                  placeholder="Discount %"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="Min Stock Level">
                <a-input-number 
                  v-model:value="commonFields.min_stock_level" 
                  :min="0"
                  style="width: 100%"
                  placeholder="Minimum stock alert"
                />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="Supplier">
                <a-input 
                  v-model:value="commonFields.supplier" 
                  placeholder="Supplier name"
                />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="Description">
            <a-textarea 
              v-model:value="commonFields.description" 
              rows="2"
              placeholder="Description for all variants"
            />
          </a-form-item>
        </a-form>
      </a-card>

      <!-- Quick Size Selection -->
      <a-card title="Quick Add Sizes" size="small" style="margin-bottom: 16px;">
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">Footwear Sizes:</div>
          <a-space wrap>
            <a-button 
              v-for="size in commonSizes" 
              :key="size"
              size="small"
              @click="quickAddSize(size)"
              :disabled="duplicating"
              :type="sizes.includes(size) ? 'primary' : 'default'"
            >
              {{ size }}
            </a-button>
          </a-space>
        </div>

      </a-card>

      <!-- Custom Sizes Input -->
      <a-card size="small" style="margin-bottom: 16px;">
        <template #title>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Or Enter Custom Sizes</span>
            <a-button 
              type="primary" 
              size="small" 
              @click="addSizeField"
              :disabled="duplicating"
            >
              + Add Size
            </a-button>
          </div>
        </template>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div 
            v-for="(size, index) in sizes" 
            :key="index"
            style="display: flex; gap: 8px; align-items: center;"
          >
            <a-input
              v-model:value="sizes[index]"
              placeholder="Enter size (e.g., 42, L, XL)"
              :disabled="duplicating"
              style="flex: 1;"
            />
            <a-button 
              v-if="sizes.length > 1"
              danger
              size="small"
              @click="removeSizeField(index)"
              :disabled="duplicating"
            >
              Remove
            </a-button>
          </div>
        </div>
      </a-card>

      <!-- Preview -->
      <a-card v-if="validSizesCount > 0" title="Preview Variants" size="small" style="margin-bottom: 16px;">
        <a-table
          :data-source="previewVariants"
          :columns="previewColumns"
          :pagination="false"
          size="small"
          :scroll="{ x: 800 }"
        >
        </a-table>
      </a-card>

      <!-- Info Alert -->
      <a-alert
        type="info"
        show-icon
        style="margin-bottom: 16px;"
      >
        <template #message>
          <strong>Note:</strong> This will create {{ validSizesCount }} new product{{ validSizesCount !== 1 ? 's' : '' }} 
          with the same details as the base product, but with different sizes. Each will have a unique barcode.
        </template>
      </a-alert>

      <!-- Progress -->
      <a-card v-if="duplicating" size="small" style="margin-bottom: 16px;">
        <a-progress :percent="progressPercent" />
        <p style="text-align: center; margin-top: 8px;">
          Creating variants... {{ duplicatedCount }} / {{ validSizesCount }}
        </p>
      </a-card>

      <!-- Actions -->
      <div style="text-align: right;">
        <a-space>
          <a-button @click="handleClose" :disabled="duplicating">
            Cancel
          </a-button>
          <a-button 
            type="primary" 
            @click="handleDuplicate"
            :loading="duplicating"
            :disabled="validSizesCount === 0"
          >
            Create {{ validSizesCount }} Variant{{ validSizesCount !== 1 ? 's' : '' }}
          </a-button>
        </a-space>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'duplicate-complete'])

// State
const sizes = ref([''])
const duplicating = ref(false)
const duplicatedCount = ref(0)
const commonFields = ref({
  color: null,
  stock_quantity: null,
  mrp: null,
  stock_price: null,
  discount_percentage: null,
  min_stock_level: null,
  supplier: null,
  description: null
})

// Common sizes
const commonSizes = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
const clothingSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

// Preview columns
const previewColumns = [
  { title: 'Size', dataIndex: 'size', key: 'size', width: 80 },
  { title: 'Color', dataIndex: 'color', key: 'color', width: 100 },
  { title: 'MRP', dataIndex: 'mrp', key: 'mrp', width: 100 },
  { title: 'Stock Price', dataIndex: 'stock_price', key: 'stock_price', width: 100 },
  { title: 'Discount %', dataIndex: 'discount_percentage', key: 'discount_percentage', width: 100 },
  { title: 'Stock Qty', dataIndex: 'stock_quantity', key: 'stock_quantity', width: 100 }
]

// Watch for product changes
watch(() => props.product, (newProduct) => {
  if (newProduct) {
    // Pre-fill common fields with product values
    commonFields.value = {
      color: newProduct.color || null,
      stock_quantity: newProduct.stock_quantity || 0,
      mrp: newProduct.mrp || null,
      stock_price: newProduct.stock_price || null,
      discount_percentage: newProduct.discount_percentage || 0,
      min_stock_level: newProduct.min_stock_level || 5,
      supplier: newProduct.supplier || null,
      description: newProduct.description || null
    }
  }
}, { immediate: true })

// Computed
const validSizesCount = computed(() => 
  sizes.value.filter(s => s.trim() !== '').length
)

const progressPercent = computed(() => 
  validSizesCount.value > 0 
    ? Math.round((duplicatedCount.value / validSizesCount.value) * 100)
    : 0
)

const previewVariants = computed(() => {
  return sizes.value
    .filter(s => s.trim() !== '')
    .map(size => ({
      size: size,
      color: commonFields.value.color || props.product?.color || '-',
      mrp: commonFields.value.mrp || props.product?.mrp || 0,
      stock_price: commonFields.value.stock_price || props.product?.stock_price || 0,
      discount_percentage: commonFields.value.discount_percentage !== null 
        ? commonFields.value.discount_percentage 
        : props.product?.discount_percentage || 0,
      stock_quantity: commonFields.value.stock_quantity !== null 
        ? commonFields.value.stock_quantity 
        : props.product?.stock_quantity || 0
    }))
})

// Methods
function addSizeField() {
  sizes.value.push('')
}

function removeSizeField(index) {
  if (sizes.value.length > 1) {
    sizes.value.splice(index, 1)
  }
}

function quickAddSize(size) {
  // Check if size already exists
  if (sizes.value.includes(size)) {
    // Remove it
    const index = sizes.value.indexOf(size)
    sizes.value.splice(index, 1)
    if (sizes.value.length === 0) {
      sizes.value = ['']
    }
    return
  }
  
  const lastIndex = sizes.value.length - 1
  if (sizes.value[lastIndex] === '') {
    sizes.value[lastIndex] = size
  } else {
    sizes.value.push(size)
  }
}

function handleClose() {
  emit('update:visible', false)
  // Reset after close
  setTimeout(() => {
    sizes.value = ['']
    duplicatedCount.value = 0
  }, 300)
}

async function handleDuplicate() {
  const validSizes = sizes.value.filter(s => s.trim() !== '')
  
  if (validSizes.length === 0) {
    alert('Please add at least one size')
    return
  }

  console.log('Starting duplication for', validSizes.length, 'sizes')
  console.log('Base product:', props.product)

  duplicating.value = true
  duplicatedCount.value = 0

  const duplicatedProducts = []

  for (let i = 0; i < validSizes.length; i++) {
    const size = validSizes[i]
    
    // Create new product with different size and updated fields
    const newProduct = {
      name: props.product.name,
      brand: props.product.brand,
      category: props.product.category,
      size: size,
      // Apply common fields (use new value if set, otherwise keep original)
      color: commonFields.value.color !== null ? commonFields.value.color : props.product.color,
      stock_quantity: commonFields.value.stock_quantity !== null ? commonFields.value.stock_quantity : props.product.stock_quantity,
      mrp: commonFields.value.mrp !== null ? commonFields.value.mrp : props.product.mrp,
      stock_price: commonFields.value.stock_price !== null ? commonFields.value.stock_price : props.product.stock_price,
      discount_percentage: commonFields.value.discount_percentage !== null ? commonFields.value.discount_percentage : props.product.discount_percentage,
      min_stock_level: commonFields.value.min_stock_level !== null ? commonFields.value.min_stock_level : props.product.min_stock_level,
      supplier: commonFields.value.supplier !== null ? commonFields.value.supplier : props.product.supplier,
      description: commonFields.value.description !== null ? commonFields.value.description : props.product.description,
      // Generate new barcode - add small delay to ensure uniqueness
      barcode: `${Date.now().toString().slice(-6)}${(Math.floor(Math.random() * 999999) + i).toString().padStart(6, '0')}`
    }

    // Calculate selling price
    const mrp = Number(newProduct.mrp) || 0
    const discount = Number(newProduct.discount_percentage) || 0
    newProduct.price = Number((mrp * (1 - discount / 100)).toFixed(2))
    
    // Don't include product_code - let the store generate it
    // Don't include id, created_at, updated_at

    console.log('Created variant product:', newProduct)
    duplicatedProducts.push(newProduct)
    duplicatedCount.value = i + 1
    
    // Small delay between duplicates
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  duplicating.value = false
  
  console.log('Emitting', duplicatedProducts.length, 'products')
  // Emit the duplicated products
  emit('duplicate-complete', duplicatedProducts)
  
  // Show success and close
  setTimeout(() => {
    alert(`Successfully prepared ${validSizes.length} size variants!`)
    emit('update:visible', false)
    // Reset
    sizes.value = ['']
    duplicatedCount.value = 0
  }, 500)
}
</script>

<style scoped>
.size-variant-container {
  max-height: 70vh;
  overflow-y: auto;
}
</style>