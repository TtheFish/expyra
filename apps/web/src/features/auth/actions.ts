'use server'

import { revalidatePath } from 'next/cache'
import { RedirectType, redirect } from 'next/navigation'
import type { SimpleMessageKey, Translate } from '@/features/i18n/dictionary'
import { UI_LANGUAGE_FIELD, uiLocaleOf } from '@/features/i18n/locale'
import { getTranslator } from '@/features/i18n/translator'
import {
  type AvatarUpload,
  peekDevLoginCode,
  confirmAvatar,
  createAvatarUpload,
  deleteAvatar,
  ApiError,
  DISPLAY_NAME_MAX_LENGTH,
  requestLoginCode,
  updateProfile,
  verifyLoginCode,
} from './api'
import { clearChallenge, getChallenge, setChallenge } from './challenge'
import { safeReturnTo } from './return-to'
import { getSession, setSession } from './session'

/**
 * Giriş akışının sunucu eylemleri.
 *
 * `useActionState` sözleşmesi: her eylem HAZIR METİN döner, anahtar değil.
 * Alternatif — anahtar döndürüp istemcide çevirmek — her formun kendi hata
 * anahtarlarını prop olarak taşımasını, yani hata eşlemesinin sunucudan
 * istemciye taşınmasını gerektirirdi. Hangi API hatasının hangi metne
 * karşılık geldiği bir sunucu bilgisi (bkz. `verifyErrorKey`); orada kalıyor.
 *
 * **Metnin dili formdan geliyor** (`arayuz-dili`). Sunucu eylemi hangi
 * sayfadan çağrıldığını bilmiyor: `params` yalnız render sırasında var,
 * `expyra_lang` çerezi ise İÇERİK dili tercihini tutuyor ve `ja` olabilir.
 * Değer `uiLocaleOf` ile kapalı kümeye daraltılıyor — kimlik hâlâ istemciden
 * gelmiyor (CLAUDE.md #3), gelen tek şey hangi sözlüğün açılacağı.
 *
 * `at` alanı sunucu saatinden geliyor ve iki işe birden yarıyor: hangi eylemin
 * en son çalıştığını sıralamak (bir formda iki `useActionState` var) ve kod
 * alanını sıfırlamak için `key` üretmek.
 */
export type AuthFormState = {
  error: string | null
  at: number
}

const EMAIL_FIELD = 'eposta'
const CODE_FIELD = 'kod'
const RETURN_TO_FIELD = 'donus'

export async function requestCodeAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await translatorFor(formData)

  const email = readField(formData, EMAIL_FIELD)
  if (!email) return fail(t, 'auth.email.error.invalid')

  try {
    // Dil, kullanıcının BULUNDUĞU SAYFADAN geliyor: /tr/giris'teki kullanıcı Türkçe
    // kod postası almalı. Önceki sürüm bunu `Accept-Language`'e bırakıyordu ve
    // tarayıcısı İngilizce olan biri Türkçe ekrandan giriş yapıp İNGİLİZCE mail
    // alıyordu (ölçüldü). Adres çubuğundaki dil, tarayıcı tercihinden daha güçlü
    // bir niyet beyanı — kullanıcı o dili görmeyi zaten seçmiş.
    const issued = await requestLoginCode({
      email,
      preferredLanguage: readField(formData, UI_LANGUAGE_FIELD) || null,
    })

    await setChallenge({
      id: issued.challengeId,
      email,
      expiresAtUtc: issued.expiresAtUtc,
      resendAvailableAtUtc: issued.resendAvailableAtUtc,
      codeLength: issued.codeLength,
    })
  } catch (error) {
    return fail(t, requestErrorKey(error))
  }

  return succeed()
}

/**
 * Yeni kod, formdan gelen adrese değil ÇEREZDEKİ adrese gider. Adres istemciden
 * alınsaydı, 1. adımda hız sınırına takılan bir saldırgan 2. adımda başka bir
 * adrese kod göndertebilirdi.
 *
 * Formdan okunan TEK şey cevabın dili — adres, challenge kimliği ve kalan
 * deneme hakkı hâlâ yalnız çerezden ve API'den geliyor.
 */
