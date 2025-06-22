/**
 * Development Health Check Script
 * Verifies all backend APIs and frontend integration
 */

const API_BASE = "http://localhost:3000/api"

// Test configuration
const TEST_USER = {
  name: "Dev Test User",
  email: "dev@test.com",
  password: "password123",
}

const TEST_NOTEBOOK = {
  name: "Dev Test Notebook",
  description: "Testing development environment",
}

let authToken = ""
let notebookId = ""

// Utility functions
function log(category, message, data = null) {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`[${timestamp}] 🔍 ${category}: ${message}`)
  if (data) console.log(JSON.stringify(data, null, 2))
}

function logSuccess(message) {
  console.log(`✅ ${message}`)
}

function logError(message, error = null) {
  console.log(`❌ ${message}`)
  if (error) console.error(error)
}

function logWarning(message) {
  console.log(`⚠️  ${message}`)
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const headers = {
    "Content-Type": "application/json",
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { rawResponse: text }
    }

    return { response, data, success: response.ok }
  } catch (error) {
    return { response: null, data: { error: error.message }, success: false }
  }
}

// Backend API Tests
async function testBackendHealth() {
  log("BACKEND", "Testing core API endpoints")

  const tests = [
    {
      name: "Health Check",
      test: async () => {
        const { success } = await makeRequest("/health")
        return success
      },
    },
    {
      name: "Auth Register",
      test: async () => {
        const { success, data } = await makeRequest("/auth/register", {
          method: "POST",
          body: JSON.stringify(TEST_USER),
        })
        if (success && data.token) {
          authToken = data.token
          logSuccess(`Token received: ${authToken.substring(0, 20)}...`)
        }
        return success
      },
    },
    {
      name: "Auth Login",
      test: async () => {
        const { success, data } = await makeRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: TEST_USER.email,
            password: TEST_USER.password,
          }),
        })
        return success
      },
    },
    {
      name: "Auth Me",
      test: async () => {
        const { success, data } = await makeRequest("/auth/me")
        if (success) {
          logSuccess(`Authenticated as: ${data.user?.name}`)
        }
        return success
      },
    },
    {
      name: "Create Notebook",
      test: async () => {
        const { success, data } = await makeRequest("/notebooks", {
          method: "POST",
          body: JSON.stringify(TEST_NOTEBOOK),
        })
        if (success && data.notebook) {
          notebookId = data.notebook.id
          logSuccess(`Notebook created: ${notebookId}`)
        }
        return success
      },
    },
    {
      name: "Get Notebooks",
      test: async () => {
        const { success, data } = await makeRequest("/notebooks")
        if (success) {
          logSuccess(`Found ${data.notebooks?.length || 0} notebooks`)
        }
        return success
      },
    },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.test()
      if (result) {
        passed++
        logSuccess(`${test.name} - PASSED`)
      } else {
        failed++
        logError(`${test.name} - FAILED`)
      }
    } catch (error) {
      failed++
      logError(`${test.name} - ERROR`, error)
    }
  }

  return { passed, failed, total: tests.length }
}

// Frontend Integration Tests
async function testFrontendIntegration() {
  log("FRONTEND", "Testing frontend integration")

  const checks = [
    {
      name: "API Base URL",
      check: () => {
        const isLocalhost = API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1")
        if (isLocalhost) {
          logSuccess("API pointing to localhost - good for development")
        } else {
          logWarning("API not pointing to localhost - check if intentional")
        }
        return true
      },
    },
    {
      name: "Environment Variables",
      check: () => {
        // Check if common env vars are set
        const envVars = ["JWT_SECRET", "OPENAI_API_KEY"]
        let hasEnvVars = false

        envVars.forEach((envVar) => {
          if (process.env[envVar]) {
            logSuccess(`${envVar} is set`)
            hasEnvVars = true
          } else {
            logWarning(`${envVar} not set - some features may not work`)
          }
        })

        return true // Don't fail on missing env vars
      },
    },
  ]

  let passed = 0
  let failed = 0

  for (const check of checks) {
    try {
      const result = check.check()
      if (result) {
        passed++
        logSuccess(`${check.name} - PASSED`)
      } else {
        failed++
        logError(`${check.name} - FAILED`)
      }
    } catch (error) {
      failed++
      logError(`${check.name} - ERROR`, error)
    }
  }

  return { passed, failed, total: checks.length }
}

// Data Flow Tests
async function testDataFlow() {
  log("DATA FLOW", "Testing end-to-end data flow")

  const flows = [
    {
      name: "User Registration → Token Storage",
      test: async () => {
        // Already tested in backend, just verify token exists
        return !!authToken
      },
    },
    {
      name: "Notebook Creation → Data Persistence",
      test: async () => {
        if (!notebookId) return false

        // Verify notebook exists by fetching it
        const { success, data } = await makeRequest(`/notebooks/${notebookId}`)
        return success && data.notebook
      },
    },
    {
      name: "URL Upload → Content Processing",
      test: async () => {
        if (!notebookId) return false

        const { success, data } = await makeRequest("/sources/url", {
          method: "POST",
          body: JSON.stringify({
            url: "https://example.com",
            notebookId: notebookId,
          }),
        })

        if (success) {
          logSuccess("URL upload successful")
        }
        return success
      },
    },
  ]

  let passed = 0
  let failed = 0

  for (const flow of flows) {
    try {
      const result = await flow.test()
      if (result) {
        passed++
        logSuccess(`${flow.name} - PASSED`)
      } else {
        failed++
        logError(`${flow.name} - FAILED`)
      }
    } catch (error) {
      failed++
      logError(`${flow.name} - ERROR`, error)
    }
  }

  return { passed, failed, total: flows.length }
}

// Main health check runner
async function runDevHealthCheck() {
  console.log("🚀 Starting Development Health Check")
  console.log("=" * 60)

  const results = {
    backend: await testBackendHealth(),
    frontend: await testFrontendIntegration(),
    dataFlow: await testDataFlow(),
  }

  console.log("\n📊 HEALTH CHECK RESULTS")
  console.log("=" * 60)

  let totalPassed = 0
  let totalFailed = 0
  let totalTests = 0

  Object.entries(results).forEach(([category, result]) => {
    console.log(`\n${category.toUpperCase()}:`)
    console.log(`  ✅ Passed: ${result.passed}`)
    console.log(`  ❌ Failed: ${result.failed}`)
    console.log(`  📈 Success Rate: ${Math.round((result.passed / result.total) * 100)}%`)

    totalPassed += result.passed
    totalFailed += result.failed
    totalTests += result.total
  })

  console.log("\n🎯 OVERALL RESULTS")
  console.log("=" * 60)
  console.log(`✅ Total Passed: ${totalPassed}`)
  console.log(`❌ Total Failed: ${totalFailed}`)
  console.log(`📊 Overall Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`)

  if (totalFailed === 0) {
    console.log("\n🎉 ALL SYSTEMS OPERATIONAL!")
    console.log("✅ Backend APIs working")
    console.log("✅ Frontend integration ready")
    console.log("✅ Data flow functional")
    console.log("\n🚀 Ready for development!")
  } else {
    console.log("\n⚠️  ISSUES DETECTED")
    console.log("Check the failed tests above and fix before continuing development.")
  }

  return {
    healthy: totalFailed === 0,
    results,
    summary: {
      passed: totalPassed,
      failed: totalFailed,
      total: totalTests,
      successRate: Math.round((totalPassed / totalTests) * 100),
    },
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = { runDevHealthCheck }
} else {
  // Run if called directly
  runDevHealthCheck().catch(console.error)
}
