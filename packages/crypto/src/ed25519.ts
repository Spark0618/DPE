import { ed25519 } from "./noble-ed25519.js";
import { bytesToBase64Url, base64UrlToBytes } from "./encoding.js";

export function sign(privateKey: Uint8Array, message: Uint8Array): Uint8Array {
  return ed25519.sign(message, privateKey);
}

export function verify(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): boolean {
  return ed25519.verify(signature, message, publicKey);
}

export async function signAsync(
  privateKey: Uint8Array,
  message: Uint8Array,
): Promise<Uint8Array> {
  return sign(privateKey, message);
}

export async function verifyAsync(
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): Promise<boolean> {
  return verify(publicKey, message, signature);
}

export function signBase64Url(privateKey: Uint8Array, message: Uint8Array): string {
  return bytesToBase64Url(sign(privateKey, message));
}

export function verifyBase64Url(
  publicKey: Uint8Array,
  message: Uint8Array,
  signatureBase64Url: string,
): boolean {
  return verify(publicKey, message, base64UrlToBytes(signatureBase64Url));
}
