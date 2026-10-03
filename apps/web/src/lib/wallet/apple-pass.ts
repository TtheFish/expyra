import 'server-only'

import { PKPass } from 'passkit-generator'
import { ticketPayload, type Ticket } from '@/lib/ticket'
import { appleWalletConfig } from '@/lib/wallet/config'
import { readPassIcons } from '@/lib/wallet/pass-assets'

export class AppleWalletNotConfiguredError extends Error {
  constructor() {
    super('Apple Wallet sertifikaları tanımlı değil.')
    this.name = 'AppleWalletNotConfiguredError'
  }
}

/**
 * İmzalı `.pkpass` üretir. Blok 12/7.3’te aynı üretici API’ye taşınacak —
 * web’de ikinci bir imza yolu doğmasın diye alanlar biletle birebir.
 */
export async function buildApplePass(ticket: Ticket, locale: string): Promise<Buffer> {
  const config = appleWalletConfig()
  if (!config) throw new AppleWalletNotConfiguredError()

  // Dosya okuması config kontrolünden SONRA: kimlikler yokken 503 dönmeli,
  // eksik bir dosya yüzünden 500 değil.
  const icons = readPassIcons()

  const when = formatPassDate(ticket, locale)

  const pass = new PKPass(
    icons,
    {
      wwdr: config.wwdrPem,
      signerCert: config.signerCertPem,
      signerKey: config.signerKeyPem,
      signerKeyPassphrase: config.signerKeyPassphrase,
    },
    {
      serialNumber: ticket.code,
      description: ticket.experienceTitle,
      organizationName: config.organizationName,
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(232, 82, 74)',
      labelColor: 'rgb(255, 230, 225)',
    },
  )

  pass.type = 'eventTicket'

  pass.setBarcodes({
    message: ticketPayload(ticket),
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: ticket.code,
  })

  pass.primaryFields.push({
    key: 'event',
    label: localeLabel(locale, 'experience'),
    value: ticket.experienceTitle,
  })

  pass.secondaryFields.push(
    {
      key: 'when',
      label: localeLabel(locale, 'when'),
      value: when,
    },
    {
      key: 'where',
      label: localeLabel(locale, 'where'),
      value: ticket.location,
    },
  )

  pass.auxiliaryFields.push(
    {
      key: 'host',
      label: localeLabel(locale, 'host'),
      value: ticket.hostName,
    },
    {
      key: 'guests',
      label: localeLabel(locale, 'guests'),
      value: String(ticket.guests),
    },
    {
      key: 'code',
      label: localeLabel(locale, 'code'),
      value: ticket.code,
    },
  )

  pass.backFields.push({
    key: 'note',
    label: 'Expyra',
    value: localeLabel(locale, 'backNote'),
  })

  return pass.getAsBuffer()
}

function formatPassDate(ticket: Ticket, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: ticket.timeZone,
  }).format(new Date(ticket.startsAtUtc))
}

function localeLabel(
  locale: string,
  key: 'experience' | 'when' | 'where' | 'host' | 'guests' | 'code' | 'backNote',
): string {
  const table: Record<string, Record<typeof key, string>> = {
    tr: {
      experience: 'Deneyim',
      when: 'Tarih',
      where: 'Yer',
      host: 'Host',
      guests: 'Misafir',
      code: 'Kod',
      backNote: 'Kapıda QR’ı göster. Bu bilet Expyra üzerinden düzenlendi.',
    },
    en: {
      experience: 'Experience',
      when: 'Date',
      where: 'Place',
      host: 'Host',
      guests: 'Guests',
      code: 'Code',
      backNote: 'Show the QR at the door. Issued by Expyra.',
    },
    cs: {
      experience: 'Zážitěk',
      when: 'Datum',
      where: 'Místo',
      host: 'Hostitel',
      guests: 'Hosté',
      code: 'Kód',
      backNote: 'U vchodu ukaž QR. Vstupenku vystavil Expyra.',
    },
    de: {
      experience: 'Erlebnis',
      when: 'Datum',
      where: 'Ort',
      host: 'Gastgeber',
      guests: 'Gäste',
      code: 'Code',
      backNote: 'Zeig den QR an der Tür. Ausgestellt von Expyra.',
    },
  }

  return (table[locale] ?? table.en)[key]
}
