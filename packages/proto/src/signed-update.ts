import { z } from "zod";

/** Binary fields are base64url-encoded on the wire (JSON/CBOR transport). */
export const signedUpdateSchema = z.object({
  doc_id: z.string(),
  key_version: z.number().int().nonnegative(),
  nonce: z.string().min(1),
  ciphertext: z.string().min(1),
  signer_node_id: z.string(),
  seq: z.union([z.number().int().nonnegative(), z.bigint()]),
  sig: z.string().min(1),
});

export type SignedUpdate = z.infer<typeof signedUpdateSchema>;

export const signedUpdatePayloadSchema = signedUpdateSchema.omit({ sig: true });
export type SignedUpdatePayload = z.infer<typeof signedUpdatePayloadSchema>;
