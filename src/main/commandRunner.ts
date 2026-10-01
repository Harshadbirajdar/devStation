import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface CommandOutputChunk {
  stream: 'stdout' | 'stderr'
  data: string
}

export interface CommandResult {
  code: number | null
  stdout: string
  stderr: string
}

function expandHome(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return path
}

export function runCommand(
  cmd: string,
  cwd: string | undefined,
  onOutput?: (chunk: CommandOutputChunk) => void
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const shell = process.env.SHELL || '/bin/zsh'
    const resolvedCwd = cwd ? expandHome(cwd) : undefined

    // Fail fast with a clear message instead of a cryptic shell-level ENOENT
    // when a script's configured path doesn't exist (e.g. the project hasn't
    // been cloned yet, or a typo in the config).
    if (resolvedCwd && (!existsSync(resolvedCwd) || !statSync(resolvedCwd).isDirectory())) {
      const message = `Working directory does not exist: ${resolvedCwd}\n`
      onOutput?.({ stream: 'stderr', data: message })
      resolve({ code: null, stdout: '', stderr: message })
      return
    }

    const child = spawn(shell, ['-lc', cmd], {
      cwd: resolvedCwd,
      env: process.env
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (buf: Buffer) => {
      const data = buf.toString()
      stdout += data
      onOutput?.({ stream: 'stdout', data })
    })

    child.stderr.on('data', (buf: Buffer) => {
      const data = buf.toString()
      stderr += data
      onOutput?.({ stream: 'stderr', data })
    })

    child.on('error', (err) => {
      stderr += `\n${err.message}`
      onOutput?.({ stream: 'stderr', data: `${err.message}\n` })
      resolve({ code: null, stdout, stderr })
    })

    child.on('close', (code) => {
      resolve({ code, stdout, stderr })
    })
  })
}
