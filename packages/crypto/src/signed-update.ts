import type { SignedUpdate, SignedUpdatePayload } from "@dpe/proto";
import { signedUpdateSchema } from "@dpe/proto";
import { aesGcmDecrypt, aesGcmEncrypt, generateNonce } from "./aes-gcm.js";
import { bytesToBase64Url, base64UrlToBytes, utf8ToBytes } from "./encoding.js";
import { signBase64Url, verifyBase64Url } from "./ed25519.js";
import { importPublicKeyBase64Url } from "./node-identity.js";

/** Canonical signing input per 方案 §3.5 (field order fixed). */
export function canonicalSignedUpdateBytes(payload: SignedUpdatePayload): Uint8Array {
  const seq = typeof payload.seq === "bigint" ? payload.seq.toString() : String(payload.seq);
  const line = [
    payload.doc_id,
    String(payload.key_version),
    payload.nonce,
    payload.ciphertext,
    payload.signer_node_id,
    seq,
  ].join("|");
  return utf8ToBytes(line);
}

export async function createSignedUpdate(params: {
  docId: string;
  keyVersion: number;
  docKey: Uint8Array;
  plaintext: Uint8Array;
  signerPrivateKey: Uint8Array;
  signerNodeId: string;
  seq: number | bigint;
}): Promise<SignedUpdate> {
  const nonce = generateNonce();
  const ciphertext = await aesGcmEncrypt(params.docKey, nonce, params.plaintext);
  const payload: SignedUpdatePayload = {
    doc_id: params.docId,
    key_version: params.keyVersion,
    nonce: bytesToBase64Url(nonce),
    ciphertext: bytesToBase64Url(ciphertext),
    signer_node_id: params.signerNodeId,
    seq: params.seq,
  };
  const sig = await signBase64Url(
    params.signerPrivateKey,
    canonicalSignedUpdateBytes(payload),
  );
  return signedUpdateSchema.parse({ ...payload, sig });
}

export async function verifySignedUpdateSignature(
  update: SignedUpdate,
  signerPublicKey: Uint8Array,
): Promise<boolean> {
  const { sig, ...payload } = update;
  return verifyBase64Url(signerPublicKey, canonicalSignedUpdateBytes(payload), sig);
}

export async function decryptSignedUpdate(
  update: SignedUpdate,
  docKey: Uint8Array,
): Promise<Uint8Array> {
  return aesGcmDecrypt(
    docKey,
    base64UrlToBytes(update.nonce),
    base64UrlToBytes(update.ciphertext),
  );
}

export async function verifyAndDecryptSignedUpdate(params: {
  update: SignedUpdate;
  docKey: Uint8Array;
  signerPublicKey: Uint8Array;
  expectedKeyVersion: number;
}): Promise<Uint8Array> {
  const parsed = signedUpdateSchema.parse(params.update);
  if (parsed.key_version !== params.expectedKeyVersion) {
    throw new Error("key_version mismatch");
  }
  const ok = await verifySignedUpdateSignature(parsed, params.signerPublicKey);
  if (!ok) throw new Error("invalid signature");
  return decryptSignedUpdate(parsed, params.docKey);
}

export function createAuthProof(
  privateKey: Uint8Array,
  jwt: string,
  challenge: string,
): string {
  const message = utf8ToBytes(`${jwt}||${challenge}`);
  return signBase64Url(privateKey, message);
}

export async function verifyAuthProof(
  publicKey: Uint8Array,
  jwt: string,
  challenge: string,
  proofBase64Url: string,
): Promise<boolean> {
  const message = utf8ToBytes(`${jwt}||${challenge}`);
  return verifyBase64Url(publicKey, message, proofBase64Url);
}

export { importPublicKeyBase64Url };
