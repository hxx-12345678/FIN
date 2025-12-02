/**
 * Comprehensive Compliance Component Test Suite
 * Tests all compliance functionality with edge cases
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

const results = { passed: 0, failed: 0, tests: [] }

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

async function testFrameworks() {
  console.log("\n" + "=".repeat(60))
  console.log("🛡️ COMPLIANCE FRAMEWORKS TESTS")
  console.log("=".repeat(60))
  
  // Test 1: Get frameworks
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/frameworks`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Frameworks", true, `${data.data?.length || 0} frameworks found`)
    } else {
      recordTest("Get Frameworks", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Frameworks", false, error.message)
  }
  
  // Test 2: Update framework
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/frameworks/soc2`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        status: "compliant",
        completed: 47,
        score: 100,
        lastAudit: new Date().toISOString(),
        nextAudit: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    })
    recordTest("Update Framework", response.ok, response.ok ? "Framework updated" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Framework", false, error.message)
  }
  
  // Test 3: Update with invalid framework type
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/frameworks/invalid`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status: "compliant" }),
    })
    recordTest("Update Framework - Invalid Type", !response.ok, "Should reject invalid framework")
  } catch (error) {
    recordTest("Update Framework - Invalid Type", true, "Error caught")
  }
}

async function testSecurityControls() {
  console.log("\n" + "=".repeat(60))
  console.log("🔒 SECURITY CONTROLS TESTS")
  console.log("=".repeat(60))
  
  // Test 1: Get security controls
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/controls`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      const controlsCount = Object.values(data.data || {}).flat().length
      recordTest("Get Security Controls", true, `${controlsCount} controls found`)
    } else {
      recordTest("Get Security Controls", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Security Controls", false, error.message)
  }
  
  // Test 2: Update security control
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/controls/mfa`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        status: "enabled",
        coverage: 100,
        lastTested: new Date().toISOString(),
      }),
    })
    recordTest("Update Security Control", response.ok, response.ok ? "Control updated" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Security Control", false, error.message)
  }
}

async function testAuditLogs() {
  console.log("\n" + "=".repeat(60))
  console.log("📋 AUDIT LOGS TESTS")
  console.log("=".repeat(60))
  
  // Test 1: Get audit logs
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/audit-logs?limit=50`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Audit Logs", true, `${data.data?.length || 0} logs found`)
    } else {
      recordTest("Get Audit Logs", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Audit Logs", false, error.message)
  }
  
  // Test 2: Get audit logs with filters
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/audit-logs?action=profile_updated&limit=10`, {
      headers: getHeaders(),
    })
    recordTest("Get Audit Logs - With Filters", response.ok, response.ok ? "Filtered logs retrieved" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Get Audit Logs - With Filters", false, error.message)
  }
}

async function testPolicies() {
  console.log("\n" + "=".repeat(60))
  console.log("📜 POLICIES TESTS")
  console.log("=".repeat(60))
  
  // Test 1: Get policies
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/policies`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      recordTest("Get Policies", true, `${data.data?.length || 0} policies found`)
    } else {
      recordTest("Get Policies", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Policies", false, error.message)
  }
  
  // Test 2: Update policy
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/policies/data-encryption`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        enabled: true,
        version: "1.1",
      }),
    })
    recordTest("Update Policy", response.ok, response.ok ? "Policy updated" : `HTTP ${response.status}`)
  } catch (error) {
    recordTest("Update Policy", false, error.message)
  }
}

async function testSecurityScore() {
  console.log("\n" + "=".repeat(60))
  console.log("📊 SECURITY SCORE TESTS")
  console.log("=".repeat(60))
  
  // Test: Get security score
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/security-score`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      if (data.data && typeof data.data.overallScore === 'number') {
        recordTest("Get Security Score", true, `Score: ${data.data.overallScore}`)
      } else {
        recordTest("Get Security Score", false, "Invalid score format")
      }
    } else {
      recordTest("Get Security Score", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Get Security Score", false, error.message)
  }
}

async function testExportReport() {
  console.log("\n" + "=".repeat(60))
  console.log("📥 EXPORT COMPLIANCE REPORT TESTS")
  console.log("=".repeat(60))
  
  // Test: Export compliance report
  try {
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/export`, {
      headers: getHeaders(),
    })
    if (response.ok) {
      const data = await response.json()
      if (data.data && data.data.organization) {
        recordTest("Export Compliance Report", true, "Report exported successfully")
      } else {
        recordTest("Export Compliance Report", false, "Invalid report format")
      }
    } else {
      recordTest("Export Compliance Report", false, `HTTP ${response.status}`)
    }
  } catch (error) {
    recordTest("Export Compliance Report", false, error.message)
  }
}

async function runAllTests() {
  console.log("=".repeat(60))
  console.log("🧪 COMPREHENSIVE COMPLIANCE TEST SUITE")
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

  await testFrameworks()
  await testSecurityControls()
  await testAuditLogs()
  await testPolicies()
  await testSecurityScore()
  await testExportReport()
  
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

