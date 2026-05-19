import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { ed25519 } from "./noble-ed25519.js";
import { base64UrlToBytes, bytesToBase64Url } from "./encoding.js";

export interface NodeKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  nodeId: string;
}

/** NodeID = hex(SHA-256(publicKey)) per 方案 §3.1 */
export function deriveNodeId(publicKey: Uint8Array): string {
  return bytesToHex(sha256(publicKey));
}

export async function generateNodeKeyPair(): Promise<NodeKeyPair> {
  const privateKey = ed25519.utils.randomPrivateKey();
  const publicKey = ed25519.getPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    nodeId: deriveNodeId(publicKey),
  };
}

export function exportPublicKeyBase64Url(publicKey: Uint8Array): string {
  return bytesToBase64Url(publicKey);
}

export function importPublicKeyBase64Url(value: string): Uint8Array {
  return base64UrlToBytes(value);
}
