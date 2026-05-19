import { ROLE } from "@dpe/shared";

/** Per-node role on a doc_id (0–3). */
export type DocRole = 0 | 1 | 2 | 3;

export interface AclGrant {
  nodeId: string;
  docId: string;
  role: DocRole;
}

/**
 * Monotonic law: p(child) <= p(parent) for each user.
 * `grants` must include parent and child entries for the same nodeId.
 */
export function assertMonotonicAcl(
  grants: AclGrant[],
  parentDocId: string,
  childDocId: string,
): void {
  const byDoc = new Map(grants.map((g) => [`${g.nodeId}:${g.docId}`, g.role]));
  const nodes = new Set(grants.map((g) => g.nodeId));
  for (const nodeId of nodes) {
    const parent = byDoc.get(`${nodeId}:${parentDocId}`);
    const child = byDoc.get(`${nodeId}:${childDocId}`);
    if (parent === undefined || child === undefined) continue;
    if (child > parent) {
      throw new Error(
        `ACL monotonic violation: node ${nodeId} child role ${child} > parent role ${parent}`,
      );
    }
  }
}

/** Merge policy: only role>=2 may apply content writes (方案 §3.5 step 4). */
export function canMergeContentWrite(peerRole: DocRole): boolean {
  return peerRole >= ROLE.WRITABLE;
}

/** Readonly may receive and decrypt; writable+ may produce merges. */
export function canReceiveUpdates(peerRole: DocRole): boolean {
  return peerRole >= ROLE.READONLY;
}