export async function resendCodeAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await translatorFor(formData)

  const challenge = await getChallenge()
  if (!challenge) return fail(t, 'auth.error.expiredChallenge')

  try {
    const issued = await requestLoginCode({ email: challenge.email })

    await setChallenge({
      id: issued.challengeId,
      email: challenge.email,
      expiresAtUtc: issued.expiresAtUtc,
      resendAvailableAtUtc: issued.resendAvailableAtUtc,
      codeLength: issued.codeLength,
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds !== null) {
      // Sayı `t`'ye ham geçiyor: biçimlendirmeyi (ve İngilizce'de tekil/çoğul
      // seçimini) sözlük katmanı yapıyor.
      return failWith(t('auth.otp.error.resendTooSoon', { n: error.retryAfterSeconds }))
    }

    return fail(t, requestErrorKey(error))
  }

  return succeed()
}

export async function verifyCodeAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const t = await translatorFor(formData)

  const returnTo = safeReturnTo(readField(formData, RETURN_TO_FIELD))
  const code = readField(formData, CODE_FIELD) ?? ''

  const challenge = await getChallenge()
  if (!challenge) return fail(t, 'auth.error.expiredChallenge')

  try {
    const tokens = await verifyLoginCode({ challengeId: challenge.id, code })

    await setSession(tokens)
    await clearChallenge()
  } catch (error) {
    return fail(t, verifyErrorKey(error))
  }

  // `redirect` NEXT_REDIRECT fırlatıyor — `try` bloğunun DIŞINDA olmak zorunda,
  // aksi halde kendi catch'imiz yönlendirmeyi yutar.
  // `replace`: `push` verilirse kullanıcı geri tuşuyla giriş formuna düşer.
  redirect(returnTo, RedirectType.replace)
}

/** Adres değiştirme: challenge çerezi silinince sayfa kendiliğinden 1. adıma döner. */
export async function restartFlowAction(): Promise<void> {
  await clearChallenge()
}

/**
 * Hesap formunun durumu. Giriş akışındaki `AuthFormState`'ten ayrı: burada
 * başarı da GÖRÜNÜR bir sonuç. Giriş formunda başarı = yönlendirme, ekranda
 * duracak bir şey yok; burada kullanıcı aynı sayfada kalıyor ve "kaydedildi mi"
 * sorusunun cevabını görmek zorunda.
 */
export type ProfileFormState = {
  error: string | null
  success: string | null
  at: number
}

const DISPLAY_NAME_FIELD = 'ad'
/** Kullanıcının TERCİH ettiği içerik dili — sayfanın dili değil (`UI_LANGUAGE_FIELD`). */
const LANGUAGE_FIELD = 'dil'

export async function updateProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const t = await translatorFor(formData)

  // Kullanıcı kimliği İSTEMCİDEN GELMİYOR (CLAUDE.md #3): formda kullanıcı
  // kimliği alanı yok, API adresi token'daki `sub`'dan çözüyor.
  const session = await getSession()
  if (!session?.accessToken) {
    return profileFail(t, 'account.error.signedOut')
  }

  const displayName = readField(formData, DISPLAY_NAME_FIELD)
  const preferredLanguage = readField(formData, LANGUAGE_FIELD)

  if (displayName !== null && displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return profileFailWith(t('account.error.name', { n: DISPLAY_NAME_MAX_LENGTH }))
  }

  try {
    // İKİ ALAN DA gönderiliyor. API gövdeyi tam profil olarak okuyor: eksik
    // bırakılan alan temizleniyor, delta olarak yorumlanmıyor. Yalnız değişeni
    // göndermek, kullanıcının dil tercihini adını düzeltirken silerdi.
    await updateProfile(session.accessToken, { displayName, preferredLanguage })
  } catch (error) {
    return profileFailure(t, error)
  }

  // Ad yalnız bu sayfada değil, HER sayfanın üst çubuğunda duruyor. Yalnız hesap
  // sayfasını tazelemek, kullanıcı "Keşfet"e geçtiğinde önbellekteki eski adı
  // geri getirirdi. Statik önbellek bedeli sıfır: üst çubuk oturum okuduğu için
  // sayfaların hiçbiri zaten statik değil.
  revalidatePath('/', 'layout')

  return { error: null, success: t('account.saved'), at: Date.now() }
}

