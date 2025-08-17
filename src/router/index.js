// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import ProductList from '../pages/ProductList.vue'
import SalePage from '../pages/SalePage.vue'

const routes = [
  { path: '/', redirect: '/products' },
  { path: '/products', component: ProductList },
  { path: '/sales', component: SalePage }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
