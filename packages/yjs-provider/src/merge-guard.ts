import type { SignedUpdate } from "@dpe/proto";
import {
  ReplayCache,
  verifyAndDecryptSignedUpdate,
  verifySignedUpdateSignature,
} from "@dpe/crypto";
import { canMergeContentWrite, canReceiveUpdates, type DocRole } from "@dpe/acl";
import type { LocalDocSession, PeerSession } from "./session.js";

export type MergeRejectReason =
  | "unknown_peer"
  | "role_cannot_receive"
  | "role_cannot_write"
  | "key_version"
  | "invalid_signature"
  | "signer_mismatch"
  | "replay"
  | "decrypt_failed";

export class MergeRejectedError extends Error {
  constructor(readonly reason: MergeRejectReason, message?: string) {
    super(message ?? reason);
    this.name = "MergeRejectedError";
  }
}

export interface MergeContext {
  local: LocalDocSession;
  peers: Map<string, PeerSession>;
  replay: ReplayCache;
  docId: string;
}

/**
 * §3.5 merge前校验 — returns plaintext Yjs update or throws MergeRejectedError.
 */
export async function validateAndDecryptIncoming(
  ctx: MergeContext,
  update: SignedUpdate,
): Promise<Uint8Array> {
  const parsed = update;
  if (parsed.doc_id !== ctx.docId) {
    throw new MergeRejectedError("key_version", "doc_id mismatch");
  }

  const peer = ctx.peers.get(parsed.signer_node_id);
  if (!peer) {
    throw new MergeRejectedError("unknown_peer");
  }

  if (!canReceiveUpdates(peer.role)) {
    throw new MergeRejectedError("role_cannot_receive");
  }

  if (peer.payload.sub !== parsed.signer_node_id) {
    throw new MergeRejectedError("signer_mismatch");
  }

  if (parsed.key_version !== ctx.local.keyVersion) {
    throw new MergeRejectedError("key_version");
  }

  const sigOk = await verifySignedUpdateSignature(parsed, peer.publicKey);
  if (!sigOk) {
    throw new MergeRejectedError("invalid_signature");
  }

  if (!canMergeContentWrite(peer.role)) {
    throw new MergeRejectedError("role_cannot_write");
  }

  if (!ctx.replay.checkAndAdd(parsed.signer_node_id, parsed.doc_id, parsed.seq)) {
    throw new MergeRejectedError("replay");
  }

  try {
    return await verifyAndDecryptSignedUpdate({
      update: parsed,
      docKey: ctx.local.docKey,
      signerPublicKey: peer.publicKey,
      expectedKeyVersion: ctx.local.keyVersion,
    });
  } catch {
    throw new MergeRejectedError("decrypt_failed");
  }
}
