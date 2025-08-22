import { defineStore } from "pinia"
import { supabase } from "@/lib/supabase"

export const useCartStore = defineStore("cartStore", {
  state: () => ({
    items: [], // [{ id, name, price, quantity }]
    loading: false,
  }),

  actions: {
    async loadCart(userId) {
      this.loading = true
      const { data, error } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", userId)

      if (error) {
        console.error("❌ Error loading cart:", error.message)
      } else {
        this.items = data
      }
      this.loading = false
    },

    async addItem(product, userId) {
      const existing = this.items.find((p) => p.product_id === product.id)

      if (existing) {
        await this.updateQuantity(existing.id, existing.quantity + 1)
      } else {
        const { data, error } = await supabase
          .from("cart")
          .insert([
            {
              user_id: userId,
              product_id: product.id,
              name: product.name,
              price: product.price,
              quantity: 1,
            },
          ])
          .select()

        if (error) {
          console.error("❌ Error adding to cart:", error.message)
        } else {
          this.items.push(data[0])
        }
      }
    },

    async updateQuantity(cartId, quantity) {
      const { data, error } = await supabase
        .from("cart")
        .update({ quantity })
        .eq("id", cartId)
        .select()

      if (error) {
        console.error("❌ Error updating quantity:", error.message)
      } else {
        const idx = this.items.findIndex((p) => p.id === cartId)
        if (idx !== -1) this.items[idx] = data[0]
      }
    },

    async removeItem(cartId) {
      const { error } = await supabase.from("cart").delete().eq("id", cartId)

      if (error) {
        console.error("❌ Error removing cart item:", error.message)
      } else {
        this.items = this.items.filter((p) => p.id !== cartId)
      }
    },

    async clearCartWithUserId(userId) {
      const { error } = await supabase.from("cart").delete().eq("user_id", userId)
      if (error) {
        console.error("❌ Error clearing cart:", error.message)
      } else {
        this.items = []
      }
    },

    // Simplified method for adding to cart without requiring userId (for sales context)
    addToCart(product) {
      console.log('Adding product to cart:', product)
      const existing = this.items.find((item) => item.productId === product.id)
      
      if (existing) {
        existing.quantity += 1
        console.log('Updated existing item quantity:', existing.quantity)
      } else {
        const newItem = {
          id: Date.now(), // temporary ID for local cart
          productId: product.id,
          product: {
            name: product.name
          },
          unitPrice: Number(product.price) || 0,
          quantity: 1,
          stockquantity: product.stockquantity
        }
        this.items.push(newItem)
        console.log('Added new item to cart:', newItem)
      }
      
      console.log('Current cart items:', this.items)
      console.log('Total amount:', this.totalAmount)
    },

    // Method to remove item from cart (for SalePage)
    removeFromCart(productId) {
      this.items = this.items.filter((item) => item.productId !== productId)
      console.log('Product removed from cart')
    },

    // Clear cart method (for SalePage)
    clearCart() {
      this.items = []
      console.log('Cart cleared')
    },
  },

  getters: {
    totalItems: (state) =>
      state.items.reduce((sum, item) => sum + item.quantity, 0),

    totalPrice: (state) =>
      state.items.reduce((sum, item) => sum + (Number(item.price) || Number(item.unitPrice) || 0) * item.quantity, 0),

    // Add totalAmount getter for SalePage compatibility
    totalAmount: (state) =>
      state.items.reduce((sum, item) => sum + (Number(item.price) || Number(item.unitPrice) || 0) * item.quantity, 0),
  },
})