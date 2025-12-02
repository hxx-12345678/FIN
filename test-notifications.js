/**
 * Notifications Component Test
 * Tests notifications, alert rules, and channels with cptjacksprw@gmail.com
 */

// Ensure fetch is available (Node.js 18+ has it built-in)
if (typeof fetch === 'undefined') {
  throw new Error('fetch is not available. Please use Node.js 18+ or install node-fetch');
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000/api/v1"

const TEST_USER = {
  email: "cptjacksprw@gmail.com",
  password: "Player@123"
}

let authToken = null
let orgId = null

async function login() {
  console.log("\n🔐 Logging in...")
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.message || error.error?.message || "Login failed")
    }

    const data = await response.json()
    authToken = data.token
    
    if (!authToken) {
      throw new Error("No token received")
    }
    
    const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
    })
    
    if (meResponse.ok) {
      const meData = await meResponse.json()
      orgId = meData.orgs?.[0]?.id || meData.orgId
    }
    
    console.log("✅ Login successful")
    console.log(`   Token: ${authToken.substring(0, 20)}...`)
    console.log(`   OrgId: ${orgId}`)
    return true
  } catch (error) {
    if (error.message.includes("fetch")) {
      console.error("❌ Login failed: Cannot connect to server. Is the backend running?")
    } else {
      console.error(`❌ Login failed: ${error.message}`)
    }
    return false
  }
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authToken}`,
  }
}

async function testGetNotifications() {
  console.log("\n📬 Testing: Get Notifications")
  try {
    if (!orgId) throw new Error("No organization ID available")
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications?limit=50`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const notifications = data.data || []
    
    console.log(`✅ Success: Found ${notifications.length} notifications`)
    if (notifications.length > 0) {
      console.log(`   First: ${notifications[0].title} (${notifications[0].type})`)
    }
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testGetStats() {
  console.log("\n📊 Testing: Get Notification Stats")
  try {
    if (!orgId) throw new Error("No organization ID available")
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/stats`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const stats = data.data || {}
    
    console.log(`✅ Success: Stats retrieved`)
    console.log(`   Unread: ${stats.unread || 0}`)
    console.log(`   High Priority: ${stats.highPriority || 0}`)
    console.log(`   This Week: ${stats.thisWeek || 0}`)
    console.log(`   Active Rules: ${stats.activeRules || 0}`)
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testGetAlertRules() {
  console.log("\n🔔 Testing: Get Alert Rules")
  try {
    if (!orgId) throw new Error("No organization ID available")
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alert-rules`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const rules = data.data || []
    
    console.log(`✅ Success: Found ${rules.length} alert rules`)
    if (rules.length > 0) {
      console.log(`   First: ${rules[0].name} (${rules[0].enabled ? 'enabled' : 'disabled'})`)
    }
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testGetChannels() {
  console.log("\n📡 Testing: Get Notification Channels")
  try {
    if (!orgId) throw new Error("No organization ID available")
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notification-channels`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const channels = data.data || []
    
    console.log(`✅ Success: Found ${channels.length} channels`)
    channels.forEach(ch => {
      console.log(`   ${ch.type}: ${ch.enabled ? 'enabled' : 'disabled'}`)
    })
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testCreateAlertRule() {
  console.log("\n➕ Testing: Create Alert Rule")
  try {
    if (!orgId) throw new Error("No organization ID available")
    
    const ruleData = {
      name: `Test Rule ${Date.now()}`,
      description: "Test alert rule",
      metric: "runway_months",
      operator: "<",
      threshold: 6,
      channels: ["email"],
      frequency: "immediate"
    }
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alert-rules`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(ruleData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ Success: Alert rule created`)
    console.log(`   ID: ${data.data?.id}`)
    return data.data?.id
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testMarkAllAsRead() {
  console.log("\n✅ Testing: Mark All Notifications as Read")
  try {
    if (!orgId) throw new Error("No organization ID available")
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/read-all`, {
      method: "PUT",
      headers: getHeaders(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { message: errorText || `HTTP ${response.status}` }
      }
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    console.log(`✅ Success: All notifications marked as read`)
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

// Main test runner
async function runTests() {
  console.log("============================================================")
  console.log("🧪 NOTIFICATIONS COMPONENT - PRODUCTION TEST SUITE")
  console.log("============================================================")

  if (!(await login())) {
    console.error("\n❌ Cannot proceed without authentication")
    process.exit(1)
  }

  if (!orgId) {
    console.error("\n❌ No organization ID available")
    process.exit(1)
  }

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  }

  // Run tests
  const tests = [
    { name: "Get Notifications", fn: testGetNotifications },
    { name: "Get Stats", fn: testGetStats },
    { name: "Get Alert Rules", fn: testGetAlertRules },
    { name: "Get Channels", fn: testGetChannels },
    { name: "Create Alert Rule", fn: testCreateAlertRule },
    { name: "Mark All as Read", fn: testMarkAllAsRead },
  ]

  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result === true || result) {
        results.passed++
      } else {
        results.failed++
      }
    } catch (error) {
      results.failed++
    }
  }

  console.log("\n============================================================")
  console.log("📊 TEST SUMMARY")
  console.log("============================================================")
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`⚠️  Skipped: ${results.skipped}`)
  console.log(`📈 Total: ${results.passed + results.failed + results.skipped}`)
  console.log("============================================================")

  if (results.failed === 0) {
    console.log("\n🎉 All tests passed!")
    process.exit(0)
  } else {
    console.log("\n⚠️  Some tests failed. Please review the errors above.")
    process.exit(1)
  }
}

runTests().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

