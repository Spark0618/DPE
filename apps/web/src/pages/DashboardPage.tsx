import { Link } from "react-router-dom";

const LAN_AGENT = import.meta.env.VITE_LAN_AGENT_URL ?? "http://localhost:3003";

export default function DashboardPage() {
  const uid = localStorage.getItem("dpe_uid") ?? "unknown";
  return (
    <main style={{ padding: "2rem" }}>
      <h1>总面板</h1>
      <p>
        UID: <code>{uid}</code>
      </p>
      <div className="card">
        <h2>网络与邻居</h2>
        <p>
          LAN Agent（JSON API，无网页根路径 UI）：
          <br />
          <a href={`${LAN_AGENT}/health`} target="_blank" rel="noreferrer">
            {LAN_AGENT}/health
          </a>
          {" · "}
          <a href={`${LAN_AGENT}/network`} target="_blank" rel="noreferrer">
            /network
          </a>
          {" · "}
          <a href={`${LAN_AGENT}/discovery`} target="_blank" rel="noreferrer">
            /discovery
          </a>
        </p>
        <p style={{ fontSize: 12, opacity: 0.75 }}>
          需先启动：<code>node apps/lan-agent/dist/index.js</code> 或 <code>pnpm --filter @dpe/lan-agent dev</code>
        </p>
      </div>
      <div className="card">
        <h2>群组</h2>
        <Link to="/groups/demo">演示群组</Link>
      </div>
    </main>
  );
}
