import { describe, expect, it } from 'vitest'
import { DEMO_TICKETS } from './ticket'
import { resolveTicketAccess, visibleDemoTickets } from './ticket-lookup'

const knownCode = DEMO_TICKETS[0]!.code

describe('resolveTicketAccess', () => {
  it('oturumsuz istek, demo açık ve kod geçerli olsa da 401', () => {
    expect(resolveTicketAccess({ signedIn: false, demoEnabled: true, code: knownCode })).toEqual({
      kind: 'unauthenticated',
    })
  })

  it('oturumsuz istekte geçerli ve geçersiz kod aynı yanıtı alır (enumeration yok)', () => {
    const valid = resolveTicketAccess({ signedIn: false, demoEnabled: true, code: knownCode })
    const invalid = resolveTicketAccess({ signedIn: false, demoEnabled: true, code: 'EXP-YOK' })
    expect(valid).toEqual(invalid)
  })

  it('demo kapalıyken demo kodu da bulunamaz', () => {
    expect(resolveTicketAccess({ signedIn: true, demoEnabled: false, code: knownCode })).toEqual({
      kind: 'notFound',
    })
  })

  it('oturum geçerli + demo açık → bilet', () => {
    const result = resolveTicketAccess({ signedIn: true, demoEnabled: true, code: knownCode })
    expect(result.kind).toBe('found')
    expect(result.kind === 'found' && result.ticket.code).toBe(knownCode)
  })

  it('bilinmeyen kod → 404', () => {
    expect(resolveTicketAccess({ signedIn: true, demoEnabled: true, code: 'EXP-YOK' })).toEqual({
      kind: 'notFound',
    })
  })
})

describe('visibleDemoTickets', () => {
  it('demo kapalıyken boş', () => {
    expect(visibleDemoTickets(false)).toEqual([])
  })

  it('demo açıkken tüm demo biletler', () => {
    expect(visibleDemoTickets(true)).toHaveLength(DEMO_TICKETS.length)
  })
})
