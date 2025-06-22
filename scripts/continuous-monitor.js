/**
 * Continuous Development Monitor
 * Monitors the app health during development
 */

const { runDevHealthCheck } = require("./dev-health-check.js")

let monitorInterval
let lastHealthStatus = null

async function startMonitoring(intervalMinutes = 5) {
  console.log(`🔄 Starting continuous monitoring (every ${intervalMinutes} minutes)`)

  // Run initial check
  await runHealthCheck()

  // Set up interval
  monitorInterval = setInterval(
    async () => {
      await runHealthCheck()
    },
    intervalMinutes * 60 * 1000,
  )

  console.log("✅ Monitoring started. Press Ctrl+C to stop.")
}

async function runHealthCheck() {
  const timestamp = new Date().toLocaleTimeString()
  console.log(`\n[${timestamp}] 🔍 Running health check...`)

  try {
    const result = await runDevHealthCheck()

    if (result.healthy && !lastHealthStatus) {
      console.log("🎉 System is now healthy!")
    } else if (!result.healthy && lastHealthStatus) {
      console.log("⚠️  System health degraded!")
    }

    lastHealthStatus = result.healthy
  } catch (error) {
    console.error("❌ Health check failed:", error)
    lastHealthStatus = false
  }
}

function stopMonitoring() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    console.log("🛑 Monitoring stopped")
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  stopMonitoring()
  process.exit(0)
})

// Start monitoring if run directly
if (require.main === module) {
  const intervalMinutes = process.argv[2] ? Number.parseInt(process.argv[2]) : 5
  startMonitoring(intervalMinutes)
}

module.exports = { startMonitoring, stopMonitoring }
