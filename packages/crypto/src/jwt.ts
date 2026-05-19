import { SignJWT, importJWK, jwtVerify, type JWK } from "jose";
import type { JwtPayload } from "@dpe/proto";
import { jwtPayloadSchema } from "@dpe/proto";
import { bytesToBase64Url } from "./encoding.js";

function ed25519ToJwk(publicKey: Uint8Array, privateKey?: Uint8Array): JWK {
  const jwk: JWK = {
    kty: "OKP",
    crv: "Ed25519",
    x: bytesToBase64Url(publicKey),
  };
  if (privateKey) jwk.d = bytesToBase64Url(privateKey);
  return jwk;
}

export async function signJwt(
  payload: JwtPayload,
  adminPrivateKey: Uint8Array,
  adminPublicKey: Uint8Array,
): Promise<string> {
  const parsed = jwtPayloadSchema.parse(payload);
  const key = await importJWK(ed25519ToJwk(adminPublicKey, adminPrivateKey), "EdDSA");
  return new SignJWT({ ...parsed })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .sign(key);
}

export async function verifyJwt(
  token: string,
  adminPublicKey: Uint8Array,
  options?: { audience?: string; issuer?: string },
): Promise<JwtPayload> {
  const key = await importJWK(ed25519ToJwk(adminPublicKey), "EdDSA");
  const { payload } = await jwtVerify(token, key, {
    algorithms: ["EdDSA"],
    audience: options?.audience,
    issuer: options?.issuer,
  });
  return jwtPayloadSchema.parse(payload);
}
