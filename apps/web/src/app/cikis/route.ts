import { signOut } from '@/features/auth/api'
import { UI_LANGUAGE_FIELD, uiLocaleOf } from '@/features/i18n/locale'
import { path } from '@/lib/routes'
import { clearSession, getSession } from '@/features/auth/session'

/**
 * Çıkış — YALNIZ POST.
 *
 * `GET` bilerek yok: `<a href="/cikis">` olsaydı link ön-yükleyiciler, mail
 * tarayıcıları ve antivirüs proxy'leri kullanıcıyı haberi olmadan düşürürdü.
 * `GET` tanımlanmadığı için Next kendiliğinden 405 döner.
 */

export async function POST(request: Request): Promise<Response> {
  const session = await getSession()

  if (session?.refreshToken) {
    try {
      // API tarafında ailenin tamamı iptal ediliyor; bilinmeyen token da 204.
      await signOut(session.refreshToken)
    } catch (error) {
      // Hata YUTULMUYOR, loglanıyor ve akış devam ediyor: "çıkış yaptım" sözü
      // yerel çerezlerin silinmesiyle tutulur. API'ye ulaşılamadıysa token
      // sunucuda yaşamaya devam eder — bu görünür kalmalı.
      console.error('auth.sign_out.failed', error)
    }
  }

  await clearSession()

  // 303: tarayıcı POST'u GET'e çevirsin. 307 verilirse ana sayfaya POST atılır.
  //
  // Hedef DİLE DUYARLI: sabit '/' verilirse next.config kökü varsayılan dile
  // yönlendiriyor ve /en/hesap'tan çıkan kullanıcı /tr'de uyanıyordu. Dil formdan
  // geliyor — `expyra_lang` çerezi ÇÖZÜM DEĞİL, o İÇERİK dili tercihini tutuyor
  // ve 'ja' olabilir (features/i18n/locale.ts).
  const language = uiLocaleOf(new URL(request.url).searchParams.get(UI_LANGUAGE_FIELD))

  return new Response(null, { status: 303, headers: { Location: path(language, 'home') } })
}
