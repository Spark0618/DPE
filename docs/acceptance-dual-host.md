# 双机验收清单（Windows / Linux）

在同一局域网内准备 **主机 A**、**主机 B**（可一为 Windows、一为 Linux）。两台均需：Node 20+、pnpm 9+、Docker（Postgres）。

## 环境

1. 克隆仓库，根目录 `cp .env.example .env`（两台可共用同一套 `VITE_*` 指向 A 的 IP）。
2. 仅在 **A** 上：`docker compose up -d postgres`，`cd apps/control-plane && pnpm db:push`。
3. **A** 上 `pnpm dev`（或分别启动 control-plane / signaling / lan-agent / web）。
4. 将 `.env` 中 `VITE_API_URL`、`VITE_SIGNALING_URL`、`VITE_LAN_AGENT_URL` 改为 A 的 LAN IP（B 的浏览器访问 B 的 web 时仍指向 A 的后端）。

## 验收步骤

| # | 操作 | 预期 |
|---|------|------|
| 1 | A：打开 Web，生成身份 | 显示 UID |
| 2 | A：总面板建群 | 获得群 ID，`pk_admin` 已存 localStorage |
| 3 | A：向 B 的 UID 发邀请 | 邀请成功 |
| 4 | B：生成身份，接受邀请 | 进入群列表 |
| 5 | B：进入群组，P2P 状态 | 「信令已连接」（或重试后成功） |
| 6 | A：根目录下新建文档 | 树中出现子文档 |
| 7 | A：对 B 的 UID 在子文档 SetACL=2 | 无报错 |
| 8 | A、B：各打开同一子文档编辑 | 一方输入，另一方数秒内同步 |
| 9 | B：只读成员（ACL=1）尝试改同一文档 | 编辑器只读或写更新不被合并 |
| 10 | A：lan-agent 邻居 / UID 搜索 | 可发现 B（或用手动 peer 兜底） |

## 自动化对照

单机上可先跑：

```bash
pnpm verify:p6 --live
```

通过后再做上表双机勾项；差异问题记录 OS、浏览器与控制台错误。

## 故障排查

| 现象 | 处理 |
|------|------|
| B 无法连 API | 检查防火墙、`.env` 是否仍为 `localhost` |
| P2P 信令失败 | 确认 signaling 端口 3002 可达；Strict Mode 下点「重试信令」 |
| 签名/加载失败 | 重新建群或从建群/入群流程进入以刷新 `pk_admin` |
| mDNS 无邻居 | 使用 lan-agent `POST /peers/manual` 或 Dashboard 手动添加 |
