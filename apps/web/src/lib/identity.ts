import {
  base64UrlToBytes,
  bytesToBase64Url,
  exportPublicKeyBase64Url,
  generateNodeKeyPair,
} from "@dpe/crypto";

const UID_KEY = "dpe_uid";
const SK_KEY = "dpe_sk";
const PK_KEY = "dpe_pk";
const DISPLAY_NAME_KEY = "dpe_display_name";

export interface StoredIdentity {
  nodeId: string;
  publicKeyBase64Url: string;
  displayName: string;
}

export function loadDisplayName(): string | null {
  const name = localStorage.getItem(DISPLAY_NAME_KEY)?.trim();
  return name && name.length > 0 ? name : null;
}

export function saveDisplayName(name: string): void {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 32) {
    throw new Error("用户名须为 1–32 个字符");
  }
  localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
}

export function hasUserProfile(): boolean {
  const nodeId = localStorage.getItem(UID_KEY);
  const sk = localStorage.getItem(SK_KEY);
  const pk = localStorage.getItem(PK_KEY);
  return Boolean(nodeId && sk && pk && loadDisplayName());
}

/** Keys only (before username step). */
export function loadIdentityKeys(): { nodeId: string; publicKeyBase64Url: string } | null {
  const nodeId = localStorage.getItem(UID_KEY);
  const sk = localStorage.getItem(SK_KEY);
  const pk = localStorage.getItem(PK_KEY);
  if (!nodeId || !sk || !pk) return null;
  return { nodeId, publicKeyBase64Url: pk };
}

export function loadIdentity(): StoredIdentity | null {
  const keys = loadIdentityKeys();
  const displayName = loadDisplayName();
  if (!keys || !displayName) return null;
  return { ...keys, displayName };
}

export async function createAndStoreIdentity(): Promise<{ nodeId: string; publicKeyBase64Url: string }> {
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
