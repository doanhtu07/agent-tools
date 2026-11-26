# agent-tools

My tools to work with agents

## Setup

```sh
pnpm install
```

## Prompts

- [`manage packages`](prompts/manage-packages.md) — tell agents how to manage my Expo and non-Expo projects

## Tools

- [`pnpm where`](docs/where.md) — find where MCP servers and skills are defined, and which copy wins

- [`scripts/run-playwright-mcp.sh`](scripts/run-playwright-mcp.sh) — Playwright MCP pinned to this repo's `@playwright/mcp`, driving installed Chrome. Registered globally for both Claude Code and OpenCode.

- [`Cua Driver`](docs/cua-driver.md) — standalone install notes for the Cua Driver desktop-automation daemon (macOS, Windows, Linux).
