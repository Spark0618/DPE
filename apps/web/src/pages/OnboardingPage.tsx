import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAndStoreIdentity, loadIdentity } from "../lib/identity";

export default function OnboardingPage() {
  const nav = useNavigate();
  const [identity, setIdentity] = useState(loadIdentity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createIdentity() {
    setBusy(true);
    setError(null);
    try {
      const id = await createAndStoreIdentity();
      setIdentity(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 560 }}>
      <h1>Distributed Privacy Editor</h1>
      <p>首次登录：生成 Ed25519 密钥对，UID = SHA-256(公钥) 十六进制</p>
      <div className="card">
        {identity ? (
          <>
            <p>
              UID: <code>{identity.nodeId}</code>
            </p>
            <p style={{ fontSize: 12, opacity: 0.8 }}>
              公钥: <code>{identity.publicKeyBase64Url.slice(0, 24)}…</code>
            </p>
          </>
        ) : (
          <button onClick={createIdentity} disabled={busy}>
            {busy ? "生成中…" : "生成身份"}
          </button>
        )}
        {error && <p style={{ color: "#f88" }}>{error}</p>}
      </div>
      {identity && (
        <button type="button" onClick={() => nav("/dashboard")}>
          进入总面板
        </button>
      )}
    </main>
  );
}
