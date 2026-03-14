"""
Crypto helpers (Python worker)

Must match backend `backend/src/utils/crypto.ts`:
- AES-256-GCM
- payload layout: salt(64) + iv(16) + tag(16) + ciphertext
- AAD = salt
"""

import os
import base64
import json
from typing import Union
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SALT_LENGTH = 64
IV_LENGTH = 16
TAG_LENGTH = 16
TAG_POSITION = SALT_LENGTH + IV_LENGTH
ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

def _get_key() -> bytes:
    raw_key = os.getenv("ENCRYPTION_KEY") or os.getenv("JWT_SECRET")
    if not raw_key or len(str(raw_key)) < 32:
        raise ValueError("ENCRYPTION_KEY must be at least 32 characters (must match backend)")
    
    # Cast to string and take first 32 bytes to match backend behavior
    key_str: str = str(raw_key)[:32]
    return key_str.encode("utf-8")

def encrypt(text: str) -> bytes:
    """
    Encrypt text using AES-256-GCM.
    Returns raw bytes payload: salt(64) + iv(16) + tag(16) + ciphertext
    """
    key_bytes = _get_key()
    aesgcm = AESGCM(key_bytes)
    
    salt = os.urandom(SALT_LENGTH)
    iv = os.urandom(IV_LENGTH)
    
    # Encrypt
    data = text.encode("utf-8")
    # cryptography library returns ciphertext + tag
    ciphertext_with_tag = aesgcm.encrypt(iv, data, salt)
    
    # Split tag from end (cryptography returns tag at the end of ciphertext)
    tag = ciphertext_with_tag[-TAG_LENGTH:]
    ciphertext = ciphertext_with_tag[:-TAG_LENGTH]
    
    # Combine according to our custom layout: salt + iv + tag + ciphertext
    payload = salt + iv + tag + ciphertext
    return payload

def decrypt(encrypted: Union[bytes, bytearray, memoryview, str]) -> str:
    """
    Decrypt payload (base64 or bytes).
    Expects: salt(64) + iv(16) + tag(16) + ciphertext
    """
    if isinstance(encrypted, str):
        data = base64.b64decode(encrypted)
    else:
        # Handle memoryview or bytes
        data: bytes = bytes(encrypted)
        
        # If the data length is much longer than expected and looks like base64, try decoding
        if len(data) > ENCRYPTED_POSITION and b'=' in data[-4:]:
            try:
                data = base64.b64decode(data)
            except Exception:
                pass

    if len(data) < ENCRYPTED_POSITION:
        raise ValueError(f"Encrypted payload too short (len={len(data)}, expected at least {ENCRYPTED_POSITION})")

    salt = data[:SALT_LENGTH]
    iv = data[SALT_LENGTH:TAG_POSITION]
    tag = data[TAG_POSITION:ENCRYPTED_POSITION]
    ciphertext = data[ENCRYPTED_POSITION:]

    aesgcm = AESGCM(_get_key())
    # cryptography AESGCM expects ciphertext + tag
    plaintext = aesgcm.decrypt(iv, ciphertext + tag, salt)
    return plaintext.decode("utf-8")



