import axios from 'axios';

async function testAccessRequests() {
    try {
        const loginRes = await axios.post('http://localhost:8000/api/v1/auth/login', {
            email: 'cptjacksprw@gmail.com',
            password: 'Player@123'
        });

        const token = loginRes.data.token;
        const orgId = loginRes.data.user.roles[0].orgId;

        console.log(`Logged in successfully. OrgId: ${orgId}`);

        const reqRes = await axios.get(`http://localhost:8000/api/v1/orgs/${orgId}/access-requests`, {
            headers: {
                Cookie: `auth-token=${token}`
            }
        });

        console.log('Access Requests Response:');
        console.log(JSON.stringify(reqRes.data, null, 2));
    } catch (error: any) {
        if (error.response) {
            console.error('Error Response:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testAccessRequests();
