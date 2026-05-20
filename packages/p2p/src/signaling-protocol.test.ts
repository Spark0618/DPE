import { describe, expect, it } from "vitest";
import { encodeServerMessage, parseClientMessage } from "./signaling-protocol.js";

describe("signaling protocol", () => {
  it("parses join and encodes peers", () => {
    const join = parseClientMessage(
      JSON.stringify({ type: "join", room: "g1", node_id: "abc" }),
    );
    expect(join.type).toBe("join");
    const peers = encodeServerMessage({
      type: "peers",
      room: "g1",
      peers: ["abc", "def"],
    });
    expect(JSON.parse(peers).peers).toHaveLength(2);
  });
});
