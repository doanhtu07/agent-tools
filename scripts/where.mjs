#!/usr/bin/env node
/**
 * where — show where MCP servers and skills actually live.
 *
 * Answers "is this thing global or project-local, and which file wins?" for
 * OpenCode and Claude Code. Each tool exposes a different half of the answer:
 * OpenCode reports config *files*, Claude reports *scopes*.
 *
 *   pnpm where            # both sections
 *   pnpm where mcp        # MCP servers only
 *   pnpm where skills     # skills only
 *   pnpm where -C ../x    # inspect another directory
 *   pnpm where --json     # machine-readable
 *
 * No dependencies. Reads OpenCode's resolved config (via `opencode debug
 * config`) and Claude Code's config files directly. Never prints secrets.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const HOME = os.homedir()

/** Precedence tiers, low to high. Mirrors documented resolution order so a
 * shadowed copy of a skill can be told apart from the one that actually loads. */
const TIER = {
  builtin: 0,
  claude: 100,
  agents: 200,
  opencodeGlobal: 300,
  opencodeProject: 400,
  project: 400,
}

const SECRET_QUERY =
  /([?&](?:userToken|token|access_token|api[_-]?key|apikey|key|secret)=)[^&\s]+/gi
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/g

const HELP = `
where — where do MCP servers and skills live?

Usage
  where [mcp|skills|all] [--json] [-C <dir>]

Options
  mcp            list MCP servers with the config file that defines them
  skills         list skills with the file that defines them, and which copy wins
  all            both (default)
  --json         emit JSON instead of tables
  -C, --dir      inspect <dir> instead of the current directory
  -h, --help     this text

Notes
  OpenCode is read through \`opencode debug config\`, so the result is the merged
  config with a file path per entry. Claude Code is read from ~/.claude.json and
  ./.mcp.json. Secrets are redacted; endpoint columns are for identification only.
`.trim()

main()

function main() {
  const args = process.argv.slice(2)
  let command = 'all'
  let dir = process.cwd()
  let json = false

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--json') json = true
    else if (arg === '-C' || arg === '--dir') {
      const value = args[++i]
      if (!value) die(`${arg} needs a directory`)
      dir = path.resolve(value)
    } else if (arg === '-h' || arg === '--help') {
      console.log(HELP)
      process.exit(0)
    } else if (arg.startsWith('-')) {
      die(`unknown flag: ${arg}`)
    } else if (command === 'all' && ['mcp', 'skills', 'all'].includes(arg)) {
      command = arg
    } else {
      die(`unknown command: ${arg}`)
    }
  }

  if (!isDir(dir)) die(`not a directory: ${dir}`)

  const available = {
    opencode: hasBinary('opencode'),
    claude: hasBinary('claude'),
  }
  const result = { directory: dir, mcp: [], skills: [] }

  if (command !== 'skills') {
    result.mcp = [...opencodeMcp(dir), ...claudeMcp(dir)].sort(
      (a, b) => a.tool.localeCompare(b.tool) || a.name.localeCompare(b.name),
    )
  }

  if (command !== 'mcp') {
    result.skills = [...opencodeSkills(dir), ...claudeSkills(dir)].sort(
      (a, b) =>
        a.tool.localeCompare(b.tool) ||
        a.id.localeCompare(b.id) ||
        b.rank - a.rank,
    )
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (command !== 'skills') {
    section('MCP servers')
    for (const tool of ['opencode', 'claude']) {
      const rows = result.mcp.filter((row) => row.tool === tool)
      heading(tool, rows.length, available[tool])
      if (!rows.length) {
        if (available[tool]) console.log(dim('    none configured'))
        console.log()
        continue
      }
      printTable(
        rows.map((row) => [
          row.name,
          row.scope,
          row.transport,
          row.origin,
          row.endpoint,
        ]),
        ['NAME', 'SCOPE', 'TYPE', 'ORIGIN', 'ENDPOINT'],
      )
      console.log()
    }
  }

  if (command !== 'mcp') {
    section('Skills')
    for (const tool of ['opencode', 'claude']) {
      const rows = result.skills.filter((row) => row.tool === tool)
      heading(tool, rows.length, available[tool])
      if (!rows.length) {
        if (available[tool]) console.log(dim('    none found'))
        console.log()
        continue
      }
      printTable(
        rows.map((row) => [
          row.id,
          row.scope,
          row.shadowed ? 'shadowed' : 'active',
          row.file,
        ]),
        ['SKILL', 'SCOPE', 'STATE', 'PATH'],
      )
      if (rows.some((row) => row.shadowed)) {
        console.log(
          dim(
            '    shadowed: defined again in a higher tier; that copy is the one loaded',
          ),
        )
      }
      console.log()
    }
    console.log(
      dim(
        'Claude built-in and plugin skills are not on disk, so they are not listed here. ' +
          'Use /skills inside Claude Code for the full set.',
      ),
    )
  }
}

