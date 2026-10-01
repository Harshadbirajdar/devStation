import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { fetchConfig } from './configClient'
import { runCommand } from './commandRunner'
import { checkToolHealth } from './versionCheck'
import type {
  PrerequisiteConfig,
  RunCommandPayload,
  RunCommandResult
} from '../shared/types'

const isDev = !app.isPackaged
const iconPath = join(__dirname, '../../resources/icon.png')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  ipcMain.handle('command:run', async (_event, payload: RunCommandPayload): Promise<RunCommandResult> => {
    const result = await runCommand(payload.cmd, payload.cwd, (chunk) => {
      mainWindow.webContents.send('command:output', { runId: payload.runId, ...chunk })
    })
    return { code: result.code }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('config:get', () => fetchConfig())
ipcMain.handle('version:check', (_event, tool: PrerequisiteConfig) => checkToolHealth(tool))

app.whenReady().then(() => {
  // In packaged builds the .app bundle's own icon (set via electron-builder)
  // is what macOS shows — this only matters for `npm run dev`, where there
  // is no bundle yet and the Dock would otherwise show Electron's icon.
  if (isDev && process.platform === 'darwin') {
    app.dock?.setIcon(iconPath)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
