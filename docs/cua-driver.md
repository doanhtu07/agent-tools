# Cua Driver

Desktop automation for macOS, Windows and Linux. Drives native apps in the
background through the Accessibility API (macOS) / UI Automation (Windows) —
no entering coordinates, no stealing your cursor or focus.

Source: <https://cua.ai/docs/cua-driver/quickstart>

## Requirements

- macOS 14+, Windows 10/11, or a 64-bit Linux desktop
- An MCP-capable agent (Claude Code, Codex, OpenCode, …)
- Run everything **inside the desktop session** you want the agent to drive

This is the standalone install. If you want the GUI + auto-updates on macOS 26+,
use [Cua Spaces](https://cua.ai/download) instead.

## 1. Install

**macOS / Linux**

```bash
/bin/bash -c "$(curl -fsSL https://cua.ai/driver/install.sh)"
```

**Windows**

```powershell
irm https://cua.ai/driver/install.ps1 | iex
```

## 2. Start it

**macOS** — grant both permissions, then check:

```bash
cua-driver permissions grant    # adds CuaDriver to the lists, switched off
cua-driver permissions status
```

Switch on **Accessibility** and **Screen & System Audio Recording** for
`CuaDriver.app` in System Settings. Accept any "quit and reopen" prompt — a
changed grant only applies after a full relaunch.

**Windows** — start the login task, or run the daemon in a terminal:

```powershell
cua-driver autostart kick
# fallback: cua-driver serve
```

**Linux** — run it in a terminal in the desktop session and leave it open:

```bash
sudo apt install libxi6 at-spi2-core   # minimal Debian/Ubuntu only
cua-driver serve
```

## 3. Verify

In a second terminal:

```bash
cua-driver status           # should say "Cua Driver daemon is running"
cua-driver doctor           # read the warnings, not just the exit code
cua-driver call list_apps   # should list apps you recognize
```

An empty `list_apps` means the driver cannot reach the desktop — fix the
permission or display errors `doctor` reports first.

## 4. Connect the agent

The installer already ran `cua-driver connect`, which wires up Claude Code,
Codex and Cursor if installed. To do it manually:

**Claude Code**

```bash
cua-driver skills install          # or: cua-driver mcp-config --client claude
```

**OpenCode** — `mcp-config` prints the command; the server itself is stdio:

```jsonc
// ~/.config/opencode/opencode.jsonc
"mcp": {
  "servers": {
    "cua-driver": {
      "type": "local",
      "command": ["/Users/you/.local/bin/cua-driver", "mcp"]
    }
  }
}
```

Replace the path with the one `cua-driver mcp-config` prints for your machine.

Then start a fresh agent session.

## 5. Try it

```text
Using the Cua Driver skill, open the installed calculator app,
compute 6 × 7, and read the displayed result back from a fresh snapshot.
```

Watch it work: your own pointer, keyboard focus and window stay put.

## Stop

```bash
cua-driver stop
```

## Notes

- Default permission mode is `standard`. Read
  [Permissions](https://cua.ai/docs/cua-driver/guides/permissions) before real
  work; `bounded` is the safer mode.
- Some apps only accept foreground input, and launching an app can raise its
  window. See
  [Known limits](https://cua.ai/docs/cua-driver/guides/troubleshoot#known-limits).
