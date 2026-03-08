const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';
const ORG_ID = 'your-org-id'; // You need to replace this or use one from your DB
const AUTH_TOKEN = 'your-auth-token'; // You need to replace this

async function testDataStatus() {
    try {
        const res = await axios.get(`${API_BASE_URL}/orgs/${ORG_ID}/data-status`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });
        console.log('Data Status Result:', JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error('Error testing data status:', err.response?.data || err.message);
    }
}

// testDataStatus(); 
