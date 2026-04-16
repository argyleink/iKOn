import { defineVR } from '../../../scripts/vr/define'

export default defineVR({
  name: 'Cell',
  url: '/',
  selector: 'button.superellipse:not([data-empty])',
  waitForSelector: 'button.superellipse',
  viewport: { width: 1280, height: 800 },
  states: [
    { name: 'default' },
    {
      name: 'hover',
      action: async ({ element }) => {
        await element.hover()
      },
      waitMs: 200,
    },
  ],
})
