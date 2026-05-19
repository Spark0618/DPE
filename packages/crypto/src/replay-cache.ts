/** Tracks (signer_node_id, seq) to prevent replay per 方案 §3.5 step 5. */
export class ReplayCache {
  private readonly seen = new Map<string, Set<string>>();
  private readonly maxPerSigner: number;

  constructor(maxPerSigner = 10_000) {
    this.maxPerSigner = maxPerSigner;
  }

  private key(signerNodeId: string, docId: string): string {
    return `${signerNodeId}:${docId}`;
  }

  has(signerNodeId: string, docId: string, seq: number | bigint): boolean {
    const set = this.seen.get(this.key(signerNodeId, docId));
    if (!set) return false;
    return set.has(String(seq));
  }

  add(signerNodeId: string, docId: string, seq: number | bigint): void {
    const k = this.key(signerNodeId, docId);
    let set = this.seen.get(k);
    if (!set) {
      set = new Set();
      this.seen.set(k, set);
    }
    set.add(String(seq));
    if (set.size > this.maxPerSigner) {
      const first = set.values().next().value;
      if (first !== undefined) set.delete(first);
    }
  }

  checkAndAdd(signerNodeId: string, docId: string, seq: number | bigint): boolean {
    if (this.has(signerNodeId, docId, seq)) return false;
    this.add(signerNodeId, docId, seq);
    return true;
  }

  clear(): void {
    this.seen.clear();
  }
}
