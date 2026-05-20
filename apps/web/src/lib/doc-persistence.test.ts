import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import {
  applyPersistedDocState,
  encodeDocState,
  docStateFromBase64Url,
  docStateToBase64Url,
} from "./doc-persistence.js";

const ORIGIN = Symbol("test-origin");

describe("doc-persistence", () => {
  it("round-trips full Yjs state (not a single incremental delta)", () => {
    const doc = new Y.Doc();
    doc.getText("content").insert(0, "hello persistence");
    const full = encodeDocState(doc);

    const restored = new Y.Doc();
    applyPersistedDocState(restored, full, ORIGIN);
    expect(restored.getText("content").toString()).toBe("hello persistence");

    const viaB64 = docStateFromBase64Url(docStateToBase64Url(full));
    const merged = new Y.Doc();
    applyPersistedDocState(merged, viaB64, ORIGIN);
    expect(merged.getText("content").toString()).toBe("hello persistence");
  });
});
