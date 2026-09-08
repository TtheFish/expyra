/**
 * Misafir teklif yanıtı — sunucu BFF ve istemci canlı özet aynı şekli konuşur.
 * `api.ts` `server-only`; tipler burada ki tarayıcı da import edebilsin.
 */

export type GuestQuoteLine = {
  guestType: string
  count: number
  unitAmountMinor: number
  lineTotalMinor: number
}

export type GuestQuote = {
  slotId: string
  startsAtUtc: string
  startsAtLocal: string
  timeZoneId: string
  headcount: number
  seats: number
  charge: { currency: string; minorUnits: number; amountMinor: number }
  display: {
    currency: string
    minorUnits: number
    amountMinor: number
    rateSnapshotId: string
    capturedAtUtc: string
  } | null
  lines: GuestQuoteLine[]
}
