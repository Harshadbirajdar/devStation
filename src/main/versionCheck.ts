import semver from 'semver'
import type { PrerequisiteConfig, ToolHealth } from '../shared/types'
import { runCommand } from './commandRunner'

export async function checkToolHealth(tool: PrerequisiteConfig): Promise<ToolHealth> {
  const result = await runCommand(tool.versionCmd, undefined)

  if (result.code !== 0) {
    return { id: tool.id, installedVersion: null, status: 'missing' }
  }

  const combined = `${result.stdout}\n${result.stderr}`
  const match = combined.match(new RegExp(tool.versionRegex))
  const installedVersion = match?.[1] ?? null

  if (!installedVersion || !semver.valid(semver.coerce(installedVersion) ?? undefined)) {
    return { id: tool.id, installedVersion, status: 'error' }
  }

  const normalized = semver.coerce(installedVersion)!.version
  const status = semver.gte(normalized, tool.minVersion) ? 'ok' : 'outdated'
  return { id: tool.id, installedVersion: normalized, status }
}
