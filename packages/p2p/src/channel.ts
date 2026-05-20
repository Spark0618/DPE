/** Minimal DataChannel surface for AuthEnvelope (browser RTCDataChannel or test doubles). */
export type DataChannelState = "connecting" | "open" | "closing" | "closed";

export interface DataChannelLike {
  readyState: DataChannelState;
  send(data: string | ArrayBuffer | Uint8Array): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((data: string | ArrayBuffer) => void) | null;
  onclose: (() => void) | null;
}

export function decodeChannelMessage(raw: string | ArrayBuffer): string {
  if (typeof raw === "string") return raw;
  return new TextDecoder().decode(raw);
}
