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
  
  console.log('Testing Update Framework...')
  const res = await fetch(`${API_BASE_URL}/orgs/${orgId}/compliance/frameworks/soc2`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: "compliant",
      completed: 47,
      score: 100,
    })
  })
  const text = await res.text()
  console.log('Status:', res.status)
  console.log('Response:', text.substring(0, 1000))
}

test().catch(console.error)

