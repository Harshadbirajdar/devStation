import type { DevStationApi } from './index'

declare global {
  interface Window {
    api: DevStationApi
  }
}
