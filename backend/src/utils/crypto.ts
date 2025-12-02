import crypto from 'crypto';
import { config } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || config.jwtSecret;
  if (!key || key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  // Use first 32 bytes of key
  return Buffer.from(key.substring(0, 32), 'utf-8');
}

export const encrypt = (text: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(salt);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted
    return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
};

export const decrypt = (encryptedData: string): string => {
  try {
    const key = getEncryptionKey();
    const data = Buffer.from(encryptedData, 'base64');

    const salt = data.subarray(0, SALT_LENGTH);
    const iv = data.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = data.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = data.subarray(ENCRYPTED_POSITION);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(salt);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
};

