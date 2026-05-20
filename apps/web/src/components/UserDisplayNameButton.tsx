import { useEffect, useId, useRef, useState } from "react";
import { api } from "../lib/api";
import { saveDisplayName } from "../lib/identity";
import { DISPLAY_NAME_CHANGED_EVENT, useIdentity } from "../lib/use-identity";
import { shortNodeId } from "../lib/display-names";

export function UserDisplayNameButton() {
  const identity = useIdentity();
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(identity?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (identity?.displayName) setDraft(identity.displayName);
  }, [identity?.displayName]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setError(null);
        setDraft(identity?.displayName ?? "");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, identity?.displayName]);

  if (!identity) return null;

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("用户名不能为空");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      saveDisplayName(trimmed);
      await api.syncDisplayName(identity!.nodeId, trimmed);
      window.dispatchEvent(new Event(DISPLAY_NAME_CHANGED_EVENT));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell__user-menu" ref={panelRef}>
      <button
        type="button"
        className="app-shell__user"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={menuId}
        title={`节点 ID：${identity.nodeId}`}
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
          setDraft(identity.displayName);
        }}
      >
        {identity.displayName}
      </button>
      {open && (
        <div id={menuId} className="app-shell__user-panel" role="dialog" aria-label="修改用户名">
          <p className="app-muted app-shell__user-panel__hint">
            仅修改显示名称，节点 ID 不变：
            <code title={identity.nodeId}>{shortNodeId(identity.nodeId, 12)}</code>
          </p>
          <label className="app-field">
            <span>用户名</span>
            <input
              className="app-input"
              value={draft}
              maxLength={32}
              disabled={busy}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void save();
                if (e.key === "Escape") {
                  setOpen(false);
                  setDraft(identity.displayName);
                  setError(null);
                }
              }}
            />
          </label>
          {error && <p className="app-error">{error}</p>}
          <div className="app-form-row">
            <button type="button" className="app-btn" disabled={busy} onClick={() => setOpen(false)}>
              取消
            </button>
            <button
              type="button"
              className="app-btn app-btn--primary"
              disabled={busy || !draft.trim()}
              onClick={() => void save()}
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
