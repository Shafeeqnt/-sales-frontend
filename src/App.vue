<template>
  <a-layout style="min-height: 100vh">
    <!-- Sidebar -->
    <a-layout-sider
      collapsible
      v-model:collapsed="collapsed"
      theme="dark"
      width="220"
    >
      <div class="logo">
        🛍️ RetailPOS
      </div>
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

        <div class="header-right">
          <a-badge :count="cart.items.length" offset="[10, 0]">
            <ShoppingCartOutlined
              style="font-size: 22px; cursor: pointer; color: white"
              @click="goTo('/sales')"
            />
          </a-badge>
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
import { ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useCartStore } from "./stores/cartStore"

// Ant Design Icons
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from "@ant-design/icons-vue"

const router = useRouter()
const route = useRoute()
const cart = useCartStore()

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
