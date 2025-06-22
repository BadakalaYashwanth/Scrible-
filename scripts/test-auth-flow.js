/**
 * Test script for authentication flow
 * Run this to verify login/signup is working correctly
 */

const API_BASE = "http://localhost:3000/api"

async function testAuthFlow() {
  console.log("🧪 Testing Scrible Authentication Flow\n")

  // Test 1: Register new user
  console.log("1️⃣ Testing user registration...")
  try {
    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com",
        password: "testpassword123",
        name: "Test User",
      }),
    })

    const registerData = await registerResponse.json()

    if (registerResponse.ok && registerData.success) {
      console.log("✅ Registration successful!")
      console.log(`   Token: ${registerData.token.substring(0, 20)}...`)
      console.log(`   User: ${registerData.user.name} (${registerData.user.email})`)
    } else {
      console.log("❌ Registration failed:", registerData.error)
    }
  } catch (error) {
    console.log("❌ Registration error:", error.message)
  }

  console.log("")

  // Test 2: Login with demo account
  console.log("2️⃣ Testing demo account login...")
  try {
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo@scrible.ai",
        password: "password",
      }),
    })

    const loginData = await loginResponse.json()

    if (loginResponse.ok && loginData.success) {
      console.log("✅ Login successful!")
      console.log(`   Token: ${loginData.token.substring(0, 20)}...`)
      console.log(`   User: ${loginData.user.name} (${loginData.user.email})`)

      // Test 3: Verify token with /me endpoint
      console.log("\n3️⃣ Testing token verification...")
      const meResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${loginData.token}` },
      })

      const meData = await meResponse.json()

      if (meResponse.ok && meData.success) {
        console.log("✅ Token verification successful!")
        console.log(`   Verified user: ${meData.user.name}`)
      } else {
        console.log("❌ Token verification failed:", meData.error)
      }
    } else {
      console.log("❌ Login failed:", loginData.error)
    }
  } catch (error) {
    console.log("❌ Login error:", error.message)
  }

  console.log("\n🎉 Authentication flow test completed!")
}

// Run the test
testAuthFlow()
