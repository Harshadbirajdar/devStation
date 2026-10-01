import { contextBridge, ipcRenderer } from 'electron'
import type {
  ConfigResult,
  PrerequisiteConfig,
  RunCommandOutputChunk,
  RunCommandPayload,
  RunCommandResult,
  ToolHealth
} from '../shared/types'

const api = {
  getConfig: (): Promise<ConfigResult> => ipcRenderer.invoke('config:get'),

  checkVersion: (tool: PrerequisiteConfig): Promise<ToolHealth> =>
    ipcRenderer.invoke('version:check', tool),

  runCommand: (
    payload: RunCommandPayload,
    onOutput: (chunk: RunCommandOutputChunk) => void
  ): Promise<RunCommandResult> => {
    const listener = (_event: Electron.IpcRendererEvent, chunk: RunCommandOutputChunk): void => {
      if (chunk.runId === payload.runId) onOutput(chunk)
    }
    ipcRenderer.on('command:output', listener)
    return ipcRenderer
      .invoke('command:run', payload)
      .finally(() => ipcRenderer.removeListener('command:output', listener))
  }
}

contextBridge.exposeInMainWorld('api', api)

export type DevStationApi = typeof api
