import 'server-only'

import { SignJWT, importPKCS8 } from 'jose'
import { ticketPayload, type Ticket } from '@/lib/ticket'
import { googleWalletConfig } from '@/lib/wallet/config'

export class GoogleWalletNotConfiguredError extends Error {
  constructor() {
    super('Google Wallet kimlik bilgileri tanımlı değil.')
    this.name = 'GoogleWalletNotConfiguredError'
  }
}

/**
 * "Add to Google Wallet" kaydetme URL’si.
 *
 * JWT `savetowallet` tipi: Google, imzayı issuer service account ile doğrular.
 * Sınıf yoksa ilk eklemede Console’da oluşturulmuş `eventTicketClass` gerekir
 * (`EXPYRA_GOOGLE_WALLET_CLASS_SUFFIX`).
 */
export async function buildGoogleWalletSaveUrl(ticket: Ticket, locale: string): Promise<string> {
  const config = googleWalletConfig()
  if (!config) throw new GoogleWalletNotConfiguredError()

  const classId = `${config.issuerId}.${config.classSuffix}`
  const objectId = `${config.issuerId}.${sanitizeObjectId(ticket.code)}`
  const when = new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: ticket.timeZone,
  }).format(new Date(ticket.startsAtUtc))

  const eventTicketObject = {
    id: objectId,
    classId,
    state: ticket.status === 'valid' ? 'ACTIVE' : 'COMPLETED',
    hexBackgroundColor: '#E8524A',
    ticketHolderName: ticket.hostName,
    ticketNumber: ticket.code,
    barcode: {
      type: 'QR_CODE',
      value: ticketPayload(ticket),
      alternateText: ticket.code,
    },
    seatInfo: {
      seat: {
        defaultValue: {
          language: locale,
          value: `${ticket.guests}`,
        },
      },
    },
    textModulesData: [
      {
        id: 'when',
        header: locale === 'tr' ? 'Tarih' : 'Date',
        body: when,
      },
      {
        id: 'where',
        header: locale === 'tr' ? 'Yer' : 'Place',
        body: ticket.location,
      },
      {
        id: 'experience',
        header: locale === 'tr' ? 'Deneyim' : 'Experience',
        body: ticket.experienceTitle,
      },
    ],
  }

  const eventTicketClass = {
    id: classId,
    issuerName: 'Expyra',
    reviewStatus: 'UNDER_REVIEW',
    eventName: {
      defaultValue: {
        language: locale,
        value: 'Expyra',
      },
    },
    hexBackgroundColor: '#E8524A',
  }

  const claims = {
    iss: config.clientEmail,
    aud: 'google',
    typ: 'savetowallet',
    origins: [process.env.EXPYRA_WEB_ORIGIN?.trim() || 'http://localhost:3000'],
    payload: {
      eventTicketClasses: [eventTicketClass],
      eventTicketObjects: [eventTicketObject],
    },
  }

  const key = await importPKCS8(config.privateKeyPem, 'RS256')
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key)

  return `https://pay.google.com/gp/v/save/${token}`
}

function sanitizeObjectId(code: string): string {
  return code.replace(/[^A-Za-z0-9._-]/g, '_').toLowerCase()
}
