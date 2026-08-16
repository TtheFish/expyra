import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { formatLocalDateTime, formatMoney, qrPngBytes, type Ticket } from './ticket'

/**
 * Yazdırılabilir bilet PDF'i.
 *
 * NOT: Prototip. Üretimde bu belge API tarafında üretilecek — web ve mobil aynı
 * dosyayı indirmeli, iki ayrı üretici iki farklı bilet demektir.
 *
 * Font gömme tercihe bağlı DEĞİL: pdf-lib'in gömülü Helvetica'sı WinAnsi kodlaması
 * kullanıyor ve içinde `ğ ı ş İ` yok, Çekçe `ě š č ř ů` yok. Global bir platformda
 * standart font kullanmak, bilet üzerinde host adının bozuk çıkması demek.
 */

/**
 * Büyük harfe çevirme dile bağlıdır: Türkçe'de `i → İ`, `ı → I`. Varsayılan
 * `toUpperCase()` "Türkiye" kelimesini "TÜRKIYE" yapar. Universal bir platformda
 * bu tür sessiz bozulmalar her dilde ayrı ayrı çıkar.
 *
 * i18n katmanı geldiğinde (Faz 8) locale buradan değil kullanıcıdan gelecek.
 */
const LOCALE = 'tr-TR'

const upper = (text: string) => text.toLocaleUpperCase(LOCALE)

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 56

const INK = rgb(0.13, 0.14, 0.17)
const MUTED = rgb(0.45, 0.47, 0.52)
const HAIRLINE = rgb(0.85, 0.86, 0.89)

let cachedFont: Uint8Array | undefined

async function loadFont(): Promise<Uint8Array> {
  cachedFont ??= new Uint8Array(
    await readFile(path.join(process.cwd(), 'src/assets/fonts/Inter-Variable.ttf')),
  )
  return cachedFont
}

/** oklch tonunu kabaca RGB'ye çevirir — sadece dekoratif bant için. */
function hueToRgb(hue: number) {
  const h = ((hue % 360) + 360) % 360
  const c = 0.62
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = 0.22
  const [r, g, b] =
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x]
  return rgb(r + m, g + m, b + m)
}

/**
 * Harf aralıklı metin. pdf-lib'de `characterSpacing` yok, harfleri tek tek
 * yerleştiriyoruz. Sadece kısa etiketler için — uzun metinde kullanma.
 */
function drawTracked(
  page: PDFPage,
  text: string,
  opts: { x: number; y: number; size: number; font: PDFFont; color: RGB; tracking: number },
) {
  let cursor = opts.x
  for (const char of text) {
    page.drawText(char, {
      x: cursor, y: opts.y, size: opts.size, font: opts.font, color: opts.color,
    })
    cursor += opts.font.widthOfTextAtSize(char, opts.size) + opts.tracking
  }
}

function drawLabelled(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  x: number,
  y: number,
  label: string,
  value: string,
) {
  drawTracked(page, upper(label), {
    x, y, size: 7.5, font: fonts.regular, color: MUTED, tracking: 1.1,
  })
  page.drawText(value, {
    x, y: y - 16, size: 13, font: fonts.bold, color: INK,
  })
}

