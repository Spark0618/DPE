# Distributed Privacy Editor (DPE)

P2P collaborative editor with encrypted CRDT sync, ACL, and optional proxy control plane.

## Quick start

```bash
cp .env.example .env
docker compose up -d postgres redis
pnpm install
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:5173 |
| Control plane | http://localhost:3001/health |
| Signaling | http://localhost:3002/health |
| LAN agent | http://localhost:3003/health |

## Docs

- [Design (中文)](./docs/design.md) — also [方案.md](./方案.md)
- [P1 Cryptography](./docs/P1.md)
- [Architecture](./docs/architecture.md)
- [Platform setup](./docs/platform-setup.md)
- [P6 E2E & CI](./docs/P6.md)

## Verification

| Phase | Command |
|-------|---------|
| P1 | `pnpm verify:p1` |
| P2 | `pnpm verify:p2` / `pnpm verify:p2 --api` |
| P3–P5 | `pnpm verify:p3` … `pnpm verify:p5` |
| **P6 (full)** | `pnpm verify:p6` / `pnpm verify:p6 --live` |

Docs: [P6 — E2E & acceptance](./docs/P6.md) · [Dual-host checklist](./docs/acceptance-dual-host.md)

## License

MIT
