<template>
  <div class="login-container">
    <div class="login-background">
      <div class="floating-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
        <div class="shape shape-4"></div>
      </div>
    </div>
    
    <div class="login-content">
      <div class="login-card">
        <div class="brand-section">
          <div class="brand-logo">
            <div class="logo-circle">
              <span class="logo-text">S</span>
            </div>
          </div>
          <h1 class="brand-name">FootPrints</h1>
          <p class="brand-tagline">Premium Footwear & Accessories</p>
          <div class="brand-divider"></div>
        </div>

        <div class="login-section">
          <h2 class="login-title">Welcome Back</h2>
          <p class="login-subtitle">Sign in to access your dashboard</p>

          <a-form
            :model="loginForm"
            :rules="rules"
            @finish="handleLogin"
            layout="vertical"
            class="login-form"
          >
            <a-form-item name="username">
              <a-input
                v-model:value="loginForm.username"
                size="large"
                placeholder="Username"
                class="custom-input"
              >
                <template #prefix>
                  <UserOutlined class="input-icon" />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item name="password">
              <a-input-password
                v-model:value="loginForm.password"
                size="large"
                placeholder="Password"
                class="custom-input"
              >
                <template #prefix>
                  <LockOutlined class="input-icon" />
                </template>
              </a-input-password>
            </a-form-item>

            <a-form-item>
              <a-button
                type="primary"
                html-type="submit"
                size="large"
                block
                :loading="authStore.loading"
                class="login-button"
              >
                <span v-if="!authStore.loading">Sign In</span>
                <span v-else>Signing In...</span>
              </a-button>
            </a-form-item>
          </a-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const router = useRouter()
const authStore = useAuthStore()

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: 'Please enter your username' }
  ],
  password: [
    { required: true, message: 'Please enter your password' }
  ]
}

async function handleLogin() {
  try {
    const result = await authStore.login(loginForm.username, loginForm.password)
    
    if (result.success) {
      message.success(`Welcome to FootPrints, ${result.user.fullName}!`)
      router.push('/products')
    } else {
      message.error(result.error || 'Invalid credentials')
    }
  } catch (error) {
    message.error('Login failed. Please try again.')
    console.error('Login error:', error)
  }
}

function fillCredentials(username, password) {
  loginForm.username = username
  loginForm.password = password
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  z-index: 1;
}

.floating-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

.shape-1 {
  width: 80px;
  height: 80px;
  top: 20%;
  left: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 120px;
  height: 120px;
  top: 60%;
  right: 10%;
  animation-delay: 2s;
}

.shape-3 {
  width: 60px;
  height: 60px;
  top: 80%;
  left: 20%;
  animation-delay: 4s;
}

.shape-4 {
  width: 100px;
  height: 100px;
  top: 10%;
  right: 30%;
  animation-delay: 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
}

.login-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 450px;
  padding: 20px;
}

.login-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.brand-section {
  text-align: center;
  margin-bottom: 40px;
}

.brand-logo {
  margin-bottom: 20px;
}

.logo-circle {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
}

.logo-text {
  color: white;
  font-size: 36px;
  font-weight: bold;
  font-family: 'Georgia', serif;
}

.brand-name {
  font-size: 32px;
  font-weight: bold;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: 2px;
}

.brand-tagline {
  color: #666;
  font-size: 14px;
  margin: 8px 0 0 0;
  font-style: italic;
}

.brand-divider {
  width: 60px;
  height: 3px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  margin: 20px auto;
  border-radius: 2px;
}

.login-section {
  margin-bottom: 30px;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  text-align: center;
}

.login-subtitle {
  color: #666;
  text-align: center;
  margin: 0 0 30px 0;
  font-size: 14px;
}

.custom-input {
  border-radius: 12px;
  border: 2px solid #f0f0f0;
  transition: all 0.3s ease;
}

.custom-input:hover,
.custom-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.input-icon {
  color: #999;
}

.login-button {
  height: 50px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.demo-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 30px;
}

.demo-header {
  text-align: center;
  margin-bottom: 20px;
}

.demo-title {
  color: #666;
  font-size: 14px;
  font-weight: 500;
  position: relative;
}

.demo-title::before,
.demo-title::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 50px;
  height: 1px;
  background: #e0e0e0;
}

.demo-title::before {
  left: -60px;
}

.demo-title::after {
  right: -60px;
}

.demo-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.demo-card {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.demo-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transition: left 0.5s;
}

.demo-card:hover::before {
  left: 100%;
}

.demo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.admin-card:hover {
  border-color: #ff4d4f;
  background: linear-gradient(135deg, #fff2f0, #fff);
}

.user-card:hover {
  border-color: #1890ff;
  background: linear-gradient(135deg, #f0f8ff, #fff);
}

.demo-icon {
  font-size: 24px;
  margin-bottom: 12px;
}

.demo-info h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.demo-info p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #666;
}

.demo-credentials {
  font-size: 11px;
  color: #999;
  font-family: monospace;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
}

@media (max-width: 600px) {
  .login-card {
    padding: 30px 20px;
    margin: 20px;
  }
  
  .demo-cards {
    grid-template-columns: 1fr;
  }
  
  .brand-name {
    font-size: 28px;
  }
  
  .demo-title::before,
  .demo-title::after {
    width: 30px;
  }
  
  .demo-title::before {
    left: -40px;
  }
  
  .demo-title::after {
    right: -40px;
  }
}
</style>