/**
 * Detay ↔ ödeme sayfası arasında paylaşılan sorgu parametreleri.
 *
 * Adlar arayüz dilinden bağımsız Türkçe kalıyor (mevcut `?nerede=` kararıyla aynı):
 * dil kimliğini slug taşıyor; parametre çevirmek iki tablolu bir sözleşme olurdu.
 */

export const SLOT_PARAM = 'seans'
export const ADULTS_PARAM = 'yetiskin'
export const CHILDREN_PARAM = 'cocuk'
export const INFANTS_PARAM = 'bebek'
export const CURRENCY_PARAM = 'para'

export const MAX_PARTY_PER_TIER = 20

export type PartySelection = { adults: number; children: number; infants: number }

export const DEFAULT_PARTY: PartySelection = { adults: 2, children: 0, infants: 0 }

export function partyFrom(query: Record<string, string | string[] | undefined>): PartySelection {
  return {
    adults: countFrom(query[ADULTS_PARAM], DEFAULT_PARTY.adults),
    children: countFrom(query[CHILDREN_PARAM], DEFAULT_PARTY.children),
    infants: countFrom(query[INFANTS_PARAM], DEFAULT_PARTY.infants),
  }
}

export function slotFrom(query: Record<string, string | string[] | undefined>): string | null {
  const value = query[SLOT_PARAM]
  const single = Array.isArray(value) ? value[0] : value
  return single && single.length > 0 ? single : null
}

export function currencyFrom(query: Record<string, string | string[] | undefined>): string | null {
  const value = query[CURRENCY_PARAM]
  const single = Array.isArray(value) ? value[0] : value
  return single && /^[A-Za-z]{3}$/.test(single) ? single.toUpperCase() : null
}

export function bookingQuery(
  input: PartySelection & { slotId: string; currency: string | null },
): string {
  const query = new URLSearchParams({
    [SLOT_PARAM]: input.slotId,
    [ADULTS_PARAM]: String(input.adults),
    [CHILDREN_PARAM]: String(input.children),
    [INFANTS_PARAM]: String(input.infants),
  })

  if (input.currency) query.set(CURRENCY_PARAM, input.currency)

  return query.toString()
}

function countFrom(raw: string | string[] | undefined, fallback: number): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === undefined) return fallback

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= MAX_PARTY_PER_TIER
    ? parsed
    : fallback
}
