import { getSession } from '@/features/auth/session'
import { findTicket } from '@/lib/ticket'
import { buildTicketPdf } from '@/lib/ticket-pdf'

/** PDF dosya sistemine ve font'a eriştiği için Node çalışma zamanı gerekiyor. */
export const runtime = 'nodejs'

/**
 * Bilet PDF'i.
 *
 * **Neden yalnız oturum kontrolü var (ve neden bu bir ARA ADIM):**
 * Demo biletler (`lib/ticket.ts`) hiçbir kullanıcıya bağlı değil — sahiplik
 * kontrolü yapılacak bir alan yok. Doğrusu "bu bilet bu kullanıcının mı" sorusu
 * ve o soru Blok 9/12'de, `booking.UserId` geldiğinde cevaplanabilir hale gelecek
 * (PDF de o zaman API'ye taşınıyor, PLAN Blok 12). Bugünkü durum ise "kodu bilen
 * herkes indirir": bilet kodu bir sır değil, ekranda ve QR'da açıkta duruyor.
 * Oturum kapısı bu yüzeyi anonim internetten alıp giriş yapmış kullanıcılara
 * daraltıyor — tam çözüm değil, ama ölçülebilir bir daraltma.
 *
 * Kontrol sırası önemli: oturum kontrolü biletten ÖNCE. Tersi olsaydı anonim
 * istek geçerli kodda 401, geçersiz kodda 404 alır ve yanıt farkı kod
 * denemeye (enumeration) yarayan bir kanal olurdu.
 *
 * `getSession()` yalnız çerezin VARLIĞINA bakıyor, token'ı doğrulamıyor —
 * `proxy.ts` ile aynı iyimser kalıp. Buradaki fark: proxy `/api` yollarında hiç
 * çalışmıyor (matcher dışında), yani süresi dolmuş access token bu uçta
 * yenilenmiyor. Bilet API'ye taşındığında doğrulama gerçek olacak.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getSession()

  if (!session) {
    return Response.json(
      { title: 'Bileti görmek için giriş yapmalısın.', status: 401 },
      { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const { code } = await params
  const ticket = findTicket(code)

  if (!ticket) {
    return Response.json(
      { title: 'Bilet bulunamadı.', status: 404 },
      { status: 404, headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  const pdf = await buildTicketPdf(ticket)

  return new Response(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="expyra-bilet-${ticket.code}.pdf"`,
      // Bilet kişiye özel — ara katmanlarda önbelleğe alınmamalı
      'Cache-Control': 'private, no-store',
    },
  })
}
