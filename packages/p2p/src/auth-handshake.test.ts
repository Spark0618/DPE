import { describe, expect, it } from "vitest";
import {
  createAuthProof,
  generateNodeKeyPair,
  sealDocKey,
  signJwt,
  bytesToBase64Url,
} from "@dpe/crypto";
import type { AuthEnvelope } from "@dpe/proto";
import type { DataChannelLike } from "./channel.js";
import {
  acceptAuthEnvelope,
  AuthHandshakeError,
  sendAuthEnvelope,
  validateAuthEnvelopeWithPeerKey,
} from "./auth-handshake.js";

function toText(data: string | ArrayBuffer | Uint8Array): string {
  if (typeof data === "string") return data;
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  return new TextDecoder().decode(buf);
}

function createLinkedChannels(): [DataChannelLike, DataChannelLike] {
  const pair: DataChannelLike[] = [];
  const mk = (): DataChannelLike => {
    const ch: DataChannelLike = {
      readyState: "open",
      onopen: null,
      onmessage: null,
      onclose: null,
      send(data) {
        const peer = pair.find((c) => c !== ch);
        peer?.onmessage?.(toText(data));
      },
      close() {
        ch.readyState = "closed";
        ch.onclose?.();
      },
    };
    pair.push(ch);
    return ch;
  };
  return [mk(), mk()];
}

describe("AuthEnvelope handshake", () => {
  it("accepts valid first-message auth", async () => {
    const admin = await generateNodeKeyPair();
    const peer = await generateNodeKeyPair();
    const groupId = "group-test-1";
    const docKey = new Uint8Array(32).fill(7);
    const sealed = await sealDocKey(peer.publicKey, docKey);
    const jwt = await signJwt(
      {
        iss: admin.nodeId,
        sub: peer.nodeId,
        aud: groupId,
        doc_id: "root",
        role: 2,
        doc_key: sealed,
        key_version: 1,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: crypto.randomUUID(),
      },
      admin.privateKey,
      admin.publicKey,
    );

    const [initiator, responder] = createLinkedChannels();
    const challenge = "room-challenge-abc";
    const proof = createAuthProof(peer.privateKey, jwt, challenge);
    const envelope: AuthEnvelope = {
      type: "auth",
      node_id: peer.nodeId,
      jwt,
      proof,
    };

    const accepted = acceptAuthEnvelope(responder, {
      adminPublicKeyBase64Url: bytesToBase64Url(admin.publicKey),
      audience: groupId,
      issuer: admin.nodeId,
      challenge,
      peerPublicKeyBase64Url: bytesToBase64Url(peer.publicKey),
    });

    sendAuthEnvelope(initiator, envelope);
    const session = await accepted;
    expect(session.nodeId).toBe(peer.nodeId);
    expect(session.payload.role).toBe(2);
  });

  it("rejects JWT for wrong audience", async () => {
    const admin = await generateNodeKeyPair();
    const peer = await generateNodeKeyPair();
    const jwt = await signJwt(
      {
        iss: admin.nodeId,
        sub: peer.nodeId,
        aud: "other-group",
        doc_id: "root",
        role: 2,
        doc_key: "x",
        key_version: 1,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        jti: crypto.randomUUID(),
      },
      admin.privateKey,
      admin.publicKey,
    );

    await expect(
      validateAuthEnvelopeWithPeerKey(
        { type: "auth", node_id: peer.nodeId, jwt },
        {
          adminPublicKeyBase64Url: bytesToBase64Url(admin.publicKey),
          audience: "expected-group",
          peerPublicKeyBase64Url: bytesToBase64Url(peer.publicKey),
        },
      ),
    ).rejects.toBeInstanceOf(AuthHandshakeError);
  });
});
