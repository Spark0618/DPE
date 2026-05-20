import { ROLE } from "@dpe/shared";

/** Per-node role on a doc_id (0–3). */
export type DocRole = 0 | 1 | 2 | 3;

export interface AclGrant {
  nodeId: string;
  docId: string;
  role: DocRole;
}

/** Merge policy: only role>=2 may apply content writes (方案 §3.5 step 4). */
export function canMergeContentWrite(peerRole: DocRole): boolean {
  return peerRole >= ROLE.WRITABLE;
}

/** Readonly may receive and decrypt; writable+ may produce merges. */
export function canReceiveUpdates(peerRole: DocRole): boolean {
  return peerRole >= ROLE.READONLY;
}
