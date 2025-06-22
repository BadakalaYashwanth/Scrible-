/**
 * Comprehensive test script to verify the entire Scrible workflow
 * Tests: Account creation → Login → File upload → Summarization → Chat/QA
 */

const API_BASE = "http://localhost:3000/api"

// Test configuration
const TEST_USER = {
  name: "Demo User",
  email: "demo@test.com",
  password: "password123",
}

const TEST_NOTEBOOK = {
  name: "AI Research Demo",
  description: "Testing the complete Scrible workflow with AI content",
}

const TEST_URL = "https://en.wikipedia.org/wiki/Artificial_intelligence"

let authToken = ""
let notebookId = ""
let sourceId = ""

// Utility functions
function log(step, message, data = null) {
  console.log(`\n🔍 ${step}: ${message}`)
  if (data) console.log(JSON.stringify(data, null, 2))
}

function logSuccess(message) {
  console.log(`✅ ${message}`)
}

function logError(message, error = null) {
  console.log(`❌ ${message}`)
  if (error) console.error(error)
}

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const headers = {
    "Content-Type": "application/json",
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
    ...options.headers,
  }

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

  return { response, data }
}

// Test functions
async function testAccountCreation() {
  log("STEP 1", "Creating demo account", TEST_USER)

  try {
    const { response, data } = await makeRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(TEST_USER),
    })

    if (response.ok && data.success) {
      authToken = data.token
      logSuccess(`Account created successfully! User ID: ${data.user.id}`)
      logSuccess(`JWT Token received: ${authToken.substring(0, 20)}...`)
      return true
    } else {
      logError("Account creation failed", data)
      return false
    }
  } catch (error) {
    logError("Account creation error", error)
    return false
  }
}

async function testLogin() {
  log("STEP 2", "Testing login with created account")

  try {
    const { response, data } = await makeRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    })

    if (response.ok && data.success) {
      authToken = data.token
      logSuccess(`Login successful! Welcome ${data.user.name}`)
      logSuccess(`New JWT Token: ${authToken.substring(0, 20)}...`)
      return true
    } else {
      logError("Login failed", data)
      return false
    }
  } catch (error) {
    logError("Login error", error)
    return false
  }
}

async function testTokenValidation() {
  log("STEP 3", "Validating JWT token")

  try {
    const { response, data } = await makeRequest("/auth/me")

    if (response.ok && data.user) {
      logSuccess(`Token valid! Authenticated as: ${data.user.name} (${data.user.email})`)
      return true
    } else {
      logError("Token validation failed", data)
      return false
    }
  } catch (error) {
    logError("Token validation error", error)
    return false
  }
}

async function testNotebookCreation() {
  log("STEP 4", "Creating test notebook", TEST_NOTEBOOK)

  try {
    const { response, data } = await makeRequest("/notebooks", {
      method: "POST",
      body: JSON.stringify(TEST_NOTEBOOK),
    })

    if (response.ok && data.success) {
      notebookId = data.notebook.id
      logSuccess(`Notebook created! ID: ${notebookId}`)
      logSuccess(`Notebook: "${data.notebook.name}"`)
      return true
    } else {
      logError("Notebook creation failed", data)
      return false
    }
  } catch (error) {
    logError("Notebook creation error", error)
    return false
  }
}

async function testUrlUpload() {
  log("STEP 5", "Testing URL content upload", { url: TEST_URL, notebookId })

  try {
    const { response, data } = await makeRequest("/sources/url", {
      method: "POST",
      body: JSON.stringify({
        url: TEST_URL,
        notebookId: notebookId,
      }),
    })

    if (response.ok && data.success) {
      sourceId = data.source.id
      logSuccess(`URL content uploaded! Source ID: ${sourceId}`)
      logSuccess(`Document: "${data.source.name}"`)
      logSuccess(`Type: ${data.source.type}`)
      return true
    } else {
      logError("URL upload failed", data)
      return false
    }
  } catch (error) {
    logError("URL upload error", error)
    return false
  }
}

