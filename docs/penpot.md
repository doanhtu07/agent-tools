# Penpot

Self-hosted [Penpot](https://penpot.app) — the open source Figma alternative — for
UI design and quick technical diagrams in one place. It covers most of what I used
Excalidraw for, plus real design work (components, tokens, prototyping), and it
ships an MCP server so agents can read and edit the canvas.

Setup lives in my self-host repo:
<https://github.com/doanhtu07/penpot-self-host>

## Why Penpot instead of Excalidraw

Excalidraw is a great whiteboard: open it, sketch a diagram, export. It stops being
enough once the same file should also become a UI mockup, a component library, or a
prototype.

Penpot is one tool for both:

- **Diagrams** — boards, shapes, lines/arrows, bezier paths, freehand pencil.
- **Design** — components and variants, design tokens, flex/grid layouts,
  libraries, interactive prototyping.
- **Agents** — built-in MCP server; OpenCode and Claude Code can inspect and edit
  the currently open file.

The trade-off: Penpot has no hand-drawn "sketchy" style. If that aesthetic matters,
draw in Excalidraw and import the SVG (see
[Drawing diagrams](#drawing-diagrams)).

## Requirements

- Docker Engine/Desktop with Compose v2
- ~4 GB of free RAM for the full stack
- `pnpm` only for the repo helper scripts; the stack itself is Docker images

## Setup

```sh
git clone https://github.com/doanhtu07/penpot-self-host.git
cd penpot-self-host
pnpm install
pnpm start
```

`pnpm start` is a wrapper around:

```sh
docker compose -p penpot -f docker-compose.yaml up -d
```

Then open <http://localhost:9001> and register the first account. This stack keeps
email verification disabled, so sign-up is immediate. Other mail — team invitations,
for example — lands in Mailpit instead of a real inbox.

| URL                     | What                           |
| ----------------------- | ------------------------------ |
| <http://localhost:9001> | Penpot                         |
| <http://localhost:8025> | Mailpit — catches Penpot email |

Check that everything came up:

```sh
docker compose -p penpot ps
```

You want `penpot-frontend`, `penpot-backend`, `penpot-admin-console`,
`penpot-mcp`, `penpot-exporter`, `penpot-postgres`, and `penpot-valkey` running.
Postgres, Valkey, the exporter and MCP are internal-only; only the frontend and
Mailpit publish ports.

Designs and assets live in the `penpot_postgres_v15` and `penpot_assets` Docker
volumes — not in the repo, so `git clean` cannot delete them.

## Drawing diagrams

Penpot's drawing tools are in two flyouts in the toolbar (2.18+):

| Tool               | Shortcut                   | Use                                |
| ------------------ | -------------------------- | ---------------------------------- |
| Move               | `V`                        | select, drag, resize               |
| Board              | `B`                        | frame around one diagram or screen |
| Rectangle          | `R`                        | boxes, notes, containers           |
| Ellipse            | `E`                        | circles, start/end nodes           |
| Line / Arrow       | `L` / shapes flyout        | connectors                         |
| Text               | `T`                        | labels                             |
| Path (bezier)      | `P`                        | precise curves and custom shapes   |
| Pencil / Curve     | `Shift` + `C`              | freehand drawing                   |
| Image              | `Shift` + `K`              | screenshots, imported SVG          |
| Group              | `Ctrl`/`Cmd` + `G`         | keep a diagram together            |
| Create component   | `Ctrl`/`Cmd` + `K`         | reusable box, card, node           |
| Selection to board | `Ctrl`/`Cmd` + `Alt` + `G` | wrap an existing sketch in a board |

A workflow that stays close to Excalidraw:

1. Press `B` and draw a board — one board per diagram, named after it.
2. Rough out boxes with `R`, label them with `T`, connect with arrows.
3. Freehand anything organic with `Shift` + `C`; it is converted to an editable
   path, not a raster image.
4. Group (`Ctrl`/`Cmd` + `G`) or turn repeated nodes into a component
   (`Ctrl`/`Cmd` + `K`).
5. Put each diagram on its own **page** (Pages panel) so one file can hold many.
6. Export from the Design panel as SVG, PNG, or PDF.

### Getting the Excalidraw look

There is no built-in rough/hand-drawn stroke. Two practical options:

- **Import a sketch** — export SVG from Excalidraw and drag it onto a Penpot board.
  It stays vector and editable; Penpot keeps it as an image/SVG layer rather than
  converting every stroke to shapes.
- **Generate diagrams** — the community
  [Mermaid Diagrams plugin](https://penpot.app/penpothub/plugins/mermaid-diagrams)
  turns Mermaid text into editable Penpot shapes. Install it from the Plugin panel
  inside the app.

Penpot will not feel as fast as Excalidraw for a five-box flowchart. The payoff is
that the same file can grow into a real design without switching tools.

## Designing UI

Coming from Figma, the mapping is direct:

- **Board** = Figma frame. Start from a device preset or draw a custom size.
- **Component** (`Ctrl`/`Cmd` + `K`) = reusable component; variants group related
  states.
- **Assets panel** = local library: components, colors, typographies, and tokens.
- **Flex/grid layout** on a board behaves like auto layout; children are positioned
  by the layout, not by x/y.
- **Prototype** links connect boards into a clickable flow; View mode plays it.
- **Libraries** share assets across files in a team.

Useful extras: design tokens, comments, and multiplayer editing with live cursors.

## Connect an agent over MCP

The self-host stack already runs `penpot-mcp` and enables the `enable-mcp` flag, so
the frontend proxies `/mcp/*`. The endpoint is:

```text
http://localhost:9001/mcp/stream?userToken=<your MCP key>
```

1. In Penpot: **Your account → Integrations → MCP Server**, enable it, and generate
   an MCP key. The key is shown once.
2. Add the server to a client, e.g. OpenCode:

   ```sh
   opencode mcp add penpot --global --url "http://localhost:9001/mcp/stream?userToken=..."
   ```

3. Open a design file, then **File → MCP Server → Connect**. The plugin runs in that
   browser tab and follows the focused page — with no plugin connected, the server
   has no file to act on.
4. Start with a read-only prompt ("List the pages in this file") before letting it
   write.

Full walkthrough, including Claude Code, key rotation, and troubleshooting:
[`connect-mcp.md`](https://github.com/doanhtu07/penpot-self-host/blob/main/docs/connect-mcp.md).

Treat the MCP key like a password: it grants read **and** write access to your
designs, and it travels in a URL. Keep it out of git.

## Everyday commands

```sh
docker compose -p penpot ps                 # status
docker compose -p penpot logs -f penpot-mcp # debug agent connections
docker compose -p penpot down               # stop, keep designs
docker compose -p penpot down -v            # stop and delete designs + assets
docker compose -p penpot up -d              # start / apply compose changes
```

The repo pins every image to the same tag with `PENPOT_VERSION` (default `2.18`):

```sh
PENPOT_VERSION=2.18 docker compose -p penpot up -d   # explicit pin
```

## Notes

- **Change `PENPOT_SECRET_KEY`** in `docker-compose.yaml` before using this beyond
  localhost. It derives session and invitation keys; changing it invalidates
  existing sessions.
- The compose file enables `disable-email-verification` and
  `disable-secure-session-cookies` for local use. Remove both flags if you expose
  the instance — the compose comments say the same.
- There is no TLS on `localhost`. Behind a real domain, put Penpot behind HTTPS
  (Traefik labels are stubbed in the compose file); some browser APIs, including the
  clipboard, need a secure context.
- Backups are the two Docker volumes. `down -v` is the destructive command.
- Penpot is MPL-2.0; the self-host stack is just configuration around the official
  `penpotapp/*` images.

## References

- Penpot: <https://penpot.app>
- Self-host repo: <https://github.com/doanhtu07/penpot-self-host>
- Self-hosting guide: <https://help.penpot.app/technical-guide/getting-started/>
- Configuration and flags: <https://help.penpot.app/technical-guide/configuration/>
- MCP help: <https://help.penpot.app/mcp/>
- Shortcuts: <https://help.penpot.app/user-guide/first-steps/shortcuts/>
- Plugins: <https://penpot.app/penpothub/plugins>
