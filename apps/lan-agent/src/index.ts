import os from "node:os";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { createDiscovery, type LanPeer } from "./discovery.js";
import { registerCors } from "./cors.js";

function pickLanAddress(): string {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces ?? []) {
      if (i && !i.internal && i.family === "IPv4") return i.address;
    }
  }
  return "127.0.0.1";
}

async function main() {
  const port = Number(process.env.LAN_AGENT_PORT ?? 3003);
  const uid = process.env.DPE_NODE_ID ?? `local-${os.hostname()}`;
  const displayName = process.env.DPE_AGENT_NAME ?? os.hostname();
  const host = process.env.DPE_AGENT_HOST ?? pickLanAddress();
  const signalingUrl =
    process.env.DPE_SIGNALING_URL ?? "ws://127.0.0.1:3002/ws";

  const discovery = createDiscovery({ uid, displayName, port, host });
  discovery.start();

  let peers: LanPeer[] = discovery.getPeers();
  const wsClients = new Set<{ send: (s: string) => void }>();

  const broadcastDiscovery = () => {
    peers = discovery.getPeers();
    const payload = JSON.stringify({ type: "discovery", peers });
    for (const c of wsClients) {
      try {
        c.send(payload);
      } catch {
        /* ignore */
      }
    }
  };

  discovery.onUpdate((list) => {
    peers = list;
    broadcastDiscovery();
  });

  const app = Fastify({ logger: false });
  await registerCors(app);
  await app.register(websocket);

  app.get("/", async () => ({
    service: "lan-agent",
    status: "ok",
    node_id: uid,
    signaling_url: signalingUrl,
    endpoints: {
      health: "/health",
      network: "/network",
      discovery: "/discovery",
      peers: "/peers?uid=<prefix>",
      manual_peer: "POST /peers/manual",
      websocket: "/ws",
    },
    hint: "Set DPE_MANUAL_PEERS=uid@host:port for mDNS fallback.",
  }));

  app.get("/health", async () => ({
    status: "ok",
    service: "lan-agent",
    node_id: uid,
    peer_count: peers.length,
  }));

  app.get("/network", async () => ({
    hostname: os.hostname(),
    node_id: uid,
    agentPort: port,
    agentHost: host,
    signalingUrl,
    interfaces: Object.values(os.networkInterfaces())
      .flat()
      .filter((i): i is NonNullable<typeof i> => i != null)
      .map((i) => ({ address: i.address, family: i.family, internal: i.internal })),
  }));

  app.get("/discovery", async () => ({ peers }));
  app.get("/peers", async (req) => {
    const q = (req.query as { uid?: string }).uid?.toLowerCase() ?? "";
    const all = peers;
    return {
      peers: q ? all.filter((p) => p.uid.toLowerCase().includes(q)) : all,
    };
  });

  app.post<{ Body: { uid: string; host: string; port: number; name?: string } }>(
    "/peers/manual",
    async (req, reply) => {
      const { uid, host, port, name } = req.body ?? {};
      if (!uid || !host || !Number.isFinite(port)) {
        return reply.status(400).send({ error: "uid, host, port required" });
      }
      discovery.registerManual({ uid, host, port: Number(port), name });
      const peer = peers.find((p) => p.uid === uid) ?? {
        uid,
        host,
        port: Number(port),
        name,
        source: "manual" as const,
        lastSeen: Date.now(),
      };
      return { ok: true, peer };
    },
  );

  app.register(async (f) => {
    f.get("/ws", { websocket: true }, (socket) => {
      const client = {
        send: (s: string) => {
          if (socket.readyState === socket.OPEN) socket.send(s);
        },
      };
      wsClients.add(client);
      socket.on("close", () => wsClients.delete(client));
      socket.on("message", (raw) => {
        const text = typeof raw === "string" ? raw : raw.toString("utf8");
        try {
          const msg = JSON.parse(text) as { type?: string };
          if (msg.type === "ping") {
            client.send(JSON.stringify({ type: "pong", node_id: uid }));
          }
        } catch {
          socket.send(text);
        }
      });
      client.send(JSON.stringify({ type: "discovery", peers }));
    });
  });

  await app.listen({ port, host: "0.0.0.0" });
  console.log(`lan-agent on ${port} (node_id=${uid})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
