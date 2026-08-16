/**
 * Oturum çerezlerinin adları ve ayarları — TEK tanım.
 *
 * Bu dosyada bilerek `import 'server-only'` YOK. `proxy.ts` aynı çerezleri okuyup
 * yazıyor ve proxy bir Server Component değil: RSC koşulu uygulanmadığı için
 * `server-only` paketi orada çalışma anında istisna fırlatır. Ad veya `path`
 * ikilemesi ise sessiz oturum kaybı demek (proxy bir ada yazar, `cookies()` başka
 * bir adı okur) — bu yüzden ikisi de buradan geliyor.
 *
 * Token'lar `httpOnly` çerezde, localStorage'da DEĞİL: Server Component'ler
 * localStorage'ı göremez, XSS'te token tek satırda okunur, ve rotasyon istemci
 * JS'ine bırakılırsa iki sekme aynı refresh token için yarışır.
 */


export const ACCESS_COOKIE = 'expyra_at'
export const REFRESH_COOKIE = 'expyra_rt'
export const CHALLENGE_COOKIE = 'expyra_otp'

/**
 * Challenge çerezi kök yola yazılıyor.
 *
 * Eskiden `/giris`e daraltılmıştı — çerezi yalnız giriş ekranına göndermek
 * doğru içgüdü. Ama giriş yolu artık dile bağlı (`/tr/giris`, `/en/sign-in`);
 * tek bir sabit `path` yazılırsa kullanıcı diğer dilde giriş yaptığında çerez
 * hiç gönderilmez ve akış sessizce 1. adıma çakılır. Dinamik `path` de işe
 * yaramaz: silme işlemi yazarkenkiyle AYNI path'i vermek zorunda, dil değişmiş
 * olabilir ve çerez kalıcı olarak silinemez hale gelir.
 *
 * Bedeli: 10 dakika boyunca her isteğe ~100 bayt ekleniyor. İçeriği
 * challengeId + kullanıcının kendi e-postası, `httpOnly` ve `sameSite=lax`.
 */
export const CHALLENGE_COOKIE_PATH = '/'

const SESSION_COOKIE_PATH = '/'

export type CookieWriteOptions = {
  httpOnly: true
  secure: boolean
  sameSite: 'lax'
  path: string
  expires?: Date
  maxAge?: number
}

/** Dev http üzerinden çalışıyor; `secure` orada çerezi tamamen öldürürdü. */
function isSecureRuntime(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * Prod'da `__Host-` öneki: alt alan adından çerez enjeksiyonunu tarayıcı düzeyinde
 * keser. Önek `Path=/` + `Secure` + `Domain` yokluğu şart koşar — bu yüzden yalnız
 * oturum çerezlerine uygulanıyor, `path=/giris` olan challenge çerezine değil
 * (orada tarayıcı çerezi sessizce reddederdi).
 */
function sessionCookieName(base: string): string {
  return isSecureRuntime() ? `__Host-${base}` : base
}

export function accessCookieName(): string {
  return sessionCookieName(ACCESS_COOKIE)
}

export function refreshCookieName(): string {
  return sessionCookieName(REFRESH_COOKIE)
}

/**
 * `sameSite: 'strict'` DEĞİL: e-postadaki bağlantıdan gelen kullanıcı ilk isteğinde
 * çıkış yapmış görünür (Faz 7.4 bilet postaları tam olarak böyle çalışıyor).
 */
function baseOptions(path: string): CookieWriteOptions {
  return {
    httpOnly: true,
    secure: isSecureRuntime(),
    sameSite: 'lax',
    path,
  }
}

/**
 * Ömür sunucunun verdiği ISO damgasından geliyor, sabit bir süreden değil:
 * refresh token'ın mutlak tavanı (90 gün) rotasyonla uzamıyor, dolayısıyla
 * "30 gün" yazmak tavana yakın oturumlarda ölü bir token için çerez bırakırdı.
 */
export function sessionCookieOptions(expiresAtUtc: string): CookieWriteOptions {
  const expires = new Date(expiresAtUtc)
  const options = baseOptions(SESSION_COOKIE_PATH)

  return Number.isNaN(expires.getTime()) ? options : { ...options, expires }
}

export function challengeCookieOptions(maxAgeSeconds: number): CookieWriteOptions {
  return { ...baseOptions(CHALLENGE_COOKIE_PATH), maxAge: Math.max(0, Math.floor(maxAgeSeconds)) }
}

/** Silme: `maxAge: 0`. Adı ve `path`'i yazarkenkiyle aynı olmalı, yoksa çerez kalır. */
export function clearedCookieOptions(path: string): CookieWriteOptions {
  return { ...baseOptions(path), maxAge: 0 }
}

export { SESSION_COOKIE_PATH }
