import { defineStore } from "pinia"
import { supabase } from "@/lib/supabase"

export const useCartStore = defineStore("cartStore", {
  state: () => ({
    items: [], // Cart items for current sale
    loading: false,
    customerInfo: {
      name: '',
      phone: '',
      email: ''
    },
    saleInfo: {
      discount_amount: 0,
      tax_amount: 0,
      payment_method: 'cash',
      notes: ''
    }
  }),

  actions: {
    // Add product to cart
    addToCart(product) {
      console.log('Adding product to cart:', product)
      const existing = this.items.find((item) => item.product_id === product.id)
      
      if (existing) {
        if (existing.quantity < product.stock_quantity) {
          existing.quantity += 1
          existing.total_price = existing.quantity * existing.unit_price
          console.log('Updated existing item quantity:', existing.quantity)
        } else {
          alert('Cannot add more items. Insufficient stock.')
          return
        }
      } else {
        if (product.stock_quantity <= 0) {
          alert('Product is out of stock.')
          return
        }
        
        const newItem = {
          id: Date.now(), // temporary ID for local cart
          product_id: product.id,
          product_code: product.product_code,
          product_name: product.name,
          quantity: 1,
          unit_price: Number(product.price),
          total_price: Number(product.price),
          available_stock: product.stock_quantity
        }
        this.items.push(newItem)
        console.log('Added new item to cart:', newItem)
      }
      
      console.log('Current cart items:', this.items)
      console.log('Total amount:', this.totalAmount)
    },

    // Update item quantity
    updateQuantity(itemId, newQuantity) {
      const item = this.items.find(i => i.id === itemId)
      if (item) {
        if (newQuantity <= 0) {
          this.removeFromCart(itemId)
        } else if (newQuantity <= item.available_stock) {
          item.quantity = newQuantity
          item.total_price = item.quantity * item.unit_price
        } else {
          alert(`Cannot set quantity to ${newQuantity}. Only ${item.available_stock} items available.`)
        }
      }
    },

    // Remove item from cart
    removeFromCart(itemId) {
      this.items = this.items.filter((item) => item.id !== itemId)
      console.log('Product removed from cart')
    },

    // Clear cart
    clearCart() {
      this.items = []
      this.customerInfo = { name: '', phone: '', email: '' }
      this.saleInfo = {
        discount_amount: 0,
        tax_amount: 0,
        payment_method: 'cash',
        notes: ''
      }
      console.log('Cart cleared')
    },

    // Set customer information
    setCustomerInfo(customerInfo) {
      this.customerInfo = { ...customerInfo }
    },

    // Set sale information
    setSaleInfo(saleInfo) {
      this.saleInfo = { ...saleInfo }
    },

    // Generate sale number
    async generateSaleNumber() {
      try {
        const { data, error } = await supabase.rpc('generate_sale_number')
        if (error) throw error
        return data
      } catch (err) {
        console.error('Error generating sale number:', err)
        // Fallback to timestamp-based number
        return `SALE-${Date.now()}`
      }
    },

    // Complete sale
    async completeSale() {
      if (this.items.length === 0) {
        throw new Error('Cart is empty')
      }

      try {
        console.log('Starting checkout process...')
        
        // Generate sale number
        const saleNumber = await this.generateSaleNumber()
        
        // Calculate totals
        const totalAmount = this.subtotal
        const discountAmount = Number(this.saleInfo.discount_amount) || 0
        const taxAmount = Number(this.saleInfo.tax_amount) || 0
        const finalAmount = totalAmount - discountAmount + taxAmount

        // Step 1: Create sale record
        const { data: sale, error: saleError } = await supabase
          .from("sales")
          .insert([
            {
              sale_number: saleNumber,
              customer_name: this.customerInfo.name || null,
              customer_phone: this.customerInfo.phone || null,
              customer_email: this.customerInfo.email || null,
              total_amount: totalAmount,
              discount_amount: discountAmount,
              tax_amount: taxAmount,
              final_amount: finalAmount,
              payment_method: this.saleInfo.payment_method,
              payment_status: 'completed',
              notes: this.saleInfo.notes || null
            },
          ])
          .select()
          .single();

        if (saleError) {
          console.error('Sale insert error:', saleError);
          throw saleError;
        }

        console.log('Sale created:', sale);

        // Step 2: Create sale items
        const saleItems = this.items.map((item) => ({
          sale_id: sale.id,
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        }));

        console.log('Sale items to insert:', saleItems);

        const { error: itemsError } = await supabase
          .from("sale_items")
          .insert(saleItems);
        
        if (itemsError) {
          console.error('Sale items insert error:', itemsError);
          throw itemsError;
        }

        console.log('Sale items inserted successfully');

        // Step 3: Stock will be automatically updated by the database trigger
        
        // Clear cart after successful sale
        this.clearCart();
        
        return {
          success: true,
          saleNumber: saleNumber,
          finalAmount: finalAmount
        };

      } catch (err) {
        console.error("❌ Checkout failed:", err);
        throw err;
      }
    }
  },

  getters: {
    // Total number of items
    totalItems: (state) =>
      state.items.reduce((sum, item) => sum + item.quantity, 0),

    // Subtotal (before discount and tax)
    subtotal: (state) =>
      state.items.reduce((sum, item) => sum + item.total_price, 0),

    // Total amount after discount and tax
    totalAmount: (state) => {
      const subtotal = state.items.reduce((sum, item) => sum + item.total_price, 0)
      const discount = Number(state.saleInfo.discount_amount) || 0
      const tax = Number(state.saleInfo.tax_amount) || 0
      return subtotal - discount + tax
    },

    // Check if cart is empty
    isEmpty: (state) => state.items.length === 0,

    // Get cart summary
    cartSummary: (state) => {
      const subtotal = state.items.reduce((sum, item) => sum + item.total_price, 0)
      const discount = Number(state.saleInfo.discount_amount) || 0
      const tax = Number(state.saleInfo.tax_amount) || 0
      const total = subtotal - discount + tax
      
      return {
        subtotal,
        discount,
        tax,
        total,
        itemCount: state.items.length,
        totalQuantity: state.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    }
  },
})