/**
 * Comprehensive Settings Component Test Suite
 * Tests all settings functionality end-to-end
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

async function testProfile() {
  console.log("\n" + "=".repeat(60))
  console.log("👤 PROFILE SETTINGS TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get Profile
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Profile: ${data.data?.email || "N/A"}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Profile: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Update Profile
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        name: "Test User",
        phone: "+1234567890",
        jobTitle: "Test Title",
      }),
    })
    if (response.ok) {
      console.log(`✅ Update Profile: Success`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Update Profile: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testOrganization() {
  console.log("\n" + "=".repeat(60))
  console.log("🏢 ORGANIZATION SETTINGS TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get Organization
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Organization: ${data.data?.name || "N/A"}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Organization: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Update Organization
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        name: "Test Organization",
        currency: "USD",
      }),
    })
    if (response.ok) {
      console.log(`✅ Update Organization: Success`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Update Organization: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testAppearance() {
  console.log("\n" + "=".repeat(60))
  console.log("🎨 APPEARANCE SETTINGS TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get Appearance
  try {
    const response = await fetch(`${API_BASE_URL}/users/appearance`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Appearance: Theme=${data.data?.theme || "N/A"}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Appearance: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Update Appearance
  try {
    const response = await fetch(`${API_BASE_URL}/users/appearance`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        theme: "dark",
        fontSize: "large",
        animations: true,
      }),
    })
    if (response.ok) {
      console.log(`✅ Update Appearance: Success`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Update Appearance: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testNotificationPreferences() {
  console.log("\n" + "=".repeat(60))
  console.log("🔔 NOTIFICATION PREFERENCES TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get Notification Preferences
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/preferences`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Notification Preferences: Email=${data.data?.emailNotifications}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Notification Preferences: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Update Notification Preferences
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/notifications/preferences`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        emailNotifications: true,
        pushNotifications: false,
        weeklyDigest: true,
      }),
    })
    if (response.ok) {
      console.log(`✅ Update Notification Preferences: Success`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Update Notification Preferences: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testLocalization() {
  console.log("\n" + "=".repeat(60))
  console.log("🌍 LOCALIZATION SETTINGS TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get Localization
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Localization: Currency=${data.data?.currency || "N/A"}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Localization: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Update Localization
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        currency: "USD",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
      }),
    })
    if (response.ok) {
      console.log(`✅ Update Localization: Success`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Update Localization: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testSecurity() {
  console.log("\n" + "=".repeat(60))
  console.log("🔒 SECURITY SETTINGS TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test 1: Get API Key
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/api-key`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get API Key: ${data.data?.apiKey ? "Key retrieved" : "No key"}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get API Key: ${error.message}`)
    results.failed++
  }
  
  // Test 2: Regenerate API Key
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/api-key/regenerate`, {
      method: "POST",
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Regenerate API Key: ${data.data?.apiKey ? "Success" : "Failed"}`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Regenerate API Key: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testSyncAudit() {
  console.log("\n" + "=".repeat(60))
  console.log("📊 SYNC AUDIT LOG TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test: Get Sync Audit Log
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/sync-audit?limit=10`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Get Sync Audit Log: ${data.data?.length || 0} records`)
      results.passed++
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Get Sync Audit Log: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function testExportData() {
  console.log("\n" + "=".repeat(60))
  console.log("📥 EXPORT DATA TESTS")
  console.log("=".repeat(60))
  
  const results = { passed: 0, failed: 0 }
  
  // Test: Export Data
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/export-data`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      if (data.data && data.data.organization) {
        console.log(`✅ Export Data: Success`)
        console.log(`   Organization: ${data.data.organization.name}`)
        console.log(`   Users: ${data.data.users?.length || 0}`)
        console.log(`   Models: ${data.data.models?.length || 0}`)
        results.passed++
      } else {
        throw new Error("Invalid export data format")
      }
    } else {
      throw new Error(`HTTP ${response.status}`)
    }
  } catch (error) {
    console.error(`❌ Export Data: ${error.message}`)
    results.failed++
  }
  
  return results
}

async function runAllTests() {
  console.log("=".repeat(60))
  console.log("🧪 SETTINGS COMPONENT - PRODUCTION TEST SUITE")
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

  const profileResults = await testProfile()
  const orgResults = await testOrganization()
  const appearanceResults = await testAppearance()
  const notificationResults = await testNotificationPreferences()
  const localizationResults = await testLocalization()
  const securityResults = await testSecurity()
  const syncResults = await testSyncAudit()
  const exportResults = await testExportData()
  
  const totalPassed = 
    profileResults.passed + 
    orgResults.passed + 
    appearanceResults.passed + 
    notificationResults.passed + 
    localizationResults.passed + 
    securityResults.passed + 
    syncResults.passed + 
    exportResults.passed
    
  const totalFailed = 
    profileResults.failed + 
    orgResults.failed + 
    appearanceResults.failed + 
    notificationResults.failed + 
    localizationResults.failed + 
    securityResults.failed + 
    syncResults.failed + 
    exportResults.failed

  const totalTests = totalPassed + totalFailed

  console.log("\n" + "=".repeat(60))
  console.log("📊 TEST SUMMARY")
  console.log("=".repeat(60))
  console.log(`Profile: ${profileResults.passed} passed, ${profileResults.failed} failed`)
  console.log(`Organization: ${orgResults.passed} passed, ${orgResults.failed} failed`)
  console.log(`Appearance: ${appearanceResults.passed} passed, ${appearanceResults.failed} failed`)
  console.log(`Notifications: ${notificationResults.passed} passed, ${notificationResults.failed} failed`)
  console.log(`Localization: ${localizationResults.passed} passed, ${localizationResults.failed} failed`)
  console.log(`Security: ${securityResults.passed} passed, ${securityResults.failed} failed`)
  console.log(`Sync Audit: ${syncResults.passed} passed, ${syncResults.failed} failed`)
  console.log(`Export Data: ${exportResults.passed} passed, ${exportResults.failed} failed`)
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


