/**
 * Frontend Debug Helper
 * Provides debugging utilities for frontend development
 */

// Debug utilities that can be used in browser console
window.ScriblDebug = {
  // Check authentication state
  checkAuth() {
    const token = localStorage.getItem("scrible_token")
    if (token) {
      console.log("✅ Auth token found:", token.substring(0, 20) + "...")
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        console.log("Token payload:", payload)
      } catch (e) {
        console.log("⚠️  Token format not JWT")
      }
    } else {
      console.log("❌ No auth token found")
    }
  },

  // Test API endpoint
  async testApi(endpoint, options = {}) {
    const token = localStorage.getItem("scrible_token")
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    })

    const data = await response.json()
    console.log(`API ${endpoint}:`, { status: response.status, data })
    return { response, data }
  },

  // Clear all local storage
  clearStorage() {
    localStorage.clear()
    console.log("✅ Local storage cleared")
  },

  // Check theme state
  checkTheme() {
    const theme = localStorage.getItem("theme")
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    console.log("Theme state:", { stored: theme, system: systemTheme })
  },

  // Log current page state
  logPageState() {
    console.log("Page state:", {
      url: window.location.href,
      user: localStorage.getItem("scrible_token") ? "authenticated" : "anonymous",
      theme: localStorage.getItem("theme"),
      timestamp: new Date().toISOString(),
    })
  },
}

// Auto-run basic checks
console.log("🔧 Scrible Debug Tools Loaded")
console.log("Available commands:")
console.log("  ScriblDebug.checkAuth() - Check authentication")
console.log("  ScriblDebug.testApi(endpoint) - Test API endpoint")
console.log("  ScriblDebug.clearStorage() - Clear local storage")
console.log("  ScriblDebug.checkTheme() - Check theme state")
console.log("  ScriblDebug.logPageState() - Log current state")
