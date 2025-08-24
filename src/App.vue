<template>
  <!-- Login Page (no layout) -->
  <div v-if="!authStore.isAuthenticated">
    <router-view />
  </div>

  <!-- Main App Layout (with sidebar) -->
  <a-layout v-else style="min-height: 100vh">
    <!-- Sidebar -->
    <a-layout-sider
      collapsible
      v-model:collapsed="collapsed"
      theme="dark"
      width="220"
    >
      <div class="logo">🛍️ RetailPOS</div>
      <a-menu
        theme="dark"
        mode="inline"
        :selectedKeys="[selectedKey]"
        style="border-right: 0"
      >
        <a-menu-item key="products" @click="goTo('/products')">
          <AppstoreOutlined />
          <span>Products</span>
        </a-menu-item>
        <a-menu-item key="sales" @click="goTo('/sales')">
          <ShoppingCartOutlined />
          <span>Sales</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>

    <!-- Main Layout -->
    <a-layout>
      <!-- Header -->
      <a-layout-header class="header-bar">
        <div class="header-left">
          <MenuUnfoldOutlined v-if="collapsed" @click="collapsed = false" />
          <MenuFoldOutlined v-else @click="collapsed = true" />
        </div>

        <div class="header-center">
          <span class="welcome-text">
            Welcome, {{ authStore.userName }} 
            <a-tag :color="authStore.isAdmin() ? 'red' : 'blue'" style="margin-left: 8px">
              {{ authStore.userRole?.toUpperCase() }}
            </a-tag>
          </span>
        </div>

        <div class="header-right">
          <a-space size="large">
            <a-badge :count="cart.totalItems" offset="[10, 0]">
              <ShoppingCartOutlined
                style="font-size: 22px; cursor: pointer; color: white"
                @click="goTo('/sales')"
              />
            </a-badge>
            
            <a-dropdown>
              <a-button type="text" style="color: white">
                <UserOutlined style="margin-right: 8px" />
                {{ authStore.user?.username }}
                <DownOutlined />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="handleLogout">
                    <LogoutOutlined />
                    Logout
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </div>
      </a-layout-header>

      <!-- Page Content -->
      <a-layout-content class="content-area">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, watch, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useCartStore } from "./stores/cartStore"
import { useAuthStore } from "./stores/authStore"
import { message } from 'ant-design-vue'

// Ant Design Icons
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  UserOutlined,
  DownOutlined,
  LogoutOutlined
} from "@ant-design/icons-vue"

const router = useRouter()
const route = useRoute()
const cart = useCartStore()
const authStore = useAuthStore()

// sidebar collapsed state
const collapsed = ref(false)
const selectedKey = ref("products")

watch(
  () => route.path,
  (path) => {
    selectedKey.value = path.includes("sales") ? "sales" : "products"
  },
  { immediate: true }
)

function goTo(path) {
  router.push(path)
}

async function handleLogout() {
  await authStore.logout()
  message.success('Logged out successfully')
  router.push('/login')
}

// Initialize auth state on app load
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    await authStore.validateSession()
  }
})
</script>

<style scoped>
/* Sidebar Logo */
.logo {
  height: 64px;
  margin: 16px;
  font-size: 20px;
  font-weight: bold;
  color: white;
  text-align: center;
  line-height: 32px;
}

/* Header Bar */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #001529;
  color: white;
  padding: 0 24px;
  height: 64px;
}

.header-left {
  flex: 0 0 auto;
}

.header-center {
  flex: 1;
  text-align: center;
}

.header-right {
  flex: 0 0 auto;
}

.welcome-text {
  color: white;
  font-size: 16px;
}

/* Content Styling */
.content-area {
  margin: 20px;
  padding: 24px;
  background: white;
  min-height: 80vh;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>