import { app } from 'electron'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { ConfigResult, DevStationConfig } from '../shared/types'
import { sampleConfig } from './sampleConfig'

// TODO: replace with your real published config, e.g.
// 'https://raw.githubusercontent.com/<owner>/devstation-config/main/config.json'
const CONFIG_URL =
  'https://raw.githubusercontent.com/<owner>/devstation-config/main/config.json'

function cacheFilePath(): string {
  return join(app.getPath('userData'), 'config-cache.json')
}

async function readCache(): Promise<DevStationConfig | null> {
  try {
    const raw = await readFile(cacheFilePath(), 'utf-8')
    return JSON.parse(raw) as DevStationConfig
  } catch {
    return null
  }
}

async function writeCache(config: DevStationConfig): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(cacheFilePath(), JSON.stringify(config, null, 2), 'utf-8')
}

export async function fetchConfig(): Promise<ConfigResult> {
  try {
    const res = await fetch(CONFIG_URL, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) throw new Error(`Config fetch failed: HTTP ${res.status}`)
    const config = (await res.json()) as DevStationConfig
    await writeCache(config)
    return { config, source: 'network' }
  } catch {
    const cached = await readCache()
    if (cached) {
      return { config: cached, source: 'cache', cachedAt: cached.updatedAt }
    }
    // No network, no cache yet (first run before a real config repo exists) —
    // fall back to the bundled sample so the app is still usable.
    return { config: sampleConfig, source: 'cache', cachedAt: sampleConfig.updatedAt }
  }
}