// --- OpenCode -------------------------------------------------------------

function opencodeMcp(dir) {
  const raw = run('opencode', ['debug', 'config'], dir)
  let docs
  try {
    docs = JSON.parse(raw ?? '')
  } catch {
    return []
  }

  const rows = []
  for (const doc of docs) {
    const servers = doc?.info?.mcp?.servers
    if (!servers) continue
    const file = doc.path ?? '(built-in)'
    for (const [name, cfg] of Object.entries(servers)) {
      // `opencode debug config` masks any URL that carries a credential as "***".
      const url = cfg?.url === '***' ? '<redacted>' : cfg?.url
      rows.push({
        tool: 'opencode',
        name,
        scope: opencodeScope(file),
        transport: cfg?.type ?? '?',
        origin: tildify(file),
        endpoint: redact(url ?? cfg?.command?.join?.(' ') ?? ''),
      })
    }
  }
  return rows
}

function opencodeSkills(dir) {
  const found = []

  for (const skill of opencodeBuiltins(dir)) {
    found.push({
      tool: 'opencode',
      id: skill.id,
      file: skill.file,
      scope: 'built-in',
      rank: TIER.builtin,
    })
  }

  const roots = [
    ...projectRoots(
      dir,
      '.claude/skills',
      TIER.claude,
      'project (claude compat)',
    ),
    ...projectRoots(dir, '.agents/skills', TIER.agents, 'project (.agents)'),
    {
      root: path.join(HOME, '.claude', 'skills'),
      label: 'global (claude compat)',
      rank: TIER.claude,
    },
    {
      root: path.join(HOME, '.agents', 'skills'),
      label: 'global (.agents)',
      rank: TIER.agents,
    },
    {
      root: path.join(HOME, '.config', 'opencode', 'skills'),
      label: 'global',
      rank: TIER.opencodeGlobal,
    },
    ...projectRoots(dir, '.opencode/skills', TIER.opencodeProject, 'project'),
  ]

  for (const entry of roots) {
    for (const skill of scanSkills(entry.root)) {
      found.push({
        tool: 'opencode',
        id: skill.id,
        file: tildify(skill.file),
        scope: entry.label,
        rank: entry.rank,
      })
    }
  }

  return markShadowed(found)
}

/** Built-ins have no on-disk path; only the running server knows their ids. */
function opencodeBuiltins(dir) {
  let payload
  try {
    payload = JSON.parse(
      run('opencode', ['api', 'GET', '/api/skill'], dir) ?? '',
    )
  } catch {
    return []
  }
  return (payload?.data ?? [])
    .filter(
      (skill) =>
        typeof skill.path === 'string' && skill.path.startsWith('skill://'),
    )
    .map((skill) => ({ id: skill.id, file: skill.path }))
}

function opencodeScope(file) {
  if (!file || file === '(built-in)') return 'built-in'
  if (file.startsWith(path.join(HOME, '.config', 'opencode') + path.sep))
    return 'global'
  if (file.startsWith('/etc/opencode' + path.sep)) return 'system'
  return 'project'
}

// --- Claude Code ----------------------------------------------------------

function claudeMcp(dir) {
  const rows = []
  const userFile = path.join(HOME, '.claude.json')
  const user = readJson(userFile)

  for (const [name, cfg] of Object.entries(user?.mcpServers ?? {})) {
    rows.push(claudeRow(name, cfg, 'user', userFile))
  }

  for (const [project, entry] of Object.entries(user?.projects ?? {})) {
    for (const [name, cfg] of Object.entries(entry?.mcpServers ?? {})) {
      rows.push(
        claudeRow(name, cfg, 'local', userFile, `project: ${tildify(project)}`),
      )
    }
  }

  const projectFile = path.join(dir, '.mcp.json')
  for (const [name, cfg] of Object.entries(
    readJson(projectFile)?.mcpServers ?? {},
  )) {
    rows.push(claudeRow(name, cfg, 'project', projectFile))
  }

  return rows
}

function claudeRow(name, cfg, scope, file, detail) {
  const command = [cfg?.command, ...(cfg?.args ?? [])].filter(Boolean).join(' ')
  return {
    tool: 'claude',
    name,
    scope: detail ? `${scope} (${detail})` : scope,
    transport: cfg?.type ?? (cfg?.url ? 'http' : 'stdio'),
    origin: tildify(file),
    endpoint: redact(cfg?.url ?? command),
  }
}

