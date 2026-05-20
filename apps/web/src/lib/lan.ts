const LAN = import.meta.env.VITE_LAN_AGENT_URL ?? "http://localhost:3003";

export type LanPeer = {
  uid: string;
  host: string;
  port: number;
  name?: string;
  source: string;
  lastSeen: number;
};

async function lanFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${LAN}${path}`, init);
  } catch {
    throw new Error(
      `无法连接 lan-agent (${LAN})。请在本机运行: pnpm dev 或 pnpm --filter @dpe/lan-agent dev`,
    );
  }
}

export async function fetchNetwork(): Promise<Record<string, unknown>> {
  const res = await lanFetch("/network");
  if (!res.ok) throw new Error(`lan-agent /network 返回 ${res.status}`);
  return res.json();
}

export async function fetchDiscovery(): Promise<{ peers: LanPeer[] }> {
  const res = await lanFetch("/discovery");
  if (!res.ok) throw new Error(`lan-agent /discovery 返回 ${res.status}`);
  return res.json();
}

export async function searchPeers(uidPrefix: string): Promise<{ peers: LanPeer[] }> {
  const q = uidPrefix.trim();
  const res = await lanFetch(`/peers?uid=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`lan-agent /peers 返回 ${res.status}`);
  return res.json();
}

export function getLanAgentBaseUrl(): string {
  return LAN;
}
