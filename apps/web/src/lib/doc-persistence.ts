import * as Y from "yjs";
import { bytesToBase64Url, base64UrlToBytes } from "@dpe/crypto";

/** Origin used when rehydrating from storage so provider does not re-broadcast. */
export function applyPersistedDocState(
  doc: Y.Doc,
  stateUpdate: Uint8Array,
  origin: symbol,
): void {
  if (stateUpdate.length === 0) return;
  Y.applyUpdate(doc, stateUpdate, origin);
}

export function encodeDocState(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function loadDocStateFromLocalStorage(key: string): Uint8Array | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return Uint8Array.from(parsed as number[]);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function saveDocStateToLocalStorage(key: string, doc: Y.Doc): void {
  const state = encodeDocState(doc);
  localStorage.setItem(key, JSON.stringify([...state]));
}

export function docStateToBase64Url(state: Uint8Array): string {
  return bytesToBase64Url(state);
}

export function docStateFromBase64Url(encoded: string): Uint8Array {
  return base64UrlToBytes(encoded);
}
