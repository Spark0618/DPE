import {
  base64UrlToBytes,
  bytesToBase64Url,
  exportPublicKeyBase64Url,
  generateNodeKeyPair,
} from "@dpe/crypto";

const UID_KEY = "dpe_uid";
const SK_KEY = "dpe_sk";
const PK_KEY = "dpe_pk";

export interface StoredIdentity {
  nodeId: string;
  publicKeyBase64Url: string;
}

export function loadIdentity(): StoredIdentity | null {
  const nodeId = localStorage.getItem(UID_KEY);
  const sk = localStorage.getItem(SK_KEY);
  const pk = localStorage.getItem(PK_KEY);
  if (!nodeId || !sk || !pk) return null;
  return { nodeId, publicKeyBase64Url: pk };
}

export async function createAndStoreIdentity(): Promise<StoredIdentity> {
  const pair = await generateNodeKeyPair();
  const publicKeyBase64Url = exportPublicKeyBase64Url(pair.publicKey);
  localStorage.setItem(UID_KEY, pair.nodeId);
  localStorage.setItem(SK_KEY, bytesToBase64Url(pair.privateKey));
  localStorage.setItem(PK_KEY, publicKeyBase64Url);
  return { nodeId: pair.nodeId, publicKeyBase64Url };
}

export function loadPrivateKey(): Uint8Array | null {
  const sk = localStorage.getItem(SK_KEY);
  return sk ? base64UrlToBytes(sk) : null;
}
