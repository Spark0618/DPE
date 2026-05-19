import { randomBytes } from "@noble/hashes/utils";
import { bytesToBase64Url, base64UrlToBytes } from "./encoding.js";

const NONCE_LENGTH = 12;
const KEY_LENGTH = 32;

export function generateDocKey(): Uint8Array {
  return randomBytes(KEY_LENGTH);
}

export function generateNonce(): Uint8Array {
  return randomBytes(NONCE_LENGTH);
}

function asBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", asBufferSource(raw), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function aesGcmEncrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  if (key.length !== KEY_LENGTH) throw new Error("AES-256-GCM requires 32-byte key");
  if (nonce.length !== NONCE_LENGTH) throw new Error("AES-GCM requires 12-byte nonce");
  const cryptoKey = await importAesKey(key);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(nonce) },
    cryptoKey,
    asBufferSource(plaintext),
  );
  return new Uint8Array(ct);
}

export async function aesGcmDecrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await importAesKey(key);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBufferSource(nonce) },
    cryptoKey,
    asBufferSource(ciphertext),
  );
  return new Uint8Array(pt);
}

export async function encryptToBase64Url(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array,
): Promise<string> {
  return bytesToBase64Url(await aesGcmEncrypt(key, nonce, plaintext));
}

export async function decryptFromBase64Url(
  key: Uint8Array,
  nonceBase64Url: string,
  ciphertextBase64Url: string,
): Promise<Uint8Array> {
  return aesGcmDecrypt(key, base64UrlToBytes(nonceBase64Url), base64UrlToBytes(ciphertextBase64Url));
}