async function testContentProcessing() {
  log("STEP 6", "Checking content processing status")

  // Wait a moment for processing
  await new Promise((resolve) => setTimeout(resolve, 2000))

  try {
    const { response, data } = await makeRequest(`/notebooks/${notebookId}`)

    if (response.ok && data.notebook) {
      const notebook = data.notebook
      logSuccess(`Notebook loaded: ${notebook.sources.length} sources`)

      if (notebook.sources.length > 0) {
        const source = notebook.sources.find((s) => s.id === sourceId) // Find the specific source
        if (source) {
          logSuccess(`Source status: ${source.processingStatus.stage}`)
          logSuccess(`Content preview: ${source.content?.substring(0, 100)}...`)
          return true
        } else {
          logError("Specific source not found in notebook after upload")
          return false
        }
      } else {
        logError("No sources found in notebook")
        return false
      }
    } else {
      logError("Failed to load notebook", data)
      return false
    }
  } catch (error) {
    logError("Content processing check error", error)
    return false
  }
}

async function testSummaryGeneration() {
  log("STEP 7", "Testing summary generation")

  try {
    const { response, data } = await makeRequest(`/notebooks/${notebookId}/summary`, {
      method: "POST",
    })

    if (response.ok && data.success) {
      logSuccess("Summary generated successfully!")
      if (data.summary) {
        logSuccess(`Summary preview: ${data.summary.substring(0, 150)}...`)
      }
      return true
    } else {
      logError("Summary generation failed", data)
      return false
    }
  } catch (error) {
    logError("Summary generation error", error)
    return false
  }
}

async function testChatQA() {
  log("STEP 8", "Testing chat/QA functionality")

  const testQuestions = [
    "What is artificial intelligence?",
    "What are the main applications of AI?",
    "Summarize the key points about machine learning.",
  ]

  for (const question of testQuestions) {
    try {
      log("CHAT", `Asking: "${question}"`)

      const { response, data } = await makeRequest("/chat", {
        method: "POST",
        body: JSON.stringify({
          message: question,
          notebookId: notebookId,
          chatHistory: [],
        }),
      })

      if (response.ok && data.response) {
        logSuccess(`Answer received (${data.response.length} chars)`)
        logSuccess(`Preview: ${data.response.substring(0, 200)}...`)

        if (data.sources && data.sources.length > 0) {
          logSuccess(`Sources cited: ${data.sources.length}`)
          data.sources.forEach((source, idx) => {
            logSuccess(`  ${idx + 1}. ${source.sourceName} (${Math.round(source.relevance * 100)}% relevance)`)
          })
        }
      } else {
        logError(`Chat failed for question: "${question}"`, data)
        return false
      }

      // Wait between questions
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      logError(`Chat error for question: "${question}"`, error)
      return false
    }
  }

  return true
}

async function testNotebooksList() {
  log("STEP 9", "Testing notebooks list")

  try {
    const { response, data } = await makeRequest("/notebooks")

    if (response.ok && data.notebooks) {
      logSuccess(`Found ${data.notebooks.length} notebooks`)
      data.notebooks.forEach((notebook) => {
        logSuccess(`  - ${notebook.name}: ${notebook.totalSources} sources, ${notebook.readySources} ready`)
      })
      return true
    } else {
      logError("Failed to load notebooks list", data)
      return false
    }
  } catch (error) {
    logError("Notebooks list error", error)
    return false
  }
}

// Main test runner
async function runFullWorkflowTest() {
  console.log("🚀 Starting Scrible Full Workflow Test")
  console.log("=" * 50)

  const tests = [
    { name: "Account Creation", fn: testAccountCreation },
    { name: "Login", fn: testLogin },
    { name: "Token Validation", fn: testTokenValidation },
    { name: "Notebook Creation", fn: testNotebookCreation },
    { name: "URL Upload", fn: testUrlUpload },
    { name: "Content Processing", fn: testContentProcessing },
    { name: "Summary Generation", fn: testSummaryGeneration },
    { name: "Chat/QA", fn: testChatQA },
    { name: "Notebooks List", fn: testNotebooksList },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await test.fn()
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

    console.log("-".repeat(50))
  }

  console.log("\n📊 TEST RESULTS")
  console.log("=" * 50)
  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`)

  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! Scrible is working perfectly!")
    console.log("\n🔑 Demo Account Details:")
    console.log(`   Email: ${TEST_USER.email}`)
    console.log(`   Password: ${TEST_USER.password}`)
    console.log(`   Notebook: ${TEST_NOTEBOOK.name}`)
  } else {
    console.log("\n⚠️  Some tests failed. Check the logs above for details.")
  }
}

// Run the test
runFullWorkflowTest().catch(console.error)
