import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] // SaleItems
  }),
  getters: {
    totalAmount: (state) => 
      state.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)
  },
  actions: {
    addToCart(product) {
      const existing = this.items.find(i => i.productId === product.id)
      if (existing) {
        existing.quantity++
      } else {
        this.items.push({
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: product.price
        })
      }
    },
    removeFromCart(productId) {
      this.items = this.items.filter(i => i.productId !== productId)
    },
    clearCart() {
      this.items = []
    }
  }
})
