import { Bonjour, type Service } from "bonjour-service";
import { DPE_MDNS_SERVICE_TYPE } from "@dpe/p2p";

export type LanPeer = {
  uid: string;
  host: string;
  port: number;
  name?: string;
  source: "mdns" | "manual";
  lastSeen: number;
};

export type DiscoveryAdapter = {
  start(): void;
  stop(): void;
  getPeers(): LanPeer[];
  registerManual(peer: Omit<LanPeer, "source" | "lastSeen">): void;
  onUpdate(handler: (peers: LanPeer[]) => void): () => void;
};

export type LocalAgentIdentity = {
  uid: string;
  displayName: string;
  port: number;
  host: string;
};

function parseManualPeers(raw: string | undefined): LanPeer[] {
  if (!raw?.trim()) return [];
  const now = Date.now();
  const out: LanPeer[] = [];
  for (const part of raw.split(/[,;\s]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    // uid@host:port or host:port (uid = host)
    const at = trimmed.indexOf("@");
    let uid: string;
    let hostPort: string;
    if (at >= 0) {
      uid = trimmed.slice(0, at);
      hostPort = trimmed.slice(at + 1);
    } else {
      hostPort = trimmed;
      uid = hostPort.split(":")[0] ?? trimmed;
    }
    const colon = hostPort.lastIndexOf(":");
    if (colon < 0) continue;
    const host = hostPort.slice(0, colon);
    const port = Number(hostPort.slice(colon + 1));
    if (!host || !Number.isFinite(port)) continue;
    out.push({ uid, host, port, source: "manual", lastSeen: now });
  }
  return out;
}

export function createDiscovery(
  identity: LocalAgentIdentity,
  options?: { manualPeersEnv?: string; enableMdns?: boolean },
): DiscoveryAdapter {
  const enableMdns = options?.enableMdns ?? process.env.DPE_DISABLE_MDNS !== "1";
  const manual = parseManualPeers(
    options?.manualPeersEnv ?? process.env.DPE_MANUAL_PEERS,
  );
  const byUid = new Map<string, LanPeer>();
  for (const p of manual) byUid.set(p.uid.toLowerCase(), p);

  const handlers = new Set<(peers: LanPeer[]) => void>();
  let bonjour: Bonjour | null = null;
  let publish: Service | null = null;
  let browser: ReturnType<Bonjour["find"]> | null = null;

  const emit = () => {
    const peers = [...byUid.values()].sort((a, b) => a.uid.localeCompare(b.uid));
    for (const h of handlers) h(peers);
  };

  const upsert = (peer: LanPeer) => {
    byUid.set(peer.uid.toLowerCase(), peer);
    emit();
  };

  return {
    start() {
      if (enableMdns) {
        try {
          bonjour = new Bonjour();
          publish = bonjour.publish({
            name: identity.displayName,
            type: DPE_MDNS_SERVICE_TYPE,
            port: identity.port,
            txt: { uid: identity.uid, host: identity.host },
          });
          browser = bonjour.find({ type: DPE_MDNS_SERVICE_TYPE });
          browser.on("up", (svc: Service) => {
            const uid = svc.txt?.uid ?? svc.name;
            if (!uid || uid === identity.uid) return;
            const host =
              (svc.referer?.address as string | undefined) ??
              svc.host ??
              svc.addresses?.[0];
            if (!host) return;
            upsert({
              uid,
              host,
              port: svc.port,
              name: svc.name,
              source: "mdns",
              lastSeen: Date.now(),
            });
          });
          browser.on("down", (svc: Service) => {
            const uid = svc.txt?.uid ?? svc.name;
            if (!uid) return;
            const key = uid.toLowerCase();
            const existing = byUid.get(key);
            if (existing?.source === "mdns") {
              byUid.delete(key);
              emit();
            }
          });
        } catch (e) {
          console.warn("[lan-agent] mDNS unavailable:", e);
        }
      }
      emit();
    },
    stop() {
      browser?.stop();
      publish?.stop?.();
      bonjour?.destroy();
      browser = null;
      publish = null;
      bonjour = null;
    },
    getPeers: () => [...byUid.values()],
    registerManual(peer) {
      upsert({
        ...peer,
        source: "manual",
        lastSeen: Date.now(),
      });
    },
    onUpdate(handler) {
      handlers.add(handler);
      handler(this.getPeers());
      return () => handlers.delete(handler);
    },
  };
}
