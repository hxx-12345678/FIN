/**
 * Debug Settings Test - Shows actual error messages
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
      throw new Error(errorText || `HTTP ${response.status}`)
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
    console.error(`❌ Login failed: ${error.message}`)
    return false
  }
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authToken}`,
  }
}

async function testEndpoint(name, method, url, body = null) {
  try {
    const options = {
      method,
      headers: getHeaders(),
    }
    if (body) {
      options.body = JSON.stringify(body)
    }
    
    const response = await fetch(url, options)
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
    
    if (response.ok) {
      console.log(`✅ ${name}: Success`)
      if (data.data) {
        console.log(`   Data keys: ${Object.keys(data.data).join(", ")}`)
      }
      return { success: true, data }
    } else {
      console.log(`❌ ${name}: HTTP ${response.status}`)
      console.log(`   Error: ${JSON.stringify(data, null, 2).substring(0, 500)}`)
      return { success: false, error: data, status: response.status }
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runDebugTests() {
  console.log("=".repeat(60))
  console.log("🔍 DEBUG SETTINGS TESTS")
  console.log("=".repeat(60))
  
  if (!(await login())) {
    console.error("\n❌ Cannot proceed without authentication")
    process.exit(1)
  }

  if (!orgId) {
    console.error("\n❌ No organization ID available")
    process.exit(1)
  }

  console.log(`\nTesting with orgId: ${orgId}`)
  
  // Test critical endpoints
  await testEndpoint("Get Profile", "GET", `${API_BASE_URL}/users/profile`)
  await testEndpoint("Get Organization", "GET", `${API_BASE_URL}/orgs/${orgId}/organization`)
  await testEndpoint("Get Localization", "GET", `${API_BASE_URL}/orgs/${orgId}/localization`)
  await testEndpoint("Get Appearance", "GET", `${API_BASE_URL}/users/appearance`)
  await testEndpoint("Update FX Rates", "POST", `${API_BASE_URL}/orgs/${orgId}/localization/fx-rates/update`, { baseCurrency: "USD" })
  
  console.log("\n" + "=".repeat(60))
  console.log("Debug complete")
  console.log("=".repeat(60))
}

runDebugTests().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

