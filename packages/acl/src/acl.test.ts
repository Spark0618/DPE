import { describe, expect, it } from "vitest";
import { assertMonotonicAcl, canMergeContentWrite, canReceiveUpdates } from "./policy.js";

describe("@dpe/acl", () => {
  it("enforces monotonic law", () => {
    expect(() =>
      assertMonotonicAcl(
        [
          { nodeId: "a", docId: "root", role: 2 },
          { nodeId: "a", docId: "child", role: 3 },
        ],
        "root",
        "child",
      ),
    ).toThrow(/monotonic/);
  });

  it("allows valid child role", () => {
    expect(() =>
      assertMonotonicAcl(
        [
          { nodeId: "a", docId: "root", role: 3 },
          { nodeId: "a", docId: "child", role: 2 },
        ],
        "root",
        "child",
      ),
    ).not.toThrow();
  });

  it("merge policy matches scheme roles", () => {
    expect(canReceiveUpdates(1)).toBe(true);
    expect(canReceiveUpdates(0)).toBe(false);
    expect(canMergeContentWrite(1)).toBe(false);
    expect(canMergeContentWrite(2)).toBe(true);
  });
});
