# `pnpm where` — where do MCP servers and skills live?

OpenCode and Claude Code each answer half of this question. OpenCode can tell you
_which config file_ defines a server (but not its scope), and Claude can tell you a
server's _scope_ (but not the file). `where` reads both and prints one answer per
entry, so "is this global or project-local, and which copy wins?" stops being a guess.

```sh
pnpm where              # MCP servers + skills
pnpm where mcp          # MCP servers only
pnpm where skills       # skills only
pnpm where -C ../repo   # inspect another directory
pnpm where --json       # machine-readable
```

## Example

```text
MCP servers
  opencode (1)
    NAME    SCOPE   TYPE    ORIGIN                             ENDPOINT
    penpot  global  remote  ~/.config/opencode/opencode.jsonc  <redacted>

  claude (3)
    NAME        SCOPE  TYPE   ORIGIN          ENDPOINT
    confluence  user   stdio  ~/.claude.json  /opt/mcp/run-confluence.sh
    penpot      user   http   ~/.claude.json  http://localhost:9001/mcp/stream?userToken=<redacted>

Skills
  opencode (10)
    SKILL    SCOPE                   STATE     PATH
    graphify global                  active    ~/.config/opencode/skills/graphify/SKILL.md
    graphify global (claude compat)  shadowed  ~/.claude/skills/graphify/SKILL.md
```

`shadowed` means the same skill id is defined again in a higher-precedence tier, and
that other copy is the one the agent actually loads.

## How it resolves things

|               | OpenCode                                                                                                                                                                                            | Claude Code                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| MCP source    | `opencode debug config` — merged config, one row per defining file                                                                                                                                  | `~/.claude.json` (`user` + per-project `local`) and `./.mcp.json` (`project`)                  |
| Skill sources | built-ins from the running server's `/api/skill`, plus `~/.config/opencode/skills`, `~/.claude/skills`, `~/.agents/skills`, and project `.opencode` / `.claude` / `.agents` dirs up to the git root | `~/.claude/skills` and `~/.claude/commands`, plus the same under `.claude/` up to the git root |
| Precedence    | built-in < `~/.claude` < `~/.agents` < `~/.config/opencode` < project `.opencode`                                                                                                                   | personal < project                                                                             |

Symlinked skill directories are followed, since `~/.claude/skills` is commonly a set of
links into a canonical folder.

## Limits worth knowing

- **Secrets are redacted.** Query params such as `userToken`, `token`, `api_key` and
  `Bearer` headers are replaced with `<redacted>`. OpenCode masks credential-bearing
  URLs itself, which shows up as `<redacted>` too.
- **Claude built-in and plugin skills are not on disk**, so they are not listed. Use
  `/skills` inside Claude Code for the complete set.
- **No health checks.** This is a config-location tool; run `opencode mcp list` or
  `claude mcp list` for connectivity.
- OpenCode's project-skill resolution is inferred from its documented discovery order,
  not observed — the `/api/skill` endpoint reports the user's home directory rather
  than the requested one, so project entries come from a filesystem scan.
