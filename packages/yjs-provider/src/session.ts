import type { JwtPayload } from "@dpe/proto";
import type { DocRole } from "@dpe/acl";

/** Authenticated peer state after AuthEnvelope (方案 §3.2). */
export interface PeerSession {
  nodeId: string;
  role: DocRole;
  publicKey: Uint8Array;
  keyVersion: number;
  jwt: string;
  payload: JwtPayload;
}

export interface LocalDocSession {
  nodeId: string;
  role: DocRole;
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  docKey: Uint8Array;
  keyVersion: number;
}
