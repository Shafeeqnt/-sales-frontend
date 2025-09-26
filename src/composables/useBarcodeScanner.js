// composables/useBarcodeScanner.js
import { ref, onMounted, onUnmounted } from 'vue'
import { useCartStore } from '../stores/cartStore'
import { useProductStore } from '../stores/productStore'

export function useBarcodeScanner() {
  const cart = useCartStore()
  const productStore = useProductStore()
  
  const isListening = ref(false)
  const lastScannedCode = ref('')
  const scanBuffer = ref('')
  const scanTimeout = ref(null)
  
  // Configuration
  const SCAN_TIMEOUT_MS = 100 // Time to wait for complete barcode input
  const MIN_BARCODE_LENGTH = 8 // Minimum barcode length
  const MAX_BARCODE_LENGTH = 20 // Maximum barcode length
  
  // Audio feedback
  const playSuccessSound = () => {
    try {
      // Create a simple success beep sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } catch (error) {
      console.log('Audio feedback not available')
    }
  }
  
  const playErrorSound = () => {
    try {
      // Create a simple error beep sound - lower frequency
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 300
      oscillator.type = 'triangle'
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Audio feedback not available')
    }
  }

  // Find product by barcode
  const findProductByBarcode = (barcode) => {

    const cleanBarcode = barcode.trim().toUpperCase(); // Convert to uppercase for comparison

    return productStore.products.find(product => {
      // Check both barcode field and generated barcode
      return (product.barcode && product.barcode.toUpperCase() === cleanBarcode) || 
           (generateBarcodeNumber(product).toUpperCase() === cleanBarcode) ||
           (product.product_code && product.product_code.toUpperCase() === cleanBarcode);

    });
  }
  
  // Generate barcode number for product (same logic as in ProductManagement)
  const generateBarcodeNumber = (product) => {
    const timestamp = Date.now().toString().slice(-6)
    const productId = product.id.toString().padStart(3, '0').slice(-3)
    const priceCode = Math.floor(product.price).toString().padStart(3, '0').slice(-3)
    return `${timestamp}${productId}${priceCode}`
  }

  // Process scanned barcode
  const processScan = async (scannedCode) => {
    console.log('Processing scanned code:', scannedCode)
    
    // Validate barcode format
    if (!isValidBarcode(scannedCode)) {
      console.log('Invalid barcode format:', scannedCode)
      playErrorSound()
      return { success: false, message: 'Invalid barcode format' }
    }
    
    // Find product
    const product = findProductByBarcode(scannedCode)
    
    if (!product) {
      console.log('Product not found for barcode:', scannedCode)
      playErrorSound()
      return { success: false, message: 'Product not found' }
    }
    
    // Check stock availability
    if (product.stock_quantity <= 0) {
      console.log('Product out of stock:', product.name)
      playErrorSound()
      return { success: false, message: 'Product out of stock' }
    }
    
    // Add to cart
    try {
      await cart.addToCart(product)
      console.log('Product added to cart:', product.name)
      playSuccessSound()
      lastScannedCode.value = scannedCode
      return { 
        success: true, 
        product: product,
        message: `${product.name} added to cart` 
      }
    } catch (error) {
      console.error('Error adding product to cart:', error)
      playErrorSound()
      return { success: false, message: 'Failed to add product to cart' }
    }
  }

  // Validate barcode format
  const isValidBarcode = (code) => {
    // Remove any whitespace
    const cleanCode = code.trim()
    
    // Check length
    if (cleanCode.length < MIN_BARCODE_LENGTH || cleanCode.length > MAX_BARCODE_LENGTH) {
      return false
    }
    
    // Check if it contains only numbers and/or letters (basic validation)
    const validPattern = /^[A-Za-z0-9]+$/
    return validPattern.test(cleanCode)
  }

  // Handle keyboard input for barcode scanning
  const handleKeyDown = (event) => {
    if (!isListening.value) return
    
    const char = event.key
    
    // Clear timeout on each new character
    if (scanTimeout.value) {
      clearTimeout(scanTimeout.value)
    }
    
    // Handle special keys
    if (char === 'Enter') {
      // Process the completed barcode
      if (scanBuffer.value.length > 0) {
        processScan(scanBuffer.value)
        scanBuffer.value = ''
      }
      return
    }
    
    // Ignore modifier keys and other special keys
    if (char.length > 1 && char !== 'Backspace') {
      return
    }
    
    // Handle backspace
    if (char === 'Backspace') {
      scanBuffer.value = scanBuffer.value.slice(0, -1)
      return
    }
    
    // Add character to buffer
    scanBuffer.value += char
    
    // Set timeout to auto-process if no more input comes
    scanTimeout.value = setTimeout(() => {
      if (scanBuffer.value.length >= MIN_BARCODE_LENGTH) {
        processScan(scanBuffer.value)
      }
      scanBuffer.value = ''
    }, SCAN_TIMEOUT_MS)
  }

  // Start listening for barcode scans
  const startListening = () => {
    if (isListening.value) return
    
    console.log('Starting barcode scanner listener')
    isListening.value = true
    scanBuffer.value = ''
    document.addEventListener('keydown', handleKeyDown)
  }

  // Stop listening for barcode scans
  const stopListening = () => {
    if (!isListening.value) return
    
    console.log('Stopping barcode scanner listener')
    isListening.value = false
    scanBuffer.value = ''
    document.removeEventListener('keydown', handleKeyDown)
    
    if (scanTimeout.value) {
      clearTimeout(scanTimeout.value)
      scanTimeout.value = null
    }
  }

  // Auto-start/stop based on component lifecycle
  onMounted(() => {
    // Auto-start listening when component mounts
    setTimeout(startListening, 1000) // Small delay to ensure everything is ready
  })

  onUnmounted(() => {
    stopListening()
  })

  return {
    isListening,
    lastScannedCode,
    startListening,
    stopListening,
    processScan,
    findProductByBarcode
  }
}