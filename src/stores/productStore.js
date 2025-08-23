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
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching products:', error)
          this.products = []
        } else {
          this.products = data || []
        }
      } catch (err) {
        console.error('Network error:', err)
        this.products = []
      }
      this.loading = false
    },
    
    async addProduct(product) {
      try {
        // Generate product code if not provided
        const productCode = product.product_code || await this.generateProductCode(product.brand, product.category)
        
        const { data, error } = await supabase
          .from('products')
          .insert([{
            product_code: productCode,
            barcode: product.barcode || null,
            name: product.name,
            brand: product.brand || null,
            category: product.category || null,
            size: product.size || null,
            color: product.color || null,
            price: Number(product.price),
            cost_price: Number(product.cost_price) || null,
            stock_quantity: Number(product.stock_quantity) || 0,
            min_stock_level: Number(product.min_stock_level) || 5,
            description: product.description || null,
            image_url: product.image_url || null
          }])
          .select()
        
        if (error) {
          console.error('Error adding product:', error)
          throw error
        }
        
        if (data && data.length > 0) {
          this.products.unshift(data[0]) // Add to beginning of array
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
            product_code: product.product_code,
            barcode: product.barcode || null,
            name: product.name,
            brand: product.brand || null,
            category: product.category || null,
            size: product.size || null,
            color: product.color || null,
            price: Number(product.price),
            cost_price: Number(product.cost_price) || null,
            stock_quantity: Number(product.stock_quantity),
            min_stock_level: Number(product.min_stock_level) || 5,
            description: product.description || null,
            image_url: product.image_url || null,
            updated_at: new Date()
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
        // Check if product has sales history
        const { data: saleItems, error: checkError } = await supabase
          .from('sale_items')
          .select('id')
          .eq('product_id', id)
          .limit(1)
        
        if (checkError) {
          console.error('Error checking sales history:', checkError)
          throw checkError
        }
        
        if (saleItems && saleItems.length > 0) {
          // Product has sales history - cannot delete due to foreign key constraint
          alert('Cannot delete product: It has sales history. Consider setting stock to 0 instead.')
          return { success: false, error: 'Product has sales history' }
        } else {
          // Product has no sales history - can delete
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
          
          if (error) {
            console.error('Error deleting product:', error)
            throw error
          }
          
          console.log('Product permanently deleted')
        }
        
        // Remove from local state
        this.products = this.products.filter(p => p.id !== id)
        return { success: true }
      } catch (err) {
        console.error('Failed to delete product:', err)
        
        // Handle the foreign key constraint error specifically
        if (err.code === '23503') {
          alert('Cannot delete product: It has sales history.')
          return { success: false, error: 'Product has sales history' }
        }
        
        return { success: false, error: err.message }
      }
    },

    // Helper method to generate product code
    async generateProductCode(brand, category) {
      try {
        const brandPrefix = (brand || 'PROD').substring(0, 4).toUpperCase()
        const categoryPrefix = (category || 'GEN').substring(0, 3).toUpperCase()
        
        // Get the next sequence number for this brand
        const { data, error } = await supabase
          .from('products')
          .select('product_code')
          .like('product_code', `${brandPrefix}-%`)
          .order('product_code', { ascending: false })
          .limit(1)
        
        if (error) {
          console.error('Error generating product code:', error)
        }
        
        let nextNumber = 1
        if (data && data.length > 0) {
          const lastCode = data[0].product_code
          const lastNumber = parseInt(lastCode.split('-')[1]) || 0
          nextNumber = lastNumber + 1
        }
        
        return `${brandPrefix}-${String(nextNumber).padStart(3, '0')}`
      } catch (err) {
        console.error('Error generating product code:', err)
        return `PROD-${Date.now()}`
      }
    },

    // Get low stock products
    getLowStockProducts() {
      return this.products.filter(product => 
        product.stock_quantity <= product.min_stock_level
      )
    },

    // Search products
    searchProducts(query) {
      if (!query) return this.products
      
      const searchTerm = query.toLowerCase()
      return this.products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.product_code.toLowerCase().includes(searchTerm) ||
        product.brand?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm) ||
        product.barcode?.toLowerCase().includes(searchTerm)
      )
    }
  }
})