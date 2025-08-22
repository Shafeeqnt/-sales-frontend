<template>
  <div>
    <div class="page-header">
      <h2>📦 Product Management</h2>
      <a-button type="primary" @click="showForm(null)">
        + Add Product
      </a-button>
    </div>

    <a-table
      :data-source="store.products"
      :columns="columns"
      row-key="id"
      bordered
      size="middle"
      :pagination="{ pageSize: 5 }"
    >
      <!-- Custom Cells -->
      <template #bodyCell="{ column, record }">
    
        <!-- Price -->
        <template v-if="column.key === 'price'">
          <span style="font-weight: bold; color: #1890ff;">
            ₹{{ record.price }}
          </span>
        </template>

        <!-- Stock -->
        <template v-if="column.key === 'stock'">
          <a-tag :color="record.stockquantity > 10 ? 'green' : 'red'">
            {{ record.stockquantity > 0 ? record.stockquantity + ' in stock' : 'Out of stock' }}
          </a-tag>
        </template>

        <!-- Category -->
        <template v-if="column.key === 'category'">
          <a-tag color="blue">{{ record.category || 'Uncategorized' }}</a-tag>
        </template>

        <!-- Action Buttons -->
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="showForm(record)">Edit</a-button>
            <a-popconfirm
              title="Are you sure to delete this product?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="store.deleteProduct(record.id)"
            >
              <a-button type="link" danger>Delete</a-button>
            </a-popconfirm>
            <a-button type="primary" @click="cart.addToCart(record)">
              Add to Sale
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- Add/Edit Modal -->
    <a-modal
      v-model:open="formVisible"
      :title="editing ? 'Edit Product' : 'Add Product'"
      @ok="handleSave"
      width="600px"
    >
      <a-form :model="form" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Name">
              <a-input v-model:value="form.name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Category">
              <a-select v-model:value="form.category">
                <a-select-option value="Sports">Sports</a-select-option>
                <a-select-option value="Casual">Casual</a-select-option>
                <a-select-option value="Formal">Formal</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Price">
              <a-input-number v-model:value="form.price" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Stock">
              <a-input-number v-model:value="form.stockQuantity" style="width: 100%" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Size">
              <a-input v-model:value="form.size" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Color">
              <a-input v-model:value="form.color" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useProductStore } from "../stores/productStore"
import { useCartStore } from "../stores/cartStore"

const store = useProductStore()
const cart = useCartStore()

const formVisible = ref(false)
const form = ref({})
const editing = ref(false)

const columns = [
  { title: "Name", dataIndex: "name", key: "name" },
  { title: "Category", key: "category" },
  { title: "Price", dataIndex: "price", key: "price" },
  { title: "Stock", key: "stock" },
  { title: "Action", key: "action", width: 250 }
]

function showForm(product) {
  editing.value = !!product
  form.value = product ? { ...product } : {}
  formVisible.value = true
}

async function handleSave() {
  if (editing.value) {
    await store.updateProduct(form.value.id, form.value)
  } else {
    await store.addProduct(form.value)
  }
  formVisible.value = false
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

.page-header h2 {
  margin: 0;
}
</style>