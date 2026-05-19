import { describe, expect, it } from "vitest";
import {
  generateNodeKeyPair,
  deriveNodeId,
  signJwt,
  verifyJwt,
  generateDocKey,
  sealDocKeyForEd25519,
  openDocKeyForEd25519,
  createSignedUpdate,
  verifyAndDecryptSignedUpdate,
  ReplayCache,
} from "./index.js";

describe("@dpe/crypto", () => {
  it("derives stable node id from public key", async () => {
    const a = await generateNodeKeyPair();
    const b = await generateNodeKeyPair();
    expect(a.nodeId).toHaveLength(64);
    expect(deriveNodeId(a.publicKey)).toBe(a.nodeId);
    expect(a.nodeId).not.toBe(b.nodeId);
  });

  it("signs and verifies JWT (EdDSA)", async () => {
    const admin = await generateNodeKeyPair();
    const user = await generateNodeKeyPair();
    const docKey = generateDocKey();
    const sealed = await sealDocKeyForEd25519(user.publicKey, docKey);
    const now = Math.floor(Date.now() / 1000);
    const token = await signJwt(
      {
        iss: admin.nodeId,
        sub: user.nodeId,
        aud: "group-test",
        doc_id: "doc-1",
        role: 2,
        doc_key: sealed,
        key_version: 1,
        iat: now,
        exp: now + 3600,
        jti: crypto.randomUUID(),
      },
      admin.privateKey,
      admin.publicKey,
    );
    const payload = await verifyJwt(token, admin.publicKey, {
      audience: "group-test",
      issuer: admin.nodeId,
    });
    expect(payload.sub).toBe(user.nodeId);
    const opened = await openDocKeyForEd25519(user.privateKey, payload.doc_key);
    expect(opened).toEqual(docKey);
  });

  it("creates and verifies signed update", async () => {
    const signer = await generateNodeKeyPair();
    const docKey = generateDocKey();
    const plaintext = new TextEncoder().encode("yjs-update-bytes");
    const update = await createSignedUpdate({
      docId: "doc-1",
      keyVersion: 1,
      docKey,
      plaintext,
      signerPrivateKey: signer.privateKey,
      signerNodeId: signer.nodeId,
      seq: 1n,
    });
    const decrypted = await verifyAndDecryptSignedUpdate({
      update,
      docKey,
      signerPublicKey: signer.publicKey,
      expectedKeyVersion: 1,
    });
    expect(decrypted).toEqual(plaintext);
  });

  it("replay cache rejects duplicate seq", () => {
    const cache = new ReplayCache();
    expect(cache.checkAndAdd("n1", "d1", 1)).toBe(true);
    expect(cache.checkAndAdd("n1", "d1", 1)).toBe(false);
    expect(cache.checkAndAdd("n1", "d1", 2)).toBe(true);
  });
});
