/**
 * UUID validation utility
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  return UUID_REGEX.test(uuid);
}

/**
 * Validate an array of UUIDs
 */
export function validateUUIDs(uuids: string[]): void {
  if (!Array.isArray(uuids)) {
    throw new Error('Expected an array of UUIDs');
  }
  
  for (const uuid of uuids) {
    if (!isValidUUID(uuid)) {
      throw new Error(`Invalid UUID format: ${uuid}`);
    }
  }
}

