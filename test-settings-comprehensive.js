/**
 * Comprehensive Settings Component Test Suite
 * Tests all settings functionality with edge cases and scenarios
 * Testing with: cptjacksprw@gmail.com
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

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
}

function recordTest(name, passed, message = "") {
  results.tests.push({ name, passed, message })
  if (passed) {
    results.passed++
    console.log(`✅ ${name}${message ? `: ${message}` : ""}`)
  } else {
    results.failed++
    console.error(`❌ ${name}${message ? `: ${message}` : ""}`)
  }
}

async function testProfileEdgeCases() {
  console.log("\n" + "=".repeat(60))
  console.log("👤 PROFILE SETTINGS - EDGE CASES")
  console.log("=".repeat(60))
  
  // Test 1: Get profile
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Profile", true, data.data?.email || "N/A")
    } else {
      recordTest("Get Profile", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Profile", false, error.message)
  }
  
  // Test 2: Update with empty name (should handle gracefully)
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ name: "" }),
    })
    recordTest("Update Profile - Empty Name", response.ok, response.ok ? "Handled" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Profile - Empty Name", false, error.message)
  }
  
  // Test 3: Update with very long name
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ name: "A".repeat(300) }),
    })
    recordTest("Update Profile - Long Name", !response.ok || response.status === 400, "Validation should reject")
  } catch (error) {
    recordTest("Update Profile - Long Name", true, "Error caught")
  }
  
  // Test 4: Update with invalid email format
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ email: "invalid-email" }),
    })
    recordTest("Update Profile - Invalid Email", !response.ok, "Should reject invalid email")
  } catch (error) {
    recordTest("Update Profile - Invalid Email", true, "Error caught")
  }
  
  // Test 5: Update with special characters in phone
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ phone: "+1-234-567-8900" }),
    })
    recordTest("Update Profile - Special Characters Phone", response.ok, "Should accept")
  } catch (error) {
    recordTest("Update Profile - Special Characters Phone", false, error.message)
  }
}

async function testLocalizationEdgeCases() {
  console.log("\n" + "=".repeat(60))
  console.log("🌍 LOCALIZATION SETTINGS - EDGE CASES")
  console.log("=".repeat(60))
  
  // Test 1: Get localization
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Localization", true, `Currency: ${data.data?.baseCurrency || "N/A"}`)
    } else {
      recordTest("Get Localization", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Localization", false, error.message)
  }
  
  // Test 2: Update with invalid currency
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ baseCurrency: "XXX" }),
    })
    recordTest("Update Localization - Invalid Currency", !response.ok, "Should reject invalid currency")
  } catch (error) {
    recordTest("Update Localization - Invalid Currency", true, "Error caught")
  }
  
  // Test 3: Update with invalid timezone
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ timezone: "Invalid/Timezone" }),
    })
    recordTest("Update Localization - Invalid Timezone", !response.ok, "Should reject invalid timezone")
  } catch (error) {
    recordTest("Update Localization - Invalid Timezone", true, "Error caught")
  }
  
  // Test 4: Update FX rates
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization/fx-rates/update`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ baseCurrency: "USD" }),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Update FX Rates", true, `Rates updated: ${Object.keys(data.data?.fxRates || {}).length} currencies`)
    } else {
      recordTest("Update FX Rates", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Update FX Rates", false, error.message)
  }
  
  // Test 5: Update FX rates with invalid base currency
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization/fx-rates/update`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ baseCurrency: "INVALID" }),
    })
    recordTest("Update FX Rates - Invalid Base", !response.ok, "Should reject invalid base currency")
  } catch (error) {
    recordTest("Update FX Rates - Invalid Base", true, "Error caught")
  }
  
  // Test 6: Update with India compliance data
  try {
    const complianceData = {
      taxLiabilities: [
        {
          type: "GST Return (GSTR-3B)",
          amount: 145000,
          dueDate: "2025-01-20",
          status: "upcoming",
          description: "Monthly GST return filing",
        },
      ],
      gstSummary: {
        totalGstCollected: 1450000,
        totalGstPaid: 890000,
        netGstLiability: 560000,
        itcAvailable: 125000,
        nextFilingDate: "2025-01-20",
      },
    }
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        gstEnabled: true,
        tdsEnabled: true,
        complianceData,
      }),
    })
    recordTest("Update Localization - India Compliance", response.ok, response.ok ? "Compliance data saved" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Localization - India Compliance", false, error.message)
  }
  
  // Test 7: Multi-currency settings
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        baseCurrency: "INR",
        displayCurrency: "USD",
        autoFxUpdate: true,
      }),
    })
    recordTest("Update Localization - Multi-Currency", response.ok, response.ok ? "Multi-currency configured" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Localization - Multi-Currency", false, error.message)
  }
  
  // Test 8: Verify FX rates are persisted
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/localization`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      const hasRates = data.data?.fxRates && Object.keys(data.data.fxRates).length > 0
      recordTest("Verify FX Rates Persisted", hasRates, hasRates ? `${Object.keys(data.data.fxRates).length} rates found` : "No rates found")
    } else {
      recordTest("Verify FX Rates Persisted", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Verify FX Rates Persisted", false, error.message)
  }
}

async function testOrganizationEdgeCases() {
  console.log("\n" + "=".repeat(60))
  console.log("🏢 ORGANIZATION SETTINGS - EDGE CASES")
  console.log("=".repeat(60))
  
  // Test 1: Get organization
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Organization", true, data.data?.name || "N/A")
    } else {
      recordTest("Get Organization", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Organization", false, error.message)
  }
  
  // Test 2: Update with all fields
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        name: "Test Organization Updated",
        industry: "fintech",
        companySize: "11-50",
        website: "https://example.com",
        address: "123 Test St, Test City, TC 12345",
        taxId: "TAX123456",
        currency: "USD",
      }),
    })
    recordTest("Update Organization - All Fields", response.ok, response.ok ? "All fields updated" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Organization - All Fields", false, error.message)
  }
  
  // Test 3: Update with invalid currency
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ currency: "INVALID" }),
    })
    recordTest("Update Organization - Invalid Currency", !response.ok, "Should reject invalid currency")
  } catch (error) {
    recordTest("Update Organization - Invalid Currency", true, "Error caught")
  }
}

async function testAppearanceEdgeCases() {
  console.log("\n" + "=".repeat(60))
  console.log("🎨 APPEARANCE SETTINGS - EDGE CASES")
  console.log("=".repeat(60))
  
  // Test 1: Get appearance
  try {
    const response = await fetch(`${API_BASE_URL}/users/appearance`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Appearance", true, `Theme: ${data.data?.theme || "N/A"}`)
    } else {
      recordTest("Get Appearance", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Appearance", false, error.message)
  }
  
  // Test 2: Update with all appearance options
  try {
    const response = await fetch(`${API_BASE_URL}/users/appearance`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        theme: "dark",
        themeColor: "purple",
        fontSize: "large",
        dateFormat: "DD/MM/YYYY",
        animations: false,
      }),
    })
    recordTest("Update Appearance - All Options", response.ok, response.ok ? "All options updated" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Appearance - All Options", false, error.message)
  }
  
  // Test 3: Update with invalid theme
  try {
    const response = await fetch(`${API_BASE_URL}/users/appearance`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ theme: "invalid" }),
    })
    recordTest("Update Appearance - Invalid Theme", !response.ok, "Should reject invalid theme")
  } catch (error) {
    recordTest("Update Appearance - Invalid Theme", true, "Error caught")
  }
}

async function testExportDataEdgeCases() {
  console.log("\n" + "=".repeat(60))
  console.log("📥 EXPORT DATA - EDGE CASES")
  console.log("=".repeat(60))
  
  // Test 1: Export data
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/export-data`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      if (data.data && data.data.organization) {
        recordTest("Export Data", true, `Org: ${data.data.organization.name}`)
      } else {
        recordTest("Export Data", false, "Invalid export data format")
      }
    } else {
      recordTest("Export Data", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Export Data", false, error.message)
  }
  
  // Test 2: Verify export includes localization data
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/export-data`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      const hasLocalization = data.data?.localization !== null && data.data?.localization !== undefined
      recordTest("Export Data - Includes Localization", hasLocalization, hasLocalization ? "Localization data included" : "No localization data")
    } else {
      recordTest("Export Data - Includes Localization", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Export Data - Includes Localization", false, error.message)
  }
}

async function testSyncAuditEdgeCases() {
  console.log("\n" + "=".repeat(60))
  console.log("📊 SYNC AUDIT - EDGE CASES")
  console.log("=".repeat(60))
  
  // Test 1: Get sync audit with limit
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/sync-audit?limit=10`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Sync Audit - With Limit", true, `${data.data?.length || 0} records`)
    } else {
      recordTest("Get Sync Audit - With Limit", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Sync Audit - With Limit", false, error.message)
  }
  
  // Test 2: Get sync audit with large limit
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/sync-audit?limit=1000`, {
      headers: getHeaders(),
    })
    recordTest("Get Sync Audit - Large Limit", response.ok, response.ok ? "Handled large limit" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Get Sync Audit - Large Limit", false, error.message)
  }
}

async function runAllTests() {
  console.log("=".repeat(60))
  console.log("🧪 COMPREHENSIVE SETTINGS TEST SUITE")
  console.log("=".repeat(60))
  console.log(`Testing with: ${TEST_USER.email}`)
  console.log(`Testing all edge cases and scenarios`)
  
  if (!(await login())) {
    console.error("\n❌ Cannot proceed without authentication")
    process.exit(1)
  }

  if (!orgId) {
    console.error("\n❌ No organization ID available")
    process.exit(1)
  }

  await testProfileEdgeCases()
  await testLocalizationEdgeCases()
  await testOrganizationEdgeCases()
  await testAppearanceEdgeCases()
  await testExportDataEdgeCases()
  await testSyncAuditEdgeCases()
  
  console.log("\n" + "=".repeat(60))
  console.log("📊 TEST SUMMARY")
  console.log("=".repeat(60))
  console.log(`Total Tests: ${results.passed + results.failed}`)
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`)
  console.log("=".repeat(60))
  
  if (results.failed > 0) {
    console.log("\n❌ Failed Tests:")
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`)
    })
  }
  
  if (results.failed === 0) {
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

