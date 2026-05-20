import { z } from "zod";

export const signalingJoinSchema = z.object({
  type: z.literal("join"),
  room: z.string().min(1),
  node_id: z.string().min(1),
});

export const signalingLeaveSchema = z.object({
  type: z.literal("leave"),
  room: z.string().min(1),
});

export const signalingSignalSchema = z.object({
  type: z.literal("signal"),
  room: z.string().min(1),
  to: z.string().optional(),
  payload: z.record(z.unknown()),
});

export const signalingPeersSchema = z.object({
  type: z.literal("peers"),
  room: z.string(),
  peers: z.array(z.string()),
});

export const signalingErrorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
});

export const signalingClientMessageSchema = z.discriminatedUnion("type", [
  signalingJoinSchema,
  signalingLeaveSchema,
  signalingSignalSchema,
]);

export const signalingServerMessageSchema = z.discriminatedUnion("type", [
  signalingPeersSchema,
  signalingSignalSchema,
  signalingErrorSchema,
]);

export type SignalingClientMessage = z.infer<typeof signalingClientMessageSchema>;
export type SignalingServerMessage = z.infer<typeof signalingServerMessageSchema>;

export function parseClientMessage(raw: string): SignalingClientMessage {
  return signalingClientMessageSchema.parse(JSON.parse(raw));
}

export function encodeServerMessage(msg: SignalingServerMessage): string {
  return JSON.stringify(msg);
}
