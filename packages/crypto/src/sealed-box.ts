import {
  edwardsToMontgomeryPriv,
  edwardsToMontgomeryPub,
  x25519,
} from "@noble/curves/ed25519";
import { hkdf } from "@noble/hashes/hkdf";
import { sha256 } from "@noble/hashes/sha256";
import { randomBytes } from "@noble/hashes/utils";
import { aesGcmDecrypt, aesGcmEncrypt, generateNonce } from "./aes-gcm.js";
import { base64UrlToBytes, bytesToBase64Url } from "./encoding.js";

const EPHEMERAL_LENGTH = 32;
const HKDF_INFO = new TextEncoder().encode("dpe-doc-key-v1");

/**
 * Seal Key(doc) for recipient X25519 public key (Montgomery form of Ed25519 pk).
 * Wire format: base64url( ephemeral_pk(32) || aes_gcm_ciphertext ).
 */
export async function sealDocKey(
  recipientPublicKey: Uint8Array,
  docKey: Uint8Array,
): Promise<string> {
  const ephemeralPrivate = randomBytes(32);
  const ephemeralPublic = x25519.getPublicKey(ephemeralPrivate);
  const shared = x25519.getSharedSecret(ephemeralPrivate, recipientPublicKey);
  const aesKey = hkdf(sha256, shared, undefined, HKDF_INFO, 32);
  const nonce = generateNonce();
  const ciphertext = await aesGcmEncrypt(aesKey, nonce, docKey);
  const packed = new Uint8Array(EPHEMERAL_LENGTH + nonce.length + ciphertext.length);
  packed.set(ephemeralPublic, 0);
  packed.set(nonce, EPHEMERAL_LENGTH);
  packed.set(ciphertext, EPHEMERAL_LENGTH + nonce.length);
  return bytesToBase64Url(packed);
}

export async function openDocKey(
  recipientPrivateKey: Uint8Array,
  sealedBase64Url: string,
): Promise<Uint8Array> {
  const packed = base64UrlToBytes(sealedBase64Url);
  if (packed.length < EPHEMERAL_LENGTH + 12 + 16) {
    throw new Error("invalid sealed doc_key");
  }
  const ephemeralPublic = packed.subarray(0, EPHEMERAL_LENGTH);
  const nonce = packed.subarray(EPHEMERAL_LENGTH, EPHEMERAL_LENGTH + 12);
  const ciphertext = packed.subarray(EPHEMERAL_LENGTH + 12);
  const shared = x25519.getSharedSecret(recipientPrivateKey, ephemeralPublic);
  const aesKey = hkdf(sha256, shared, undefined, HKDF_INFO, 32);
  return aesGcmDecrypt(aesKey, nonce, ciphertext);
}

/** Map Ed25519 public key to X25519 Montgomery u-coordinate (standard conversion). */
export function ed25519PublicToX25519(edPublicKey: Uint8Array): Uint8Array {
  return edwardsToMontgomeryPub(edPublicKey);
}

export function ed25519PrivateToX25519(edPrivateKey: Uint8Array): Uint8Array {
  return edwardsToMontgomeryPriv(edPrivateKey);
}

export async function sealDocKeyForEd25519(
  recipientEdPublicKey: Uint8Array,
  docKey: Uint8Array,
): Promise<string> {
  return sealDocKey(ed25519PublicToX25519(recipientEdPublicKey), docKey);
}

export async function openDocKeyForEd25519(
  recipientEdPrivateKey: Uint8Array,
  sealedBase64Url: string,
): Promise<Uint8Array> {
  return openDocKey(ed25519PrivateToX25519(recipientEdPrivateKey), sealedBase64Url);
}
