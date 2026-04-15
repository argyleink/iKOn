import { describe, expect, it } from 'vitest'
import { centerOf, measureGrid, radialDelay } from './grid'

describe('grid', () => {
  it('computes cols/rows that fit inside viewport', () => {
    const m = measureGrid(480, 240, 48)
    expect(m.cols).toBe(10)
    expect(m.rows).toBe(5)
    expect(m.total).toBe(50)
  })

  it('radial delay grows with distance', () => {
    const m = measureGrid(480, 240, 48)
    const origin = centerOf(m)
    const dNear = radialDelay(22, m.cols, origin, 20)
    const dFar = radialDelay(0, m.cols, origin, 20)
    expect(dNear).toBeLessThan(dFar)
  })
})
