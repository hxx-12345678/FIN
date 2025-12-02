import { ValidationError } from './errors';

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required and must be a string');
  }

  // Trim and normalize
  const normalizedEmail = email.trim().toLowerCase();

  // Check email length (max 254 characters per RFC 5321)
  if (normalizedEmail.length > 254) {
    throw new ValidationError('Email address is too long (max 254 characters)');
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new ValidationError('Invalid email format');
  }

  // Check for obvious SQL injection patterns (only dangerous ones)
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/i,
    /(--)|(\/\*)|(\*\/)/,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalizedEmail)) {
      throw new ValidationError('Invalid email format');
    }
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required and must be a string');
  }

  // Minimum length check
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  // Maximum length check (prevent DoS attacks)
  if (password.length > 128) {
    throw new ValidationError('Password is too long (max 128 characters)');
  }

  // Optional: Check for common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    throw new ValidationError('Password is too common. Please choose a stronger password');
  }
}

/**
 * Sanitize string input to prevent XSS and SQL injection
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');

  return sanitized;
}

/**
 * Validate organization name
 */
export function validateOrgName(orgName: string): void {
  if (!orgName || typeof orgName !== 'string') {
    throw new ValidationError('Organization name is required and must be a string');
  }

  const sanitized = orgName.trim();
  if (sanitized.length === 0) {
    throw new ValidationError('Organization name cannot be empty');
  }

  if (sanitized.length > 255) {
    throw new ValidationError('Organization name is too long (max 255 characters)');
  }
}

/**
 * Validate UUID format
 * @param id - The ID to validate
 * @param fieldName - Name of the field for error messages
 * @throws ValidationError if ID is not a valid UUID
 */
export function validateUUID(id: string, fieldName: string = 'ID'): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError(`${fieldName} is required and must be a string`);
  }

  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    throw new ValidationError(`${fieldName} must be a valid UUID format`);
  }
}

