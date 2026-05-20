const WS_OPEN = 1;

type WsLike = {
  readyState: number;
  send(data: string): void;
  on(event: "message", cb: (raw: Buffer | string) => void): void;
  on(event: "close", cb: () => void): void;
};
import {
  encodeServerMessage,
  parseClientMessage,
  type SignalingClientMessage,
} from "@dpe/p2p";

type Client = {
  socket: WsLike;
  nodeId: string;
  rooms: Set<string>;
};

export class SignalingRooms {
  private readonly rooms = new Map<string, Map<string, Client>>();

  handleConnection(socket: WsLike): void {
    const client: Client = { socket, nodeId: "", rooms: new Set() };

    socket.on("message", (raw) => {
      const text = typeof raw === "string" ? raw : raw.toString("utf8");
      try {
        const msg = parseClientMessage(text);
        this.onMessage(client, msg);
      } catch (e) {
        socket.send(
          encodeServerMessage({
            type: "error",
            code: "invalid_message",
            message: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    });

    socket.on("close", () => this.disconnect(client));
  }

  private onMessage(client: Client, msg: SignalingClientMessage): void {
    switch (msg.type) {
      case "join":
        this.join(client, msg.room, msg.node_id);
        break;
      case "leave":
        this.leave(client, msg.room);
        break;
      case "signal":
        this.relay(client, msg.room, msg.to, msg.payload);
        break;
    }
  }

  private join(client: Client, room: string, nodeId: string): void {
    if (client.nodeId && client.nodeId !== nodeId) {
      for (const r of client.rooms) this.leaveRoom(client, r);
    }
    client.nodeId = nodeId;
    client.rooms.add(room);

    let members = this.rooms.get(room);
    if (!members) {
      members = new Map();
      this.rooms.set(room, members);
    }
    members.set(nodeId, client);
    this.broadcastPeers(room);
  }

  private leave(client: Client, room: string): void {
    this.leaveRoom(client, room);
    this.broadcastPeers(room);
  }

  private leaveRoom(client: Client, room: string): void {
    client.rooms.delete(room);
    const members = this.rooms.get(room);
    if (!members) return;
    if (client.nodeId) members.delete(client.nodeId);
    if (members.size === 0) this.rooms.delete(room);
  }

  private disconnect(client: Client): void {
    for (const room of [...client.rooms]) {
      this.leaveRoom(client, room);
      this.broadcastPeers(room);
    }
  }

  private broadcastPeers(room: string): void {
    const members = this.rooms.get(room);
    const peers = members ? [...members.keys()] : [];
    const msg = encodeServerMessage({ type: "peers", room, peers });
    for (const c of members?.values() ?? []) {
      if (c.socket.readyState === WS_OPEN) c.socket.send(msg);
    }
  }

  private relay(
    client: Client,
    room: string,
    to: string | undefined,
    payload: Record<string, unknown>,
  ): void {
    if (!client.rooms.has(room) || !client.nodeId) {
      client.socket.send(
        encodeServerMessage({
          type: "error",
          code: "not_joined",
          message: `join room ${room} first`,
        }),
      );
      return;
    }

    const members = this.rooms.get(room);
    if (!members) return;

    const msg = encodeServerMessage({
      type: "signal",
      room,
      to,
      payload: { ...payload, from: client.nodeId },
    });

    if (to) {
      const target = members.get(to);
      if (target?.socket.readyState === WS_OPEN) {
        target.socket.send(msg);
      }
      return;
    }

    for (const [id, c] of members) {
      if (id === client.nodeId) continue;
      if (c.socket.readyState === WS_OPEN) c.socket.send(msg);
    }
  }
}