export async function buildTicketPdf(ticket: Ticket): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)

  const fontBytes = await loadFont()
  // subset: false — variable font + subset kombinasyonu pdf-lib'de glifleri
  // düşürüyor (metin katmanı doğru çıkıyor ama sayfada harfler basılmıyor).
  // Bedeli: dosya ~475 KB. Üretimde PDF API tarafında (QuestPDF) üretilecek,
  // orada statik font + subset ile ~40 KB'a inecek.
  const regular = await pdf.embedFont(fontBytes, { subset: false })
  const bold = regular
  const fonts = { regular, bold }

  pdf.setTitle(`Expyra bileti — ${ticket.experienceTitle}`)
  pdf.setSubject(`Bilet kodu ${ticket.code}`)
  pdf.setProducer('Expyra')
  pdf.setCreator('Expyra')

  const page = pdf.addPage([A4.width, A4.height])
  const contentWidth = A4.width - MARGIN * 2
  let y = A4.height - MARGIN

  // --- Marka satırı --------------------------------------------------------
  drawTracked(page, 'EXPYRA', {
    x: MARGIN, y: y - 12, size: 13, font: bold, color: INK, tracking: 3,
  })
  page.drawText('Deneyim bileti', {
    x: MARGIN, y: y - 28, size: 9.5, font: regular, color: MUTED,
  })
  y -= 56

  // --- Renk bandı (kapak görselinin yerine) --------------------------------
  page.drawRectangle({
    x: MARGIN, y: y - 8, width: contentWidth, height: 8,
    color: hueToRgb(ticket.hue),
  })
  y -= 40

  // --- Deneyim başlığı -----------------------------------------------------
  drawTracked(page, upper(ticket.location), {
    x: MARGIN, y, size: 8, font: regular, color: MUTED, tracking: 1.4,
  })
  y -= 26

  const title = ticket.experienceTitle
  const titleSize = title.length > 42 ? 19 : 23
  page.drawText(title, { x: MARGIN, y, size: titleSize, font: bold, color: INK })
  y -= 22

  page.drawText(ticket.hostName, { x: MARGIN, y, size: 12, font: regular, color: MUTED })
  y -= 40

  // --- Bilgi ızgarası ------------------------------------------------------
  const col = contentWidth / 3
  drawLabelled(page, fonts, MARGIN, y, 'Kişi', String(ticket.guests))
  drawLabelled(page, fonts, MARGIN + col, y, 'Tutar',
    formatMoney(ticket.totalAmount, ticket.currency))
  drawLabelled(page, fonts, MARGIN + col * 2, y, 'Durum',
    ticket.status === 'used' ? 'Kullanıldı' : 'Geçerli')
  y -= 46

  drawLabelled(page, fonts, MARGIN, y, 'Tarih ve saat', formatLocalDateTime(ticket))
  // IANA kimliği yerine şehir: bu belge yazdırılıp kapıya götürülüyor.
  page.drawText(`${ticket.location.split(',')[0]} saatiyle`, {
    x: MARGIN, y: y - 30, size: 8.5, font: regular, color: MUTED,
  })
  y -= 56

  // --- Kesikli ayırıcı -----------------------------------------------------
  page.drawLine({
    start: { x: MARGIN, y }, end: { x: A4.width - MARGIN, y },
    thickness: 1, color: HAIRLINE, dashArray: [4, 4],
  })
  y -= 40

  // --- QR ------------------------------------------------------------------
  const qrImage = await pdf.embedPng(await qrPngBytes(ticket))
  const qrSize = 190
  const qrX = (A4.width - qrSize) / 2

  // QR'ın arkası her zaman beyaz kalır — okunurluk için gerekli
  page.drawRectangle({
    x: qrX - 14, y: y - qrSize - 14, width: qrSize + 28, height: qrSize + 28,
    color: rgb(1, 1, 1),
    borderColor: HAIRLINE, borderWidth: 1,
  })
  page.drawImage(qrImage, { x: qrX, y: y - qrSize, width: qrSize, height: qrSize })
  y -= qrSize + 44

  // --- Kod -----------------------------------------------------------------
  const codeWidth = bold.widthOfTextAtSize(ticket.code, 16) + ticket.code.length * 2
  drawTracked(page, ticket.code, {
    x: (A4.width - codeWidth) / 2, y, size: 16, font: bold, color: INK, tracking: 2,
  })
  y -= 30

  const notice = ticket.status === 'used'
    ? 'Bu bilet giriş için kullanıldı.'
    : 'Girişte host bu kodu okutacak. Bilet tek kullanımlıktır.'
  const noticeWidth = regular.widthOfTextAtSize(notice, 10)
  page.drawText(notice, {
    x: (A4.width - noticeWidth) / 2, y, size: 10, font: regular, color: MUTED,
  })

  // --- Alt bilgi -----------------------------------------------------------
  page.drawText('expyra.com', {
    x: MARGIN, y: MARGIN - 16, size: 9, font: regular, color: MUTED,
  })
  const codeFooter = `Bilet kodu ${ticket.code}`
  page.drawText(codeFooter, {
    x: A4.width - MARGIN - regular.widthOfTextAtSize(codeFooter, 9),
    y: MARGIN - 16, size: 9, font: regular, color: MUTED,
  })

  return pdf.save()
}
