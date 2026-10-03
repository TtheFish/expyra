import { UI_LANGUAGE_FIELD, uiLocaleOf } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import { getTicketForCurrentUser, ticketDeniedResponse } from '@/lib/ticket-access'
import { buildTicketPdf } from '@/lib/ticket-pdf'

/** PDF dosya sistemine ve font'a eriştiği için Node çalışma zamanı gerekiyor. */
export const runtime = 'nodejs'

/**
 * Bilet PDF'i.
 *
 * Erişim `getTicketForCurrentUser`'da (`lib/ticket-access.ts`):
 * - Oturum API'ye DOĞRULATILIYOR (`GET /api/auth/me`). Uydurma bir
 *   `expyra_at` çerezi 401 alır — çerezin varlığı yetmiyor.
 * - Oturum kontrolü biletten ÖNCE; anonim istek geçerli ve geçersiz kodda aynı
 *   401'i alır, yanıt farkı kod denemeye yaramaz.
 * - Bugün gerçek bilet yok; demo bilet yalnız `EXPYRA_DEMO_CONTENT=1` iken.
 *   Blok 12'de sahiplik API'de denetlenecek ve bu uç değişmeyecek.
 *
 * Proxy `/api` yollarında çalışmıyor (matcher dışında): süresi dolmuş access
 * token burada yenilenmez ve 401 alır. Bilet sayfası proxy'den geçtiği için
 * kullanıcı oradan tazelenmiş token'la gelir.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  /*
    Belgenin dili SORGUDAN geliyor: `/api/...` yolunda dil segmenti yok ve bu uç
    hem `/tr` hem `/en` sayfalarından çağrılıyor. Alan adı forma yazılanla aynı
    sabit (`arayuz-dili`) — ikisi de "bu cevabı hangi dilde yaz" sorusuna cevap.

    İstemciden gelmesi güvenlik sorunu değil: `uiLocaleOf` değeri kapalı bir
    kümeye daraltıyor, en kötü ihtimalle belge varsayılan dilde çıkar. `notFound`
    fırlatan `requireUiLocale` bilinçli KULLANILMIYOR: burada bir sayfa yok, bir
    dosya var — biçim hatası yüzünden bileti hiç vermemek orantısız.
  */
  const locale = uiLocaleOf(new URL(request.url).searchParams.get(UI_LANGUAGE_FIELD))
  const [t, { code }] = await Promise.all([getTranslator(locale), params])

  const access = await getTicketForCurrentUser(code)
  if (access.kind !== 'found') return ticketDeniedResponse(access, t)
  const { ticket } = access

  const pdf = await buildTicketPdf(ticket, locale, t)

  return new Response(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="expyra-bilet-${ticket.code}.pdf"`,
      // Bilet kişiye özel — ara katmanlarda önbelleğe alınmamalı
      'Cache-Control': 'private, no-store',
    },
  })
}
