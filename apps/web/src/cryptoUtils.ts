/**
 * E2E Crypto utilities using Web Crypto API.
 * ECDH P-256, AES-GCM, ephemeral keys per message (forward secrecy).
 * Requires a secure context (HTTPS or http://localhost).
 */

function getCrypto(): Crypto {
  const c = typeof globalThis !== 'undefined' ? (globalThis as unknown as { crypto?: Crypto }).crypto : undefined;
  if (!c) throw new Error('Encryption not available. Use a modern browser.');
  return c;
}

function getSubtle(): SubtleCrypto {
  const c = getCrypto();
  if (!c.subtle) {
    throw new Error(
      'Encryption is only available over HTTPS or http://localhost. ' +
      'Open the app at http://localhost:3000 (or your dev server URL), not from a file or non-secure URL.'
    );
  }
  return c.subtle;
}

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let binary = '';
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary);
}

function b64decode(str: string): ArrayBuffer {
  const binary = atob(str);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
  return u8.buffer;
}

export const CryptoUtils = {
  IV_LEN: 12,

  async generateKeyPair(): Promise<CryptoKeyPair> {
    return getSubtle().generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits', 'deriveKey']
    ) as Promise<CryptoKeyPair>;
  },

  async exportPublicKeyBase64(publicKey: CryptoKey): Promise<string> {
    const buf = await getSubtle().exportKey('spki', publicKey);
    return b64encode(buf);
  },

  async importPublicKeyBase64(b64: string): Promise<CryptoKey> {
    const buf = b64decode(b64);
    return getSubtle().importKey(
      'spki',
      buf,
      { name: 'ECDH', namedCurve: 'P-256' },
      true, // extractable so we can export for fingerprint display
      []
    );
  },

  async getFingerprint(publicKey: CryptoKey): Promise<string> {
    const subtle = getSubtle();
    const buf = await subtle.exportKey('spki', publicKey);
    const hash = await subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 32).toUpperCase();
  },

  async deriveSharedAesKey(
    privateKey: CryptoKey,
    remotePublicKey: CryptoKey
  ): Promise<CryptoKey> {
    const subtle = getSubtle();
    const rawBits = await subtle.deriveBits(
      { name: 'ECDH', public: remotePublicKey },
      privateKey,
      256
    );
    const hash = await subtle.digest('SHA-256', rawBits);
    return subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  async encryptWithEphemeral(
    plaintext: string,
    recipientLongTermPublicKey: CryptoKey
  ): Promise<{ ephemeralPublicKey: string; ciphertext: string; iv: string }> {
    const subtle = getSubtle();
    const ephemeralPair = await this.generateKeyPair();
    const rawBits = await subtle.deriveBits(
      { name: 'ECDH', public: recipientLongTermPublicKey },
      ephemeralPair.privateKey!,
      256
    );
    const hash = await subtle.digest('SHA-256', rawBits);
    const key = await subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const iv = getCrypto().getRandomValues(new Uint8Array(this.IV_LEN));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      encoded
    );
    const ephemeralPublicB64 = await this.exportPublicKeyBase64(ephemeralPair.publicKey!);
    return {
      ephemeralPublicKey: ephemeralPublicB64,
      ciphertext: b64encode(new Uint8Array(ciphertext)),
      iv: b64encode(iv),
    };
  },

  async decryptWithEphemeral(
    ciphertextB64: string,
    ivB64: string,
    ephemeralPublicKeyB64: string,
    myLongTermPrivateKey: CryptoKey
  ): Promise<string> {
    const subtle = getSubtle();
    const ephemeralPublic = await this.importPublicKeyBase64(ephemeralPublicKeyB64);
    const rawBits = await subtle.deriveBits(
      { name: 'ECDH', public: ephemeralPublic },
      myLongTermPrivateKey,
      256
    );
    const hash = await subtle.digest('SHA-256', rawBits);
    const key = await subtle.importKey(
      'raw',
      hash,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    const ciphertext = b64decode(ciphertextB64);
    const iv = b64decode(ivB64);
    const decrypted = await subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  },

  async decrypt(
    ciphertextB64: string,
    ivB64: string,
    key: CryptoKey
  ): Promise<string> {
    const ciphertext = b64decode(ciphertextB64);
    const iv = b64decode(ivB64);
    const decrypted = await getSubtle().decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  },
};
