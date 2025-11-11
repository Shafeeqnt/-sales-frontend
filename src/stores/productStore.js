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
        let allProducts = []
        let hasMore = true
        let page = 0
        const pageSize = 1000
        
        console.log('Starting to fetch all products...')
        
        while (hasMore) {
          const from = page * pageSize
          const to = from + pageSize - 1
          
          console.log(`Fetching page ${page + 1} (${from}-${to})...`)
          
          const { data, error, count } = await supabase
            .from('products')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to)
          
          if (error) {
            console.error('Error fetching products:', error)
            break
          }
          
          if (data && data.length > 0) {
            allProducts = [...allProducts, ...data]
            console.log(`Fetched ${data.length} products. Total so far: ${allProducts.length}`)
            page++
            
            // If we got less than pageSize, we've reached the end
            if (data.length < pageSize) {
              hasMore = false
              console.log('Reached end of products')
            }
          } else {
            hasMore = false
            console.log('No more products to fetch')
          }
          
          // Safety check: if we have the exact count, stop when we reach it
          if (count && allProducts.length >= count) {
            hasMore = false
            console.log(`Fetched all ${count} products`)
          }
        }
        
        this.products = allProducts
        console.log(`✅ Successfully fetched ALL products: ${this.products.length}`)
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
            supplier: product.supplier || null,
            size: product.size || null,
            color: product.color || null,
            stock_price: Number(product.stock_price) || null,
            mrp: Number(product.mrp),
            discount_percentage: Number(product.discount_percentage) || 0,
            price: Number(product.price), // This will be auto-calculated by trigger
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
            supplier: product.supplier || null,
            size: product.size || null,
            color: product.color || null,
            stock_price: Number(product.stock_price) || null,
            mrp: Number(product.mrp),
            discount_percentage: Number(product.discount_percentage) || 0,
            price: Number(product.price), // This will be auto-calculated by trigger
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

    // Search products with improved null handling
    searchProducts(query) {
      if (!query || query.trim() === '') return this.products
      
      const searchTerm = query.toLowerCase().trim()
      console.log('Searching for:', searchTerm)
      console.log('Total products:', this.products.length)
      
      const results = this.products.filter(product => {
        // Ensure all fields are strings and handle null/undefined values
        const name = (product.name || '').toLowerCase()
        const productCode = (product.product_code || '').toLowerCase()
        const brand = (product.brand || '').toLowerCase()
        const category = (product.category || '').toLowerCase()
        const supplier = (product.supplier || '').toLowerCase()
        const barcode = (product.barcode || '').toLowerCase()
        const size = (product.size || '').toLowerCase()
        const color = (product.color || '').toLowerCase()
        
        const matches = name.includes(searchTerm) ||
               productCode.includes(searchTerm) ||
               brand.includes(searchTerm) ||
               category.includes(searchTerm) ||
               supplier.includes(searchTerm) ||
               barcode.includes(searchTerm) ||
               size.includes(searchTerm) ||
               color.includes(searchTerm)
        
        return matches
      })
      
      console.log('Search results:', results.length)
      return results
    },

    // Calculate selling price helper
    calculateSellingPrice(mrp, discountPercentage) {
      const discount = Number(discountPercentage) || 0
      const price = Number(mrp) || 0
      return Number((price * (1 - discount / 100)).toFixed(2))
    }
  }
})