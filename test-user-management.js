/**
 * Comprehensive User Management Component Test
 * Tests all tabs and functionalities with production-level scenarios
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000/api/v1"

// Test configuration
const TEST_USER = {
  email: "cptjacksprw@gmail.com",
  password: "Player@123"
}

let authToken = null
let orgId = null
let testUserId = null

// Helper functions
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
    
    // Get user info to find orgId
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
    console.log(`   OrgId: ${orgId || "Not found - will try to get from first request"}`)
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

// Test functions
async function testGetTeamMembers() {
  console.log("\n📋 Testing: Get Team Members")
  try {
    if (!orgId) {
      // Try to get orgId from /auth/me if not set
      const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getHeaders(),
      })
      if (meResponse.ok) {
        const meData = await meResponse.json()
        orgId = meData.orgs?.[0]?.id || meData.orgId
      }
    }
    
    if (!orgId) {
      throw new Error("No organization ID available")
    }
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users`, {
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
    const members = data.data || []
    
    console.log(`✅ Success: Found ${members.length} team members`)
    if (members.length > 0) {
      console.log(`   First member: ${members[0].email} (${members[0].role})`)
      testUserId = members[0].id
    }
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testGetInvitations() {
  console.log("\n📧 Testing: Get Invitations")
  try {
    if (!orgId) {
      throw new Error("No organization ID available")
    }
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/invitations`, {
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
    const invitations = data.data || []
    
    console.log(`✅ Success: Found ${invitations.length} invitations`)
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testGetActivityLog() {
  console.log("\n📊 Testing: Get Activity Log")
  try {
    if (!orgId) {
      throw new Error("No organization ID available")
    }
    
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/activity?limit=50`, {
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
    const activities = data.data || []
    
    console.log(`✅ Success: Found ${activities.length} activity entries`)
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testGetRoles() {
  console.log("\n👥 Testing: Get Roles")
  try {
    const response = await fetch(`${API_BASE_URL}/auth/roles`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const roles = data.roles || []
    
    console.log(`✅ Success: Found ${roles.length} roles`)
    if (roles.length > 0) {
      console.log(`   Roles: ${roles.map(r => r.name).join(", ")}`)
    }
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testGetPermissions() {
  console.log("\n🔐 Testing: Get Permissions")
  try {
    const response = await fetch(`${API_BASE_URL}/auth/permissions`, {
      headers: getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    const permissions = data.permissions || []
    
    console.log(`✅ Success: Found ${permissions.length} permissions`)
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testInviteUser() {
  console.log("\n✉️  Testing: Invite User")
  try {
    if (!orgId) {
      throw new Error("No organization ID available")
    }
    
    const testEmail = `test-${Date.now()}@example.com`
    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/invite`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        email: testEmail,
        role: "viewer",
        message: "Test invitation",
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
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log(`✅ Success: Invitation sent to ${testEmail}`)
    return data.data?.id || true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testUpdateRole() {
  console.log("\n🔄 Testing: Update User Role")
  if (!testUserId) {
    console.log("⚠️  Skipped: No test user available")
    return true
  }

  try {
    // First get current role
    const getResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/users`, {
      headers: getHeaders(),
    })
    const getData = await getResponse.json()
    const user = (getData.data || []).find(u => u.id === testUserId)
    
    if (!user) {
      console.log("⚠️  Skipped: Test user not found")
      return true
    }

    const currentRole = user.role
    const newRole = currentRole === "admin" ? "finance" : "viewer"

    // Only test if not the last admin
    if (currentRole === "admin") {
      const adminCount = (getData.data || []).filter(u => u.role === "admin").length
      if (adminCount === 1) {
        console.log("⚠️  Skipped: Cannot change last admin's role")
        return true
      }
    }

    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/${testUserId}/role`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ role: newRole }),
    })

    if (!response.ok) {
      const error = await response.json()
      // This is expected if trying to remove last admin
      if (error.message?.includes("last admin")) {
        console.log("✅ Success: Correctly prevented removing last admin")
        return true
      }
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    console.log(`✅ Success: Role updated from ${currentRole} to ${newRole}`)
    
    // Restore original role
    await fetch(`${API_BASE_URL}/orgs/${orgId}/users/${testUserId}/role`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ role: currentRole }),
    })
    
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testToggleUserStatus() {
  console.log("\n🔄 Testing: Toggle User Status")
  if (!testUserId) {
    console.log("⚠️  Skipped: No test user available")
    return true
  }

  try {
    // Get current status
    const getResponse = await fetch(`${API_BASE_URL}/orgs/${orgId}/users`, {
      headers: getHeaders(),
    })
    const getData = await getResponse.json()
    const user = (getData.data || []).find(u => u.id === testUserId)
    
    if (!user) {
      console.log("⚠️  Skipped: Test user not found")
      return true
    }

    const currentStatus = user.status
    const newStatus = currentStatus === "active" ? false : true

    const response = await fetch(`${API_BASE_URL}/orgs/${orgId}/users/${testUserId}/status`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ isActive: newStatus }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    console.log(`✅ Success: Status toggled from ${currentStatus} to ${newStatus ? "active" : "inactive"}`)
    
    // Restore original status
    await fetch(`${API_BASE_URL}/orgs/${orgId}/users/${testUserId}/status`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ isActive: currentStatus === "active" }),
    })
    
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

async function testUpdateRolePermissions() {
  console.log("\n🔐 Testing: Update Role Permissions")
  try {
    // Get roles
    const rolesResponse = await fetch(`${API_BASE_URL}/auth/roles`, {
      headers: getHeaders(),
    })
    const rolesData = await rolesResponse.json()
    const roles = rolesData.roles || []
    
    if (roles.length === 0) {
      console.log("⚠️  Skipped: No roles found")
      return true
    }

    // Find a non-default role, or use first role to test endpoint
    const testRole = roles.find(r => !r.isDefault) || roles[0]
    
    // Get permissions
    const permsResponse = await fetch(`${API_BASE_URL}/auth/permissions`, {
      headers: getHeaders(),
    })
    const permsData = await permsResponse.json()
    const permissions = permsData.permissions || []
    
    if (permissions.length === 0) {
      console.log("⚠️  Skipped: No permissions found")
      return true
    }

    // Use existing permissions (no change) - this tests the endpoint works
    const response = await fetch(`${API_BASE_URL}/auth/roles/${testRole.id}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        permissions: testRole.permissions,
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
      
      // If it's a default role and can't be modified, that's expected
      if (testRole.isDefault && (error.message?.includes("default") || response.status === 403)) {
        console.log(`✅ Success: Correctly prevented modifying default role (${testRole.name})`)
        return true
      }
      
      throw new Error(error.message || error.error?.message || `HTTP ${response.status}`)
    }

    console.log(`✅ Success: Role permissions endpoint works for ${testRole.name}`)
    return true
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`)
    return false
  }
}

// Main test runner
async function runTests() {
  console.log("=".repeat(60))
  console.log("🧪 USER MANAGEMENT COMPONENT - PRODUCTION TEST SUITE")
  console.log("=".repeat(60))

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  }

  // Login first
  if (!(await login())) {
    console.error("\n❌ Cannot proceed without authentication")
    process.exit(1)
  }

  // Ensure we have orgId before running tests
  if (!orgId) {
    console.log("\n⚠️  OrgId not found in login response, fetching from /auth/me...")
    try {
      const meResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: getHeaders(),
      })
      if (meResponse.ok) {
        const meData = await meResponse.json()
        orgId = meData.orgs?.[0]?.id || meData.orgId
        if (orgId) {
          console.log(`✅ Retrieved OrgId: ${orgId}`)
        } else {
          console.error("❌ No organization found for user")
          process.exit(1)
        }
      } else {
        console.error("❌ Failed to get user info")
        process.exit(1)
      }
    } catch (error) {
      console.error(`❌ Error getting orgId: ${error.message}`)
      process.exit(1)
    }
  }

  // Run all tests
  const tests = [
    { name: "Get Team Members", fn: testGetTeamMembers },
    { name: "Get Invitations", fn: testGetInvitations },
    { name: "Get Activity Log", fn: testGetActivityLog },
    { name: "Get Roles", fn: testGetRoles },
    { name: "Get Permissions", fn: testGetPermissions },
    { name: "Invite User", fn: testInviteUser },
    { name: "Update User Role", fn: testUpdateRole },
    { name: "Toggle User Status", fn: testToggleUserStatus },
    { name: "Update Role Permissions", fn: testUpdateRolePermissions },
  ]

  for (const test of tests) {
    try {
      const result = await test.fn()
      if (result === true) {
        results.passed++
      } else if (result === false) {
        results.failed++
      } else {
        results.skipped++
      }
    } catch (error) {
      console.error(`❌ Test "${test.name}" threw error:`, error.message)
      results.failed++
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60))
  console.log("📊 TEST SUMMARY")
  console.log("=".repeat(60))
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`⚠️  Skipped: ${results.skipped}`)
  console.log(`📈 Total: ${results.passed + results.failed + results.skipped}`)
  console.log("=".repeat(60))

  if (results.failed === 0) {
    console.log("\n🎉 All tests passed!")
    process.exit(0)
  } else {
    console.log("\n⚠️  Some tests failed. Please review the errors above.")
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  console.error("\n💥 Fatal error:", error)
  process.exit(1)
})

