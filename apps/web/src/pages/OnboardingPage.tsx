import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createAndStoreIdentity,
  loadDisplayName,
  loadIdentityKeys,
  saveDisplayName,
} from "../lib/identity";
import { api } from "../lib/api";
import { shortNodeId } from "../lib/display-names";

export default function OnboardingPage() {
  const nav = useNavigate();
  const [keys, setKeys] = useState(loadIdentityKeys);
  const [displayName, setDisplayName] = useState(loadDisplayName() ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (keys && loadDisplayName()) {
      nav("/dashboard", { replace: true });
    }
  }, [keys, nav]);

  async function createIdentity() {
    setBusy(true);
    setError(null);
    try {
      const id = await createAndStoreIdentity();
      setKeys(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成失败");
    } finally {
      setBusy(false);
    }
  }

  async function finishProfile() {
    if (!keys) return;
    setBusy(true);
    setError(null);
    try {
      saveDisplayName(displayName);
      await api.syncDisplayName(keys.nodeId, displayName.trim());
      nav("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  const needsKeys = !keys;
  const needsName = keys && !loadDisplayName();

  return (
    <main className="app-page app-page--narrow">
      <h1>Distributed Privacy Editor</h1>
      {needsKeys ? (
        <>
          <p className="app-muted">首次使用须生成本机密钥（节点 ID 仅用于底层协议，日常以用户名为准）。</p>
          <section className="app-panel">
            <button type="button" className="app-btn app-btn--primary" disabled={busy} onClick={() => void createIdentity()}>
              {busy ? "生成中…" : "生成本机身份"}
            </button>
          </section>
        </>
      ) : needsName ? (
        <>
          <p className="app-muted">
            请设置<strong>用户名</strong>（群组内展示）。节点 ID{" "}
            <code title={keys.nodeId}>{shortNodeId(keys.nodeId, 12)}</code> 仅作技术标识。
          </p>
          <section className="app-panel">
            <label className="app-label" htmlFor="display-name">
              用户名
            </label>
            <input
              id="display-name"
              className="app-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="例如：陈同学"
              maxLength={32}
              autoFocus
            />
            <button
              type="button"
              className="app-btn app-btn--primary"
              style={{ marginTop: 12 }}
              disabled={busy || !displayName.trim()}
              onClick={() => void finishProfile()}
            >
              {busy ? "保存中…" : "进入总览"}
            </button>
          </section>
        </>
      ) : null}
      {error && <p className="app-error">{error}</p>}
    </main>
  );
}
