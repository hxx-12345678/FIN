"""
Crypto helpers (Python worker)

Must match backend `backend/src/utils/crypto.ts`:
- AES-256-GCM
- payload layout: salt(64) + iv(16) + tag(16) + ciphertext
- AAD = salt
"""

import os
import base64
from typing import Union

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SALT_LENGTH = 64
IV_LENGTH = 16
TAG_LENGTH = 16
TAG_POSITION = SALT_LENGTH + IV_LENGTH
ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH


def _get_key() -> bytes:
    key = os.getenv("ENCRYPTION_KEY") or os.getenv("JWT_SECRET")
    if not key or len(key) < 32:
        raise ValueError("ENCRYPTION_KEY must be at least 32 characters (must match backend)")
    return key[:32].encode("utf-8")


def decrypt_bytes(encrypted: Union[bytes, bytearray, memoryview, str]) -> str:
    """
    Decrypt connector.encrypted_config (BYTEA) or base64 string.
    Returns utf-8 plaintext.
    """
    if isinstance(encrypted, str):
        data = base64.b64decode(encrypted)
    else:
        # BYTEA typically comes as memoryview from psycopg2
        data = bytes(encrypted)

    if len(data) < ENCRYPTED_POSITION:
        raise ValueError("Encrypted payload too short")

    salt = data[:SALT_LENGTH]
    iv = data[SALT_LENGTH:TAG_POSITION]
    tag = data[TAG_POSITION:ENCRYPTED_POSITION]
    ciphertext = data[ENCRYPTED_POSITION:]

    aesgcm = AESGCM(_get_key())
    # cryptography AESGCM expects ciphertext||tag
    pt = aesgcm.decrypt(iv, ciphertext + tag, salt)
    return pt.decode("utf-8")



