import { describe, expect, it } from "vitest";
import { canMergeContentWrite, canReceiveUpdates } from "./policy.js";

describe("@dpe/acl", () => {
  it("merge policy matches scheme roles", () => {
    expect(canReceiveUpdates(1)).toBe(true);
    expect(canReceiveUpdates(0)).toBe(false);
    expect(canMergeContentWrite(1)).toBe(false);
    expect(canMergeContentWrite(2)).toBe(true);
  });
});
