/**
 * Comprehensive Test Suite
 * Tests User Management and Notifications components
 */

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

async function testUserManagement() {
  console.log("\n" + "=".repeat(60))
  console.log("👥 USER MANAGEMENT COMPONENT TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get Team Members
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Team Members: ${data.data?.length || 0} members`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Team Members: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Get Invitations
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/invitations`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Invitations: ${data.data?.length || 0} invitations`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Invitations: ${error.message}`)
    results.failed++
  }
  
  // Test 3: Get Activity Log
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/activity?limit=50`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Activity Log: ${data.data?.length || 0} entries`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Activity Log: ${error.message}`)
    results.failed++
  }
  
  // Test 4: Get Roles
  try {
    const response = await fetch(`${API_BASE_URL}/auth/roles`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Roles: ${data.roles?.length || 0} roles`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Roles: ${error.message}`)
    results.failed++
  }
  
  // Test 5: Get Permissions
  try {
    const response = await fetch(`${API_BASE_URL}/auth/permissions`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Permissions: ${data.permissions?.length || 0} permissions`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Permissions: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testNotifications() {
  console.log("\n" + "=".repeat(60))
  console.log("🔔 NOTIFICATIONS COMPONENT TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get Notifications
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications?limit=50`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Notifications: ${data.data?.length || 0} notifications`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Notifications: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Get Stats
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/stats`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Stats: Unread=${data.data?.unread || 0}, Active Rules=${data.data?.activeRules || 0}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Stats: ${error.message}`)
    results.failed++
  }
  
  // Test 3: Get Alert Rules
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/alert-rules`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Alert Rules: ${data.data?.length || 0} rules`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Alert Rules: ${error.message}`)
    results.failed++
  }
  
  // Test 4: Get Channels
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notification-channels`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Channels: ${data.data?.length || 0} channels`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Channels: ${error.message}`)
    results.failed++
  }
  
  // Test 5: Create Alert Rule
  try {
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
    if (response.ok) {
      console.log(`✅ Create Alert Rule: Success`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Create Alert Rule: ${error.message}`)
    results.failed++
  }
  
  // Test 6: Mark All as Read
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/read-all`, {
      method: "PUT",
      headers: getHeaders(),
    })
    if (response.ok) {
      console.log(`✅ Mark All as Read: Success`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Mark All as Read: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function runAllTests() {
  console.log("=".repeat(60))
  console.log("🧪 COMPREHENSIVE COMPONENT TEST SUITE")
  console.log("=".repeat(60))
  console.log(`Testing with: ${TEST_USER.email}`)
  
  if (!(await login())) {
    console.error("\n❌ Cannot proceed without authentication")
    process.exit(1)
  }

  if (!orgId) {
    console.error("\n❌ No organization ID available")
    process.exit(1)
  }

  const userMgmtResults = await testUserManagement()
  const notificationResults = await testNotifications()
  
  const totalPassed = userMgmtResults.passed + notificationResults.passed
  const totalFailed = userMgmtResults.failed + notificationResults.failed
  const totalTests = totalPassed + totalFailed

  console.log("\n" + "=".repeat(60))
  console.log("📊 FINAL TEST SUMMARY")
  console.log("=".repeat(60))
  console.log(`User Management: ${userMgmtResults.passed} passed, ${userMgmtResults.failed} failed`)
  console.log(`Notifications: ${notificationResults.passed} passed, ${notificationResults.failed} failed`)
  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed out of ${totalTests} tests`)
  console.log("=".repeat(60))

  if (totalFailed === 0) {
    console.log("\n🎉 ALL TESTS PASSED!")
    process.exit(0)
  } else {
    console.log("\n⚠️  Some tests failed. Please review the errors above.")
    process.exit(1)
  }
}

runAllTests().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

