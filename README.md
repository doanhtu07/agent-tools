# agent-tools

My tools to work with agents

## Setup

```sh
pnpm install
```

## Prompts

- [`manage packages`](prompts/manage-packages.md) — tell agents how to manage my Expo and non-Expo projects

## Skills

- **canvas-design** — Creates original visual art (posters, prints, designs) as `.png` or `.pdf` files, starting from a written design philosophy and refining it into a crafted, museum-quality composition.
  - Source: [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/canvas-design)

- **frontend-design** — Guides distinctive, intentional UI design work, helping with aesthetic direction and typography so the result doesn't look like a templated default.
  - Source: [anthropics/skills](https://github.com/anthropics/skills/tree/main/skills/frontend-design)

- **graphify** — Turns code, docs, papers, images, or videos into a persistent knowledge graph, making it useful for answering questions about a codebase's architecture, file relationships, and overall content.
  - Source: [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify)

- **herdr-core** — Teaches agents to run programs and agents that stay alive in persistent terminals with `hc`: delegating to helper agents, waiting on children, and reading their reports.
  - Source: [`hc --skill`](skills/herdr-core.md) — the stub loads the version-matched manual from the installed herdr-core.

## Tools

- [`pnpm where`](docs/where.md) — find where MCP servers and skills are defined, and which copy wins

- [`scripts/run-playwright-mcp.sh`](scripts/run-playwright-mcp.sh) — Playwright MCP pinned to this repo's `@playwright/mcp`, driving installed Chrome. Registered globally for both Claude Code and OpenCode.

- [`Cua Driver`](docs/cua-driver.md) — standalone install notes for the Cua Driver desktop-automation daemon (macOS, Windows, Linux).

- [`Penpot`](docs/penpot.md) — self-host the open source Figma alternative for UI design and Excalidraw-style diagrams, and connect agents over MCP. Setup: [doanhtu07/penpot-self-host](https://github.com/doanhtu07/penpot-self-host).
