/**
 * End-to-end encryption via ECDH key exchange + AES-GCM.
 * Keys are ephemeral per-session and never leave the browser.
 */

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptionSession {
  keyPair: KeyPair;
  sharedKey: CryptoKey | null;
  publicKeyB64: string;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  return { publicKey: pair.publicKey, privateKey: pair.privateKey };
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(raw))));
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw", raw, { name: "ECDH", namedCurve: "P-256" }, true, []
  );
}

export async function deriveSharedKey(privateKey: CryptoKey, peerPublicKey: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptChunk(key: CryptoKey, data: ArrayBuffer): Promise<{ iv: Uint8Array; ciphertext: ArrayBuffer }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { iv, ciphertext };
}

export async function decryptChunk(key: CryptoKey, iv: Uint8Array, ciphertext: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv } as unknown as AlgorithmIdentifier, key, ciphertext) as Promise<ArrayBuffer>;
}

/** Packs IV + ciphertext into a single ArrayBuffer for transmission */
export function packEncrypted(iv: Uint8Array, ciphertext: ArrayBuffer): ArrayBuffer {
  const buf = new ArrayBuffer(12 + ciphertext.byteLength);
  const view = new Uint8Array(buf);
  view.set(iv, 0);
  view.set(new Uint8Array(ciphertext), 12);
  return buf;
}

/** Unpacks IV + ciphertext from a single ArrayBuffer */
export function unpackEncrypted(data: ArrayBuffer): { iv: Uint8Array; ciphertext: ArrayBuffer } {
  const view = new Uint8Array(data);
  return { iv: view.slice(0, 12), ciphertext: data.slice(12) };
}
