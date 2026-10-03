import { describe, expect, it } from 'vitest'
import { isDemoContentEnabled } from './demo-content'

describe('isDemoContentEnabled', () => {
  it('tanımsızken kapalı (prod varsayılanı)', () => {
    expect(isDemoContentEnabled({})).toBe(false)
  })

  it('yalnız "1" açar', () => {
    expect(isDemoContentEnabled({ EXPYRA_DEMO_CONTENT: '1' })).toBe(true)
    expect(isDemoContentEnabled({ EXPYRA_DEMO_CONTENT: ' 1 ' })).toBe(true)
  })

  it.each(['0', '', 'true', 'yes', 'on'])('"%s" kapalı sayılır', (value) => {
    expect(isDemoContentEnabled({ EXPYRA_DEMO_CONTENT: value })).toBe(false)
  })
})
