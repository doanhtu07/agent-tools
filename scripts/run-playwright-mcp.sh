#!/usr/bin/env bash
# Playwright MCP — runs the repo-pinned @playwright/mcp against installed Chrome.
# Both Claude Code and OpenCode point at this script, so they share one version.
#
#   pnpm add -Dw @playwright/mcp   # the only dependency
#
# Register once per machine:
#   claude mcp add --scope user playwright -- "$PWD/scripts/run-playwright-mcp.sh"
#
#   # OpenCode: ~/.config/opencode/opencode.jsonc
#   "playwright": {
#     "type": "local",
#     "command": ["/abs/path/to/scripts/run-playwright-mcp.sh"]
#   }
#
# Override the browser with PLAYWRIGHT_MCP_BROWSER (chrome, msedge, firefox, webkit).
# Extra args are forwarded, e.g. --isolated or --headless.
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
BIN="$ROOT/node_modules/.bin/playwright-mcp"

if [ ! -x "$BIN" ]; then
    echo "Error: $BIN not found. Run 'pnpm install' in $ROOT." >&2
    exit 1
fi

# System Chrome is already installed, so no Chromium download is needed.
BROWSER="${PLAYWRIGHT_MCP_BROWSER:-chrome}"

exec "$BIN" --browser "$BROWSER" "$@"
