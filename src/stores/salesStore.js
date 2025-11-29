// src/stores/salesStore.js
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase.js'

export const useSalesStore = defineStore('sales', {
  state: () => ({
    sales: [],
    loading: false,
    filters: {
      startDate: null,
      endDate: null,
      paymentMethod: null,
    }
  }),

  getters: {
    // Summary statistics
    totalSales: (state) => state.sales.length,
    
    totalRevenue: (state) => {
      return state.sales.reduce((sum, sale) => sum + parseFloat(sale.final_amount || 0), 0)
    },
    
    totalDiscount: (state) => {
      return state.sales.reduce((sum, sale) => sum + parseFloat(sale.discount_amount || 0), 0)
    },
    
    totalTax: (state) => {
      return state.sales.reduce((sum, sale) => sum + parseFloat(sale.tax_amount || 0), 0)
    },

    filteredSales: (state) => {
      let filtered = [...state.sales]

      // Date filter
      if (state.filters.startDate) {
        const startDate = new Date(state.filters.startDate)
        startDate.setHours(0, 0, 0, 0)
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.sale_date)
          saleDate.setHours(0, 0, 0, 0)
          return saleDate >= startDate
        })
      }

      if (state.filters.endDate) {
        const endDate = new Date(state.filters.endDate)
        endDate.setHours(23, 59, 59, 999)
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.sale_date)
          return saleDate <= endDate
        })
      }

      // Payment method filter
      if (state.filters.paymentMethod) {
        filtered = filtered.filter(sale => 
          sale.payment_method === state.filters.paymentMethod
        )
      }

      return filtered
    }
  },

  actions: {
    async fetchSales() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .order('sale_date', { ascending: false })

        if (error) {
          console.error('Error fetching sales:', error)
          throw error
        }

        this.sales = data || []
      } catch (err) {
        console.error('Failed to fetch sales:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    setFilter(filterType, value) {
      this.filters[filterType] = value
    },

    clearFilters() {
      this.filters = {
        startDate: null,
        endDate: null,
        paymentMethod: null,
      }
    }
  }
})

