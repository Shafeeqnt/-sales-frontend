// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import Login from '../pages/Login.vue'
import ProductList from '../pages/ProductList.vue'
import SalePage from '../pages/SalePage.vue'

const routes = [
  { 
    path: '/login', 
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  { 
    path: '/', 
    redirect: '/products' 
  },
  { 
    path: '/products', 
    name: 'Products',
    component: ProductList,
    meta: { requiresAuth: true }
  },
  { 
    path: '/sales', 
    name: 'Sales',
    component: SalePage,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    // Validate session if not already authenticated
    if (!authStore.isAuthenticated) {
      const isValid = await authStore.validateSession()
      if (!isValid) {
        next('/login')
        return
      }
    }
  }
  
  // Check if route requires guest (not authenticated)
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/products')
    return
  }
  
  next()
})

export default router