// src/stores/productStore.js
import { defineStore } from 'pinia'
// import axios from 'axios'   // disable for now

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    loading: false,
  }),
  actions: {
    async fetchProducts() {
      this.loading = true
      // --- dummy data instead of API ---
      this.products = [
        { id: 1, name: "Nike Shoes", description: "Sports shoes", price: 2500, stockQuantity: 10 },
        { id: 2, name: "Adidas T-shirt", description: "Casual wear", price: 1200, stockQuantity: 20 },
        { id: 3, name: "Puma Cap", description: "Formal cap", price: 600, stockQuantity: 5 },
      ]
      this.loading = false
    },
    async addProduct(product) {
      product.id = Date.now()
      this.products.push(product)
    },
    async updateProduct(id, product) {
      const idx = this.products.findIndex(p => p.id === id)
      if (idx > -1) this.products[idx] = { ...product }
    },
    async deleteProduct(id) {
      this.products = this.products.filter(p => p.id !== id)
    }
  }
})
