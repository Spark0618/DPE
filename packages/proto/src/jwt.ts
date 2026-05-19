import { z } from "zod";

/** JWT payload per 方案 §3.3 (before signing). */
export const jwtPayloadSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.string(),
  doc_id: z.string(),
  role: z.number().int().min(0).max(3),
  doc_key: z.string(),
  key_version: z.number().int().nonnegative(),
  iat: z.number().int(),
  exp: z.number().int(),
  jti: z.string(),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
