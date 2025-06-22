/**
 * Comprehensive API Test Suite
 * Tests all backend endpoints with various scenarios
 */

const API_BASE = "http://localhost:3000/api"

// Test scenarios
const testScenarios = {
  auth: [
    {
      name: "Register with valid data",
      endpoint: "/auth/register",
      method: "POST",
      body: { name: "Test User", email: "test@example.com", password: "password123" },
      expectStatus: 201,
      expectFields: ["success", "token", "user"],
    },
    {
      name: "Register with duplicate email",
      endpoint: "/auth/register",
      method: "POST",
      body: { name: "Test User 2", email: "test@example.com", password: "password123" },
      expectStatus: 400,
      expectFields: ["error"],
    },
    {
      name: "Login with valid credentials",
      endpoint: "/auth/login",
      method: "POST",
      body: { email: "test@example.com", password: "password123" },
      expectStatus: 200,
      expectFields: ["success", "token", "user"],
    },
    {
      name: "Login with invalid credentials",
      endpoint: "/auth/login",
      method: "POST",
      body: { email: "test@example.com", password: "wrongpassword" },
      expectStatus: 401,
      expectFields: ["error"],
    },
  ],
  notebooks: [
    {
      name: "Create notebook",
      endpoint: "/notebooks",
      method: "POST",
      body: { name: "Test Notebook", description: "Test description" },
      expectStatus: 200,
      expectFields: ["success", "notebook"],
      requireAuth: true,
    },
    {
      name: "Get notebooks",
      endpoint: "/notebooks",
      method: "GET",
      expectStatus: 200,
      expectFields: ["notebooks"],
      requireAuth: true,
    },
  ],
  sources: [
    {
      name: "Upload URL",
      endpoint: "/sources/url",
      method: "POST",
      body: { url: "https://example.com", notebookId: "1" },
      expectStatus: 200,
      expectFields: ["success"],
      requireAuth: true,
    },
  ],
}

let authToken = ""

async function runApiTest(test) {
  const url = `${API_BASE}${test.endpoint}`
  const headers = {
    "Content-Type": "application/json",
    ...(test.requireAuth && authToken && { Authorization: `Bearer ${authToken}` }),
  }

  try {
    const response = await fetch(url, {
      method: test.method || "GET",
      headers,
      ...(test.body && { body: JSON.stringify(test.body) }),
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { rawResponse: text }
    }

    // Check status code
    const statusMatch = response.status === test.expectStatus
    if (!statusMatch) {
      return {
        passed: false,
        error: `Expected status ${test.expectStatus}, got ${response.status}`,
        data,
      }
    }

    // Check required fields
    if (test.expectFields) {
      const missingFields = test.expectFields.filter((field) => !(field in data))
      if (missingFields.length > 0) {
        return {
          passed: false,
          error: `Missing fields: ${missingFields.join(", ")}`,
          data,
        }
      }
    }

    // Store auth token for subsequent tests
    if (data.token) {
      authToken = data.token
    }

    return { passed: true, data }
  } catch (error) {
    return { passed: false, error: error.message }
  }
}

async function runAllApiTests() {
  console.log("🧪 Running API Test Suite")
  console.log("=" * 50)

  let totalPassed = 0
  let totalFailed = 0

  for (const [category, tests] of Object.entries(testScenarios)) {
    console.log(`\n📂 Testing ${category.toUpperCase()} endpoints:`)

    for (const test of tests) {
      const result = await runApiTest(test)

      if (result.passed) {
        totalPassed++
        console.log(`  ✅ ${test.name}`)
      } else {
        totalFailed++
        console.log(`  ❌ ${test.name}: ${result.error}`)
        if (result.data) {
          console.log(`     Response: ${JSON.stringify(result.data, null, 2)}`)
        }
      }
    }
  }

  console.log("\n📊 API TEST RESULTS")
  console.log("=" * 50)
  console.log(`✅ Passed: ${totalPassed}`)
  console.log(`❌ Failed: ${totalFailed}`)
  console.log(`📈 Success Rate: ${Math.round((totalPassed / (totalPassed + totalFailed)) * 100)}%`)

  return { passed: totalPassed, failed: totalFailed }
}

// Run tests
runAllApiTests().catch(console.error)
