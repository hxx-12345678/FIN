const API_BASE_URL = "http://localhost:8000/api/v1"

async function test() {
  const login = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: 'cptjacksprw@gmail.com', password: 'Player@123'})
  })
  const {token} = await login.json()
  const me = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {Authorization: 'Bearer ' + token}
  })
  const {orgs} = await me.json()
  const orgId = orgs[0].id
  
  const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/organization`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Organization Updated',
      industry: 'fintech',
      companySize: '11-50',
      website: 'https://example.com',
      address: '123 Test St, Test City, TC 12345',
      taxId: 'TAX123456',
      currency: 'USD'
    })
  })
  const text = await res.text()
  console.log('Status:', res.status)
  console.log('Response:', text)
}

test().catch(console.error)

