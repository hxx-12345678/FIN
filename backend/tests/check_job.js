
const axios = require('axios');

async function checkJob(jobId, token) {
    const BASE_URL = 'http://localhost:8000/api/v1';
    const headers = { Authorization: `Bearer ${token}` };
    const res = await axios.get(`${BASE_URL}/jobs/${jobId}`, { headers });
    console.log(JSON.stringify(res.data, null, 2));
}
// Get dummy credentials from my last test if I can
const token = 'USE_LAST_TOKEN';
const jobId = '67f4fced-46c6-4844-8b7f-61a'; // Partial ID from logs, need full one
