// src/stores/productStore.js
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase.js'

export const useProductStore = defineStore('product', {
  state: () => ({
    products: [],
    loading: false,
  }),
  actions: {
    async fetchProducts() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id', { ascending: true })
        
        if (error) {
          console.error('Error fetching products:', error)
          // Fallback to dummy data if database fails
          this.products = [
            { id: 1, name: "Nike Shoes", description: "Sports shoes", price: 2500, stockquantity: 10 },
            { id: 2, name: "Adidas T-shirt", description: "Casual wear", price: 1200, stockquantity: 20 },
            { id: 3, name: "Puma Cap", description: "Formal cap", price: 600, stockquantity: 5 },
          ]
        } else {
          this.products = data || []
        }
      } catch (err) {
        console.error('Network error:', err)
        // Fallback to dummy data
        this.products = [
          { id: 1, name: "Nike Shoes", description: "Sports shoes", price: 2500, stockquantity: 10 },
          { id: 2, name: "Adidas T-shirt", description: "Casual wear", price: 1200, stockquantity: 20 },
          { id: 3, name: "Puma Cap", description: "Formal cap", price: 600, stockquantity: 5 },
        ]
      }
      this.loading = false
    },
    
    async addProduct(product) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert([{
            name: product.name,
            description: product.description,
            category: product.category || null,
            price: product.price,
            stockquantity: product.stockquantity || 0,
            size: product.size || null,
            color: product.color || null
          }])
          .select()
        
        if (error) {
          console.error('Error adding product:', error)
          throw error
        }
        
        if (data && data.length > 0) {
          this.products.push(data[0])
          console.log('Product added successfully:', data[0])
        }
        
        return { success: true, data: data[0] }
      } catch (err) {
        console.error('Failed to add product:', err)
        return { success: false, error: err.message }
      }
    },
    
    async updateProduct(id, product) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update({
            name: product.name,
            description: product.description,
            category: product.category || null,
            price: product.price,
            stockquantity: product.stockquantity,
            size: product.size || null,
            color: product.color || null
          })
          .eq('id', id)
          .select()
        
        if (error) {
          console.error('Error updating product:', error)
          throw error
        }
        
        if (data && data.length > 0) {
          const idx = this.products.findIndex(p => p.id === id)
          if (idx > -1) {
            this.products[idx] = data[0]
          }
        }
        
        return { success: true, data: data[0] }
      } catch (err) {
        console.error('Failed to update product:', err)
        return { success: false, error: err.message }
      }
    },
    
    async deleteProduct(id) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
        
        if (error) {
          console.error('Error deleting product:', error)
          throw error
        }
        
        this.products = this.products.filter(p => p.id !== id)
        return { success: true }
      } catch (err) {
        console.error('Failed to delete product:', err)
        return { success: false, error: err.message }
      }
    }
  }
})
