import { signedUpdateSchema, type SignedUpdate } from "@dpe/proto";
import { z } from "zod";

export const syncFrameSchema = z.object({
  type: z.literal("sync"),
  update: signedUpdateSchema,
});

export type SyncFrame = z.infer<typeof syncFrameSchema>;

export function encodeSyncFrame(update: SignedUpdate): string {
  return JSON.stringify(syncFrameSchema.parse({ type: "sync", update }));
}

export function parseSyncFrame(raw: string): SyncFrame {
  return syncFrameSchema.parse(JSON.parse(raw));
}
