import { describe, expect, it, vi } from "vitest";
import { randomUuid } from "./random-uuid.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("randomUuid", () => {
  it("returns a v4-shaped id", () => {
    expect(randomUuid()).toMatch(UUID_RE);
  });

  it("falls back when randomUUID is missing", () => {
    const orig = globalThis.crypto;
    vi.stubGlobal("crypto", {
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i++) arr[i] = i;
        return arr;
      },
    });
    try {
      expect(randomUuid()).toMatch(UUID_RE);
    } finally {
      vi.stubGlobal("crypto", orig);
    }
  });
});
