/**
 * Redaction Utility for Security & Compliance
 * Strips sensitive fields from objects before logging or returning to client
 */

const SENSITIVE_KEYS = [
    'password',
    'passwordHash',
    'token',
    'refreshToken',
    'secret',
    'apiKey',
    'api_key',
    'access_token',
    'auth',
    'authorization',
    'creditCard',
    'cvv',
    'ssn'
];

/**
 * Deeply redacts an object based on sensitive keys
 */
export function redact(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(redact);
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()))) {
            redacted[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            redacted[key] = redact(value);
        } else {
            redacted[key] = value;
        }
    }

    return redacted;
}
