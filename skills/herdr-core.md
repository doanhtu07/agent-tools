---
name: herdr-core
description: 'Run programs and agents that stay alive in herdr-core terminals with `hc`: delegate to helper agents, wait on children, read their reports, and run long processes in the Herdr sidebar. Use in a herdr-core terminal before the first `hc` command.'
---

# herdr-core (`hc`)

This discovery stub loads the version-matched manual from the installed `hc`.

## Load the manual before running hc commands

```text
hc --skill
```

It is the authoritative manual for the installed version: commands, waiting,
statuses, recovery, remote machines, and cleanup rules. If `hc` is missing, report
the exact error and stop. If `--skill` is unknown, the install is old: explain that
updating herdr-core restores it, and use `hc --help` for read-only discovery instead
of guessing commands. Never `hc server stop` or restart the person's core unless asked.

## Session context

- Your address is `$HC_TERMINAL_ID` (for example `t12w`). Helpers report back with
  `hc send <your-id> "<result>"`.
- The Herdr app shows your terminal as a pane. Terminals you start with `hc run`
  appear under you in its sidebar, where the person can watch and steer them.
- Pane, space, tab, and folder details come from `herdr-app status` or
  `herdr-app ls`; do not hardcode them.
- For the Herdr window itself (layouts, keys, mods), read `herdr-app --skill`.

## Working preferences

- Delegate work to helper agents in `hc` terminals
  (`hc run --bg --name <name> --cwd <dir> claude "<task>"`), not built-in
  subagents, so the person can watch and steer them. Use a folder the helper
  already trusts (the repo, or your own cwd) so it does not stall on the trust
  prompt. Keep built-in subagents for quick lookups.
- Run dev servers, watchers, and other long-running processes with
  `hc run --bg --name <name> --cwd <repo> -- <command>`, never your shell tool's
  background mode, so the person can see them.
- Run slow builds, test suites, and CI watches the same way and wait with
  `hc wait`, not sleep or polling.
- Name each terminal after what it runs. Leave dev servers running; remove
  finished one-off terminals once you have their result. Clean up only
  terminals you started.