function profileFail(t: Translate, key: SimpleMessageKey): ProfileFormState {
  return profileFailWith(t(key))
}

function profileFailWith(message: string): ProfileFormState {
  return { error: message, success: null, at: Date.now() }
}

/**
 * Bilinmeyen hata YUTULMAZ (CLAUDE.md #1) — eşlenmeyen her durum yeniden
 * fırlatılıp Next'in hata sınırına gider.
 *
 * 400'ün iki ayrı şekli var ve ikisi de kullanıcıya farklı şey söylüyor:
 * `ValidationProblemDetails` (biçim hatası, alan adı `errors` sözlüğünde) ve
 * düz `ProblemDetails` (kayıt defterinde olmayan/kapalı dil).
 */
function profileFailure(t: Translate, error: unknown): ProfileFormState {
  if (error instanceof ApiError) {
    if (error.status === 401) return profileFail(t, 'account.error.signedOut')

    if (error.status === 400) {
      if (error.hasFieldError('displayName')) {
        return profileFailWith(t('account.error.name', { n: DISPLAY_NAME_MAX_LENGTH }))
      }

      // Kalan tek 400 kaynağı dil alanı: ya biçim bozuk ya da o dil kapalı.
      // API'nin `title`'ı gösterilmiyor — kullanıcının diliyle aynı olma garantisi yok.
      return profileFail(t, 'account.error.language')
    }
  }

  throw error
}

/**
 * Eylemin cevabını hangi dilde yazacağı. Bilinmeyen değer varsayılan dile
 * düşüyor — bir formun dil alanı bozuksa kullanıcıya hata metni yerine 404
 * göstermek, çözmeye çalıştığı sorunla ilgisiz bir cezalandırma olurdu.
 */
function translatorFor(formData: FormData): Promise<Translate> {
  return getTranslator(uiLocaleOf(formData.get(UI_LANGUAGE_FIELD)))
}

function readField(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function succeed(): AuthFormState {
  return { error: null, at: Date.now() }
}

function fail(t: Translate, key: SimpleMessageKey): AuthFormState {
  return failWith(t(key))
}

function failWith(message: string): AuthFormState {
  return { error: message, at: Date.now() }
}

/**
 * Bilinmeyen hata YUTULMAZ. 500'ü "e-posta geçersiz" diye göstermek gerçek arızayı
 * görünmez yapar (CLAUDE.md #1) — böyle bir durumda hata Next'in hata sınırına gider.
 */
function requestErrorKey(error: unknown): SimpleMessageKey {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'auth.email.error.invalid'
    if (error.status === 429) return 'auth.error.tooManyRequests'
  }

  throw error
}

/**
 * API'nin dört ayrı durumu (yanlış kod / süresi dolmuş / kullanılmış / hiç yok)
 * aynı 400'ü döndürüyor; ayrım yalnız sunucu logunda. Burada da tek metin:
 * farklı mesaj, "bu adres için aktif kod var mı" oracle'ı kurardı.
 */
function verifyErrorKey(error: unknown): SimpleMessageKey {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'auth.otp.error.invalid'
    if (error.status === 429) return 'auth.otp.error.locked'
    if (error.status === 403) return 'auth.error.suspended'
  }

  throw error
}

// ---------------------------------------------------------------------------
// Profil fotoğrafı
//
// Akışın ortasında TARAYICI var: imzalı adres → tarayıcı depoya PUT ediyor →
// onay. Ortadaki adım hiçbir sunucudan geçmiyor, dolayısıyla bir `<form>`
// eylemiyle ifade edilemiyor (ilan görselleriyle birebir aynı gerekçe,
// features/host/experience-actions.ts).
// ---------------------------------------------------------------------------

