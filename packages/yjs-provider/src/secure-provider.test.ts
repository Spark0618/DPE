import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { generateNodeKeyPair, createSignedUpdate } from "@dpe/crypto";
import type { JwtPayload } from "@dpe/proto";
import { SecureYjsProvider } from "./secure-provider.js";
import type { PeerSession } from "./session.js";

function mockJwt(sub: string, role: number): JwtPayload {
  return {
    iss: "admin",
    sub,
    aud: "group-1",
    doc_id: "doc-1",
    role,
    doc_key: "sealed",
    key_version: 1,
    iat: 1,
    exp: 9_999_999_999,
    jti: "test-jti",
  };
}

function peerSession(
  keys: Awaited<ReturnType<typeof generateNodeKeyPair>>,
  role: 0 | 1 | 2 | 3,
): PeerSession {
  return {
    nodeId: keys.nodeId,
    role,
    publicKey: keys.publicKey,
    keyVersion: 1,
    jwt: "jwt-stub",
    payload: mockJwt(keys.nodeId, role),
  };
}

async function syncBoth(a: SecureYjsProvider, b: SecureYjsProvider): Promise<void> {
  await a.whenIdle();
  await b.whenIdle();
}

describe("@dpe/yjs-provider", () => {
  it("syncs Yjs state between two writable peers", async () => {
    const docKey = new Uint8Array(32).fill(9);
    const docId = "doc-1";
    const nodeA = await generateNodeKeyPair();
    const nodeB = await generateNodeKeyPair();

    const docA = new Y.Doc();
    const docB = new Y.Doc();

    let provA!: SecureYjsProvider;
    let provB!: SecureYjsProvider;

    provA = new SecureYjsProvider({
      doc: docA,
      docId,
      local: {
        nodeId: nodeA.nodeId,
        role: 2,
        privateKey: nodeA.privateKey,
        publicKey: nodeA.publicKey,
        docKey,
        keyVersion: 1,
      },
      send: (t) => provB.handleWireMessage(t),
    });
    provB = new SecureYjsProvider({
      doc: docB,
      docId,
      local: {
        nodeId: nodeB.nodeId,
        role: 2,
        privateKey: nodeB.privateKey,
        publicKey: nodeB.publicKey,
        docKey,
        keyVersion: 1,
      },
      send: (t) => provA.handleWireMessage(t),
    });

    provA.registerPeer(peerSession(nodeB, 2));
    provB.registerPeer(peerSession(nodeA, 2));

    const text = docA.getText("content");
    text.insert(0, "hello dpe");
    await syncBoth(provA, provB);

    expect(docB.getText("content").toString()).toBe("hello dpe");

    docB.getText("content").insert(5, " secure");
    await syncBoth(provA, provB);
    expect(docA.getText("content").toString()).toBe("hello secure dpe");

    provA.destroy();
    provB.destroy();
  });

  it("rejects merges from readonly peer (role 1)", async () => {
    const docKey = new Uint8Array(32).fill(3);
    const docId = "doc-1";
    const nodeA = await generateNodeKeyPair();
    const nodeB = await generateNodeKeyPair();

    const docA = new Y.Doc();
    const docB = new Y.Doc();
    docA.getText("t").insert(0, "base");

    const provA = new SecureYjsProvider({
      doc: docA,
      docId,
      local: {
        nodeId: nodeA.nodeId,
        role: 2,
        privateKey: nodeA.privateKey,
        publicKey: nodeA.publicKey,
        docKey,
        keyVersion: 1,
      },
      send: () => {},
    });
    const provB = new SecureYjsProvider({
      doc: docB,
      docId,
      local: {
        nodeId: nodeB.nodeId,
        role: 1,
        privateKey: nodeB.privateKey,
        publicKey: nodeB.publicKey,
        docKey,
        keyVersion: 1,
      },
      send: () => {},
    });

    provA.registerPeer(peerSession(nodeB, 1));
    provB.registerPeer(peerSession(nodeA, 2));

    const evilDoc = new Y.Doc();
    evilDoc.getText("t").insert(0, "hack");
    const malicious = await createSignedUpdate({
      docId,
      keyVersion: 1,
      docKey,
      plaintext: Y.encodeStateAsUpdate(evilDoc),
      signerPrivateKey: nodeB.privateKey,
      signerNodeId: nodeB.nodeId,
      seq: 1,
    });

    const applied = await provA.receiveSignedUpdate(malicious);
    expect(applied).toBe(false);
    expect(docA.getText("t").toString()).toBe("base");

    provA.destroy();
    provB.destroy();
  });
});
