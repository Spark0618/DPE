import { z } from "zod";

export const keyRotationSchema = z.object({
  type: z.literal("key_rotation"),
  doc_id: z.string(),
  key_version: z.number().int().positive(),
  /** node_id -> sealed doc_key (base64url) */
  doc_keys: z.record(z.string(), z.string()),
});

export type KeyRotation = z.infer<typeof keyRotationSchema>;
