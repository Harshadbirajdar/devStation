export interface PrerequisiteConfig {
  id: string
  label: string
  platform?: string
  versionCmd: string
  versionRegex: string
  minVersion: string
  fixCmd: string
}

export interface ProjectStepConfig {
  id: string
  label: string
  cmd: string
  cwd?: string
}

export interface ProjectConfig {
  id: string
  name: string
  /** Tool/version requirements specific to this project (e.g. this repo
   *  needs Node 18 even though the machine default is 20). Same shape and
   *  check/fix behavior as the machine-wide prerequisites. */
  requiredTools?: PrerequisiteConfig[]
  steps: ProjectStepConfig[]
}

export interface ScriptConfig {
  id: string
  label: string
  description?: string
  platform?: string
  /** Script body. A string[] is joined with "\n" — lets config authors write
   *  a multi-line script without hand-escaping newlines in JSON. */
  script: string | string[]
  /** Working directory the script runs in. Supports "~" expansion. */
  cwd?: string
}

export interface DevStationConfig {
  version: string
  updatedAt: string
  prerequisites: PrerequisiteConfig[]
  projects: ProjectConfig[]
  scripts?: ScriptConfig[]
}

export type ConfigSource = 'network' | 'cache'

export interface ConfigResult {
  config: DevStationConfig
  source: ConfigSource
  cachedAt?: string
}

export type ToolStatus = 'checking' | 'missing' | 'outdated' | 'ok' | 'error'

export interface ToolHealth {
  id: string
  installedVersion: string | null
  status: ToolStatus
}

export interface RunCommandPayload {
  runId: string
  cmd: string
  cwd?: string
}

export interface RunCommandOutputChunk {
  runId: string
  stream: 'stdout' | 'stderr'
  data: string
}

export interface RunCommandResult {
  code: number | null
}
