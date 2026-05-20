import { z } from "zod";

/** Application frame after AuthEnvelope (P4 adds signed-update). */
export const wireFrameSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("auth"), payload: z.record(z.unknown()) }),
  z.object({ type: z.literal("sync"), payload: z.instanceof(Uint8Array).or(z.string()) }),
  z.object({ type: z.literal("control"), payload: z.record(z.unknown()) }),
]);

export type WireFrame = z.infer<typeof wireFrameSchema>;

export const DPE_MDNS_SERVICE_TYPE = "dpe-agent";
