import { describe, expect, it } from "vitest";
import {
  authEnvelopeSchema,
  signedUpdateSchema,
  jwtPayloadSchema,
  keyRotationSchema,
  operableRpcSchema,
} from "./index.js";

describe("@dpe/proto schemas", () => {
  it("parses auth envelope", () => {
    const v = authEnvelopeSchema.parse({
      type: "auth",
      node_id: "abc",
      jwt: "eyJhbGciOiJFZERTQSJ9..",
    });
    expect(v.type).toBe("auth");
  });

  it("parses jwt payload", () => {
    const v = jwtPayloadSchema.parse({
      iss: "admin",
      sub: "user",
      aud: "group-1",
      doc_id: "doc-1",
      role: 2,
      doc_key: "sealed",
      key_version: 1,
      iat: 1,
      exp: 9999999999,
      jti: "uuid",
    });
    expect(v.role).toBe(2);
  });

  it("parses signed update", () => {
    const v = signedUpdateSchema.parse({
      doc_id: "d1",
      key_version: 1,
      nonce: "bm9uY2U",
      ciphertext: "Y3Q",
      signer_node_id: "n1",
      seq: 1,
      sig: "c2ln",
    });
    expect(v.seq).toBe(1);
  });

  it("parses key rotation and operable rpc", () => {
    keyRotationSchema.parse({
      type: "key_rotation",
      doc_id: "d1",
      key_version: 2,
      doc_keys: { nodeA: "sealedA" },
    });
    operableRpcSchema.parse({
      op: "SetACL",
      user_node_id: "u1",
      doc_id: "d1",
      role: 2,
    });
  });
});
