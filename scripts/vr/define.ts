import type { Locator, Page } from 'playwright'

export type VRStateContext = {
  page: Page
  element: Locator
}

export type VRState = {
  name: string
  selector?: string
  action?: (ctx: VRStateContext) => Promise<void>
  waitMs?: number
}

export type VRConfig = {
  name: string
  url?: string
  selector: string
  properties?: readonly string[]
  states?: VRState[]
  setup?: (page: Page) => Promise<void>
  viewport?: { width: number; height: number }
  waitForSelector?: string
}

export const defineVR = (config: VRConfig): VRConfig => config