export type AvatarUploadResult =
  | { upload: AvatarUpload; error: null }
  | { upload: null; error: string }

export type AvatarActionResult = { error: string | null }

export async function requestAvatarUploadAction(
  language: string,
  contentType: string,
  byteSize: number,
): Promise<AvatarUploadResult> {
  const lang = uiLocaleOf(language)
  const t = await getTranslator(lang)

  const session = await getSession()
  if (!session?.accessToken) {
    return { upload: null, error: t('account.error.signedOut') }
  }

  try {
    return { upload: await createAvatarUpload(session.accessToken, { contentType, byteSize }), error: null }
  } catch (error) {
    return { upload: null, error: avatarFailure(t, error) }
  }
}

export async function confirmAvatarAction(
  language: string,
  storageKey: string,
): Promise<AvatarActionResult> {
  return runAvatarAction(language, (token) => confirmAvatar(token, storageKey))
}

export async function deleteAvatarAction(language: string): Promise<AvatarActionResult> {
  return runAvatarAction(language, (token) => deleteAvatar(token))
}

async function runAvatarAction(
  language: string,
  call: (accessToken: string) => Promise<unknown>,
): Promise<AvatarActionResult> {
  const t = await getTranslator(uiLocaleOf(language))

  const session = await getSession()
  if (!session?.accessToken) {
    return { error: t('account.error.signedOut') }
  }

  try {
    await call(session.accessToken)
  } catch (error) {
    return { error: avatarFailure(t, error) }
  }

  // Avatar üst çubukta da duruyor: yalnız hesap sayfasını tazelemek, kullanıcı
  // başka bir sayfaya geçtiğinde eski fotoğrafı geri getirirdi (ad ile aynı durum).
  revalidatePath('/', 'layout')

  return { error: null }
}

/**
 * Sunucunun MESAJI kullanılmıyor: Türkçe ve arayüz iki dilde. Dal seçimi
 * makine-okunur koda göre (`AppException.Code`), metin sözlükten.
 *
 * Eşlenmeyen her şey YENİDEN FIRLATILIYOR (CLAUDE.md #1).
 */
function avatarFailure(t: Translate, error: unknown): string {
  if (error instanceof ApiError) {
    const key = error.code ? AVATAR_ERROR_KEYS[error.code] : undefined
    if (key) return t(key)

    if (error.status === 401) return t('account.error.signedOut')
    if (error.status === 400) return t('host.media.error.unsupported')
    if (error.status === 404 || error.status === 409) return t('host.media.error.rejected')
  }

  throw error
}

/** Kodlar `Expyra.Application.Features.Media.MediaConflict` sabitleriyle birebir. */
const AVATAR_ERROR_KEYS: Record<string, SimpleMessageKey> = {
  'media-not-uploaded': 'host.media.error.notUploaded',
  'media-not-an-image': 'host.media.error.notAnImage',
  'media-content-type-mismatch': 'host.media.error.mismatch',
  'media-too-small': 'host.media.error.tooSmall',
  'media-too-large': 'host.media.error.tooLarge',
}

/**
 * GELİŞTİRME ARACI — giriş ekranındaki "kod" şeridini tazeler.
 *
 * Sayfa ilk çizimde kodu SUNUCUDA okuyor; bu eylem yalnız "yeniden gönder"den sonra
 * gerekiyor, çünkü o akış sayfayı yeniden çizmiyor (form eylemi durum döndürüyor,
 * yönlendirme yapmıyor) ve ekrandaki kod eskimiş oluyor.
 *
 * Üretimde `peekDevLoginCode` daima `null` dönüyor.
 */
export async function peekDevLoginCodeAction(
  email: string,
  codeLength: number,
): Promise<string | null> {
  return peekDevLoginCode(email, codeLength)
}
