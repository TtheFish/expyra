import QRCode from 'qrcode'

/**
 * Bilet verisi.
 *
 * NOT: Bu dosya bir prototip. Gerçek sistemde bilet API tarafında üretilir ve
 * imzalanır — web ve mobil aynı belgeyi indirir. Buradaki demo veri Faz 5
 * (rezervasyon) bağlandığında silinecek.
 */

export type TicketStatus = 'valid' | 'used' | 'expired'

export type Ticket = {
  /** Biletin üzerindeki insan-okur kod. QR bunun imzalı halini taşır. */
  code: string
  experienceTitle: string
  hostName: string
  location: string
  /** ISO 8601, UTC. Görüntülerken deneyimin yerel saatine çevrilir. */
  startsAtUtc: string
  timeZone: string
  guests: number
  totalAmount: number
  currency: string
  status: TicketStatus
  /** Sadece kullanılmış biletlerde dolu. */
  usedAtUtc?: string
  /** Kart görselinin rengi — gerçekte kapak fotoğrafından türetilir. */
  hue: number
}

export const DEMO_TICKETS: Ticket[] = [
  {
    code: 'EXP-7K4M-92QD',
    experienceTitle: 'Vltava Kıyısında Fotoğraf Turu',
    hostName: 'Jakub Novák',
    location: 'Prag, Çekya',
    startsAtUtc: '2026-08-14T07:30:00Z',
    timeZone: 'Europe/Prague',
    guests: 2,
    totalAmount: 70,
    currency: 'EUR',
    status: 'valid',
    hue: 220,
  },
  {
    code: 'EXP-3B8N-51WX',
    experienceTitle: 'Boğaz’da Gün Batımı Yelkeni',
    hostName: 'Deniz Arslan',
    location: 'İstanbul, Türkiye',
    startsAtUtc: '2026-06-02T16:00:00Z',
    timeZone: 'Europe/Istanbul',
    guests: 4,
    totalAmount: 3200,
    currency: 'TRY',
    status: 'used',
    usedAtUtc: '2026-06-02T16:04:00Z',
    hue: 25,
  },
  {
    code: 'EXP-9F2R-40LP',
    experienceTitle: 'Ev Yapımı Pasta Atölyesi',
    hostName: 'Sofia Almeida',
    location: 'Lizbon, Portekiz',
    startsAtUtc: '2026-05-19T09:00:00Z',
    timeZone: 'Europe/Lisbon',
    guests: 1,
    totalAmount: 62,
    currency: 'EUR',
    status: 'used',
    usedAtUtc: '2026-05-19T09:02:00Z',
    hue: 300,
  },
]

export function findTicket(code: string): Ticket | undefined {
  return DEMO_TICKETS.find((t) => t.code === code)
}

/**
 * QR içeriği. Gerçekte burada imzalı bir token olur (HMAC veya JWS) —
 * host'un tarayıcısı imzayı doğrulayarak sahte bilet üretimini engeller.
 * Düz kod yazmak yeterli değil: kod tahmin edilebilir olursa bilet kopyalanır.
 */
export function ticketPayload(ticket: Ticket): string {
  return `https://expyra.com/dogrula/${ticket.code}`
}

/** QR'ı SVG olarak üretir — her ölçekte net, yazdırmada bozulmaz. */
export function qrSvg(ticket: Ticket): Promise<string> {
  return QRCode.toString(ticketPayload(ticket), {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

/** PDF'e gömmek için PNG. pdf-lib SVG gömemiyor. */
export async function qrPngBytes(ticket: Ticket): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(ticketPayload(ticket), {
    errorCorrectionLevel: 'M',
    margin: 0,
    scale: 12,
    color: { dark: '#000000', light: '#ffffff' },
  })
  return Uint8Array.from(Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'))
}

/**
 * Deneyimin kendi saat diliminde tarih. Gezginin bulunduğu yer alakasız.
 *
 * İki ayrı kavram, ikisi de parametre: **locale** biletin hangi dilde YAZILDIĞI
 * ("14 Ağustos 2026 Cuma" / "Friday, August 14, 2026"), **timeZone** ise
 * deneyimin nerede BAŞLADIĞI. Locale değişince saat değişmez.
 *
 * Locale ilk parametre ve varsayılansız (`features/i18n/format.ts` imza kuralı):
 * biletin en kritik alanı saat, yanlış dilde basılması sessizce geçmemeli.
 *
 * Para için ayrı bir sarmalayıcı yok — `format.ts`'teki `formatMoney` birebir
 * aynı işi yapıyordu, ikinci kopya yalnız ikisinin ayrışmasına yarardı.
 */
export function formatLocalDateTime(locale: string, ticket: Ticket): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: ticket.timeZone,
  }).format(new Date(ticket.startsAtUtc))
}
