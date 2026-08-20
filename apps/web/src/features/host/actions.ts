'use server'

import { revalidatePath } from 'next/cache'
import { RedirectType, redirect } from 'next/navigation'
import { ApiError, activateHost } from '@/features/auth/api'
import { RETURN_TO_PARAM } from '@/features/auth/return-to'
import { getSession, setAccessToken } from '@/features/auth/session'
import { defaultRouteLanguage, isRoutableLanguage, path } from '@/lib/routes'
import { t } from './messages'

/**
 * Host tarafının sunucu eylemleri.
 *
 * `useActionState` sözleşmesi giriş akışıyla aynı: eylem HAZIR METİN döner,
 * anahtar değil. Başarı ayrı bir alan taşımıyor — başarının görünür karşılığı
 * sayfanın kendisi: rol yazıldığı an ekran davet ekranından panele döner.
 * "Host oldun" yazan bir kutu, altındaki panel zaten değişmişken gürültüdür.
 */

export type HostFormState = {
  error: string | null
  /** Sunucu saati: `useActionState` aynı hatayı ikinci kez gösterdiğinde de yeni bir durum olsun. */
  at: number
}

/** Sayfanın dili; gizli input ile geliyor (`email-step.tsx`'teki kalıbın aynısı). */
const LANG_FIELD = 'dil'

/**
 * "Host ol". Yaptığı iş tek bir POST ama iki tuzağı kapatıyor:
 *
 * 1. **Oturumsuz kullanıcı hata görmüyor, girişe gidiyor.** Sayfa bilinçli
 *    olarak oturumsuz da açılabiliyor (bkz. `proxy.ts`), dolayısıyla düğmeye
 *    kimliksiz basılabilir. Doğru cevap "giriş yapmalısın" yazan bir kutu değil,
 *    dönüş adresi taşıyan bir yönlendirme.
 * 2. **Taze access token ÇEREZE YAZILIYOR.** API rol claim'i eklenmiş yeni bir
 *    token döndürüyor; yazılmazsa kullanıcı host olduğu hâlde elindeki rolsüz
 *    token bitene kadar (15 dk) host uçlarından 403 alır — "host oldum ama
 *    kullanamıyorum" (docs/PLAN.md Blok 2 riski).
 */
export async function activateHostAction(
  _previous: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  const lang = languageOf(formData)

  // Kullanıcı kimliği İSTEMCİDEN GELMİYOR (CLAUDE.md #3): formda kimlik alanı
  // yok, API rolü token'daki `sub`'a yazıyor.
  const session = await getSession()
  if (!session?.accessToken) {
    redirect(signInHref(lang), RedirectType.replace)
  }

  // Çerez var ama API token'ı tanımıyor: oturum gerçekten ölü. Bunu ekranda bir
  // hata olarak göstermek kullanıcıyı çıkışsız bırakırdı — yapabileceği tek şey
  // yeniden giriş yapmak. Yönlendirme `try`'ın DIŞINDA: `redirect` NEXT_REDIRECT
  // fırlatıyor ve kendi catch'imiz onu yutardı.
  let sessionIsDead = false

  try {
    const activation = await activateHost(session.accessToken)
    await setAccessToken(activation.accessToken, activation.accessTokenExpiresAtUtc)
  } catch (error) {
    if (!(error instanceof ApiError)) throw error

    if (error.status === 401) {
      sessionIsDead = true
    } else if (error.status === 403) {
      // Tek 403 kaynağı: hesap Active değil (Suspended/Banned). Onay kapısı yok
      // ama ban var (VISION §9).
      return { error: t('host.error.blocked'), at: Date.now() }
    } else {
      // Bilinmeyen hata YUTULMAZ (CLAUDE.md #1): 500'ü "host olamadın" diye
      // göstermek gerçek arızayı kullanıcı hatası gibi gösterir.
      throw error
    }
  }

  if (sessionIsDead) {
    redirect(signInHref(lang), RedirectType.replace)
  }

  // Rol yalnız bu sayfayı değil üst çubuğu da ilgilendiriyor. Yalnız bu yolu
  // tazelemek, kullanıcı başka bir sayfaya geçtiğinde istemci router
  // önbelleğindeki host'suz görüntüyü geri getirirdi.
  revalidatePath('/', 'layout')

  /*
    NOT — bu isteğin geri kalanı hâlâ ESKİ token'ı görüyor. `getSession` React
    `cache`'iyle sarılı ve eylem ile onu izleyen yeniden render AYNI istekte
    çalışıyor; çereze yazdığımız taze token ancak BİR SONRAKİ istekte okunur.
    Sorun çıkarmıyor çünkü panelin açılıp açılmayacağı `GET /api/auth/me`'nin
    `isHost` alanından geliyor ve onun kaynağı VERİTABANI, token değil — eski
    token'la sorulsa bile cevap doğru. Panel bu yüzden aynı saniyede açılıyor.
  */
  return { error: null, at: Date.now() }
}

/**
 * Dil formdan geliyor ve `path()` onu URL'e OLDUĞU GİBİ gömüyor. Doğrulanmadan
 * geçirilirse gizli input'a yazılan bir değer yönlendirme hedefini bozabilir;
 * bilinmeyen değer varsayılan dile düşer.
 */
function languageOf(formData: FormData): string {
  const value = formData.get(LANG_FIELD)
  return typeof value === 'string' && isRoutableLanguage(value) ? value : defaultRouteLanguage
}

/** Giriş sonrası kullanıcı host sayfasına döner; `donus` değeri `safeReturnTo`'dan da geçecek. */
function signInHref(lang: string): string {
  const query = new URLSearchParams({ [RETURN_TO_PARAM]: path(lang, 'becomeHost') })
  return `${path(lang, 'signIn')}?${query.toString()}`
}