function claudeSkills(dir) {
  const found = []

  for (const suffix of ['skills', 'commands']) {
    for (const skill of scanSkills(path.join(HOME, '.claude', suffix))) {
      found.push({
        tool: 'claude',
        id: skill.id,
        file: tildify(skill.file),
        scope: 'personal',
        rank: TIER.claude,
      })
    }
    for (const base of ancestors(dir)) {
      for (const skill of scanSkills(path.join(base, '.claude', suffix))) {
        found.push({
          tool: 'claude',
          id: skill.id,
          file: tildify(skill.file),
          scope: 'project',
          rank: TIER.project,
        })
      }
    }
  }

  return markShadowed(found)
}

// --- shared ---------------------------------------------------------------

function scanSkills(root) {
  if (!isDir(root)) return []
  const out = []
  walk(root, root, 0, out)
  return out
}

/** Root-level *.md are skills; a nested dir with SKILL.md is one skill and is
 * not searched further. Depth-limited like the docs describe. */
function walk(root, current, depth, out) {
  if (depth > 6) return
  let entries
  try {
    entries = fs.readdirSync(current, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const full = path.join(current, entry.name)
    // ~/.claude/skills is often symlinks into a canonical dir, so follow them.
    const asDirectory =
      entry.isDirectory() || (entry.isSymbolicLink() && isDir(full))
    if (asDirectory) {
      if (fs.existsSync(path.join(full, 'SKILL.md'))) {
        out.push({ id: entry.name, file: path.join(full, 'SKILL.md') })
      } else {
        walk(root, full, depth + 1, out)
      }
    } else if (depth === 0 && entry.name.endsWith('.md')) {
      out.push({ id: entry.name.slice(0, -3), file: full })
    }
  }
}

/** Project skill dirs, farthest ancestor (lowest) to cwd (highest). */
function projectRoots(from, suffix, baseRank, label) {
  return ancestors(from).map((base, index) => ({
    root: path.join(base, suffix),
    label,
    rank: baseRank + index,
  }))
}

/** Ancestors from the git root down to `from`; just `from` outside a repo. */
function ancestors(from) {
  const resolved = path.resolve(from)
  const root = gitRoot(resolved)
  if (!root) return [resolved]

  const chain = []
  let current = resolved
  while (true) {
    chain.unshift(current)
    if (current === root) break
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }
  return chain
}

function gitRoot(from) {
  let current = from
  while (true) {
    if (fs.existsSync(path.join(current, '.git'))) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

/** Highest rank per id wins; the rest are reported as shadowed. */
function markShadowed(rows) {
  const best = new Map()
  for (const row of rows) {
    const key = `${row.tool}:${row.id}`
    const current = best.get(key)
    if (!current || row.rank > current.rank) best.set(key, row)
  }
  return rows.map((row) => ({
    ...row,
    shadowed: best.get(`${row.tool}:${row.id}`) !== row,
  }))
}

function printTable(rows, headers) {
  const widths = headers.map((header, column) =>
    Math.max(
      header.length,
      ...rows.map((row) => String(row[column] ?? '').length),
    ),
  )
  const line = (cells) =>
    '    ' +
    cells
      .map((cell, index) => String(cell ?? '').padEnd(widths[index]))
      .join('  ')
  console.log(dim(line(headers)))
  for (const row of rows) console.log(line(row))
}

function heading(tool, count, installed) {
  console.log(
    installed
      ? `  ${bold(tool)} ${dim(`(${count})`)}`
      : `  ${bold(tool)} ${dim('(not on PATH)')}`,
  )
}

function section(title) {
  console.log(`\n${bold(title)}`)
}

function tildify(value) {
  if (!value) return value
  return value.startsWith(HOME + path.sep)
    ? '~' + value.slice(HOME.length)
    : value
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function isDir(target) {
  try {
    return fs.statSync(target).isDirectory()
  } catch {
    return false
  }
}

function hasBinary(bin) {
  return (process.env.PATH ?? '')
    .split(path.delimiter)
    .filter(Boolean)
    .some((entry) => {
      try {
        fs.accessSync(path.join(entry, bin), fs.constants.X_OK)
        return true
      } catch {
        return false
      }
    })
}

function run(bin, binArgs, cwd) {
  try {
    return execFileSync(bin, binArgs, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 20_000,
      maxBuffer: 16 * 1024 * 1024,
    }).trim()
  } catch {
    return null
  }
}

function redact(value) {
  return String(value ?? '')
    .replace(SECRET_QUERY, '$1<redacted>')
    .replace(BEARER, '$1<redacted>')
}

function dim(value) {
  return process.stdout.isTTY && !process.env.NO_COLOR
    ? `\x1b[2m${value}\x1b[0m`
    : String(value)
}

function bold(value) {
  return process.stdout.isTTY && !process.env.NO_COLOR
    ? `\x1b[1m${value}\x1b[0m`
    : String(value)
}

function die(message) {
  console.error(`where: ${message}`)
  console.error('run with --help for usage')
  process.exit(2)
}
