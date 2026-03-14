import axios from 'axios';
import { config } from '../config/env';

const PYTHON_WORKER_URL = process.env.WORKER_URL || process.env.PYTHON_WORKER_URL || 'http://localhost:5000';

/**
 * Worker Client Utility (SOC 2 Hardened)
 * All calls to the Python worker must go through this client
 * to ensure shared secret authentication.
 */
export const workerClient = axios.create({
    baseURL: PYTHON_WORKER_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-Worker-Secret': config.workerSecret
    },
    timeout: 30000 // 30s timeout for complex computations
});

// Add error interceptor for logging
workerClient.interceptors.response.use(
    response => response,
    error => {
        const errorData = {
            method: error.config?.method,
            url: error.config?.url,
            status: error.response?.status,
            message: error.message
        };
        console.error('[WorkerClient] Error calling Python worker:', errorData);
        return Promise.reject(error);
    }
);
