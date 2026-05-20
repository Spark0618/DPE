import {
  authEnvelopeSchema,
  type AuthEnvelope,
  type JwtPayload,
} from "@dpe/proto";
import {
  importPublicKeyBase64Url,
  verifyAuthProof,
  verifyJwt,
} from "@dpe/crypto";
import {
  type DataChannelLike,
  decodeChannelMessage,
} from "./channel.js";

export type AuthRejectReason =
  | "timeout"
  | "invalid_envelope"
  | "jwt_invalid"
  | "node_mismatch"
  | "proof_invalid"
  | "not_first_message";

export class AuthHandshakeError extends Error {
  constructor(
    readonly reason: AuthRejectReason,
    message?: string,
  ) {
    super(message ?? reason);
    this.name = "AuthHandshakeError";
  }
}

export interface AuthHandshakeConfig {
  /** Pinned Admin / issuer public key (base64url). */
  adminPublicKeyBase64Url: string;
  /** Expected JWT audience (group_id). */
  audience: string;
  /** Optional issuer (Admin NodeID) constraint. */
  issuer?: string;
  /** When set, require and verify AuthEnvelope.proof against this challenge. */
  challenge?: string;
  /** First-message wait timeout (ms). Default 15_000. */
  timeoutMs?: number;
}

export interface AuthenticatedPeer {
  nodeId: string;
  jwt: string;
  payload: JwtPayload;
  envelope: AuthEnvelope;
}

export async function validateAuthEnvelope(
  envelope: AuthEnvelope,
  config: AuthHandshakeConfig,
): Promise<AuthenticatedPeer> {
  const parsed = authEnvelopeSchema.parse(envelope);
  const adminPk = await importPublicKeyBase64Url(config.adminPublicKeyBase64Url);

  const payload = await verifyJwt(parsed.jwt, adminPk, {
    audience: config.audience,
    issuer: config.issuer,
  }).catch(() => {
    throw new AuthHandshakeError("jwt_invalid", "JWT verification failed");
  });

  if (payload.sub !== parsed.node_id) {
    throw new AuthHandshakeError(
      "node_mismatch",
      "JWT sub does not match envelope node_id",
    );
  }

  if (config.challenge) {
    throw new AuthHandshakeError(
      "proof_invalid",
      "challenge requires validateAuthEnvelopeWithPeerKey",
    );
  }

  return {
    nodeId: parsed.node_id,
    jwt: parsed.jwt,
    payload,
    envelope: parsed,
  };
}

export async function validateAuthEnvelopeWithPeerKey(
  envelope: AuthEnvelope,
  config: AuthHandshakeConfig & { peerPublicKeyBase64Url: string },
): Promise<AuthenticatedPeer> {
  const parsed = authEnvelopeSchema.parse(envelope);
  const adminPk = await importPublicKeyBase64Url(config.adminPublicKeyBase64Url);
  const peerPk = await importPublicKeyBase64Url(config.peerPublicKeyBase64Url);

  const payload = await verifyJwt(parsed.jwt, adminPk, {
    audience: config.audience,
    issuer: config.issuer,
  }).catch(() => {
    throw new AuthHandshakeError("jwt_invalid", "JWT verification failed");
  });

  if (payload.sub !== parsed.node_id) {
    throw new AuthHandshakeError("node_mismatch", "JWT sub mismatch");
  }

  if (config.challenge) {
    if (!parsed.proof) {
      throw new AuthHandshakeError("proof_invalid", "missing proof");
    }
    const ok = await verifyAuthProof(
      peerPk,
      parsed.jwt,
      config.challenge,
      parsed.proof,
    );
    if (!ok) {
      throw new AuthHandshakeError("proof_invalid", "proof verification failed");
    }
  }

  return {
    nodeId: parsed.node_id,
    jwt: parsed.jwt,
    payload,
    envelope: parsed,
  };
}

export function serializeAuthEnvelope(envelope: AuthEnvelope): string {
  return JSON.stringify(authEnvelopeSchema.parse(envelope));
}

/** Initiator: send AuthEnvelope as the first application message on an open channel. */
export function sendAuthEnvelope(
  channel: DataChannelLike,
  envelope: AuthEnvelope,
): void {
  if (channel.readyState !== "open") {
    throw new Error("channel not open");
  }
  channel.send(serializeAuthEnvelope(envelope));
}

/**
 * Responder: accept only the first message as AuthEnvelope; close channel on failure.
 */
export function acceptAuthEnvelope(
  channel: DataChannelLike,
  config: AuthHandshakeConfig & { peerPublicKeyBase64Url?: string },
): Promise<AuthenticatedPeer> {
  const timeoutMs = config.timeoutMs ?? 15_000;
  let settled = false;
  let first = true;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      channel.close();
      reject(new AuthHandshakeError("timeout"));
    }, timeoutMs);

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const priorOnMessage = channel.onmessage;
    channel.onmessage = async (raw) => {
      if (!first) {
        finish(() => {
          channel.close();
          reject(new AuthHandshakeError("not_first_message"));
        });
        return;
      }
      first = false;

      try {
        const text = decodeChannelMessage(raw);
        const json = JSON.parse(text) as unknown;
        const envelope = authEnvelopeSchema.parse(json);

        const peer =
          config.peerPublicKeyBase64Url != null
            ? await validateAuthEnvelopeWithPeerKey(envelope, {
                ...config,
                peerPublicKeyBase64Url: config.peerPublicKeyBase64Url,
              })
            : await validateAuthEnvelope(envelope, config);

        finish(() => {
          channel.onmessage = priorOnMessage;
          resolve(peer);
        });
      } catch (e) {
        finish(() => {
          channel.close();
          if (e instanceof AuthHandshakeError) reject(e);
          else if (e instanceof Error && e.name === "ZodError") {
            reject(new AuthHandshakeError("invalid_envelope", e.message));
          } else {
            reject(
              new AuthHandshakeError(
                "invalid_envelope",
                e instanceof Error ? e.message : String(e),
              ),
            );
          }
        });
      }
    };

    if (channel.readyState === "open") return;
    const priorOnOpen = channel.onopen;
    channel.onopen = () => {
      priorOnOpen?.();
    };
  });
}
