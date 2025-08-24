import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    sessionToken: null,
    isAuthenticated: false,
    loading: false
  }),

  actions: {
    async login(username, password) {
      this.loading = true
      try {
        // Call the authenticate_user function
        const { data, error } = await supabase.rpc('authenticate_user', {
          p_username: username,
          p_password: password
        })

        if (error) {
          console.error('Login error:', error)
          throw new Error('Login failed')
        }

        if (data && data.length > 0 && data[0].success) {
          const userData = data[0]
          
          // Create session
          const { data: sessionData, error: sessionError } = await supabase.rpc('create_user_session', {
            p_user_id: userData.user_id
          })

          if (sessionError) {
            console.error('Session creation error:', sessionError)
            throw new Error('Session creation failed')
          }

          // Store user data and session
          this.user = {
            id: userData.user_id,
            username: userData.username,
            role: userData.role,
            fullName: userData.full_name
          }
          this.sessionToken = sessionData
          this.isAuthenticated = true

          // Store in localStorage for persistence
          localStorage.setItem('user', JSON.stringify(this.user))
          localStorage.setItem('sessionToken', this.sessionToken)

          return { success: true, user: this.user }
        } else {
          throw new Error('Invalid username or password')
        }
      } catch (error) {
        console.error('Login failed:', error)
        return { success: false, error: error.message }
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.sessionToken) {
          // Call logout function to delete session
          await supabase.rpc('logout_user', {
            p_session_token: this.sessionToken
          })
        }
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        // Clear local state
        this.user = null
        this.sessionToken = null
        this.isAuthenticated = false

        // Clear localStorage
        localStorage.removeItem('user')
        localStorage.removeItem('sessionToken')
      }
    },

    async validateSession() {
      const storedUser = localStorage.getItem('user')
      const storedToken = localStorage.getItem('sessionToken')

      if (!storedUser || !storedToken) {
        return false
      }

      try {
        // Validate session with database
        const { data, error } = await supabase.rpc('validate_session', {
          p_session_token: storedToken
        })

        if (error) {
          console.error('Session validation error:', error)
          this.logout()
          return false
        }

        if (data && data.length > 0 && data[0].valid) {
          // Session is valid, restore user state
          this.user = JSON.parse(storedUser)
          this.sessionToken = storedToken
          this.isAuthenticated = true
          return true
        } else {
          // Session is invalid, logout
          this.logout()
          return false
        }
      } catch (error) {
        console.error('Session validation failed:', error)
        this.logout()
        return false
      }
    },

    // Check if user has admin role
    isAdmin() {
      return this.user && this.user.role === 'admin'
    },

    // Check if user has local role
    isLocal() {
      return this.user && this.user.role === 'local'
    },

    // Check if user can perform CRUD operations on products
    canManageProducts() {
      return this.isAdmin()
    },

    // Check if user can view products and make sales
    canMakeSales() {
      return this.isAuthenticated // Both admin and local can make sales
    }
  },

  getters: {
    userRole: (state) => state.user?.role || null,
    userName: (state) => state.user?.fullName || state.user?.username || null,
    userPermissions: (state) => {
      if (!state.user) return {}
      
      return {
        canViewProducts: true,
        canAddProducts: state.user.role === 'admin',
        canEditProducts: state.user.role === 'admin',
        canDeleteProducts: state.user.role === 'admin',
        canMakeSales: true,
        canViewSales: true
      }
    }
  }
})