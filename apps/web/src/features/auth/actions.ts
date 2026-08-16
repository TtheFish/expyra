'use server'

import { RedirectType, redirect } from 'next/navigation'
import { ApiError, requestLoginCode, verifyLoginCode } from './api'
import { clearChallenge, getChallenge, setChallenge } from './challenge'
import { formatNumber, t, type MessageKey } from './messages'
import { safeReturnTo } from './return-to'
import { setSession } from './session'

/**
 * Giriş akışının sunucu eylemleri.
 *
 * `useActionState` sözleşmesi: her eylem HAZIR METİN döner, anahtar değil —
 * çeviri Faz 8.1'de `messages.ts`'ten gelecek ve istemciye anahtar sızdırmanın
 * bir faydası yok.
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
  const email = readField(formData, EMAIL_FIELD)
  if (!email) return fail('auth.email.error.invalid')

  try {
    // `preferredLanguage` gönderilmiyor: arayüz dili henüz kullanıcıya sorulmuyor
    // ve `Accept-Language` zaten API'ye iletiliyor. Sabit 'tr' yazmak, tarayıcı
    // tercihini sessizce ezerdi (docs/I18N.md §2).
    const issued = await requestLoginCode({ email })

    await setChallenge({
      id: issued.challengeId,
      email,
      expiresAtUtc: issued.expiresAtUtc,
      resendAvailableAtUtc: issued.resendAvailableAtUtc,
      codeLength: issued.codeLength,
    })
  } catch (error) {
    return fail(requestErrorKey(error))
  }

  return succeed()
}

/**
 * Yeni kod, formdan gelen adrese değil ÇEREZDEKİ adrese gider. Adres istemciden
 * alınsaydı, 1. adımda hız sınırına takılan bir saldırgan 2. adımda başka bir
 * adrese kod göndertebilirdi. Bu yüzden eylem hiç parametre almıyor — alsaydı
 * gövdesine bakmadan "istemci ne gönderdi" sorusu akla gelirdi.
 */
export async function resendCodeAction(): Promise<AuthFormState> {
  const challenge = await getChallenge()
  if (!challenge) return fail('auth.error.expiredChallenge')

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
      return failWith(
        t('auth.otp.error.resendTooSoon', { saniye: formatNumber(error.retryAfterSeconds) }),
      )
    }

    return fail(requestErrorKey(error))
  }

  return succeed()
}

export async function verifyCodeAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const returnTo = safeReturnTo(readField(formData, RETURN_TO_FIELD))
  const code = readField(formData, CODE_FIELD) ?? ''

  const challenge = await getChallenge()
  if (!challenge) return fail('auth.error.expiredChallenge')

  try {
    const tokens = await verifyLoginCode({ challengeId: challenge.id, code })

    await setSession(tokens)
    await clearChallenge()
  } catch (error) {
    return fail(verifyErrorKey(error))
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

function readField(formData: FormData, name: string): string | null {
  const value = formData.get(name)
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function succeed(): AuthFormState {
  return { error: null, at: Date.now() }
}

function fail(key: MessageKey): AuthFormState {
  return failWith(t(key))
}

function failWith(message: string): AuthFormState {
  return { error: message, at: Date.now() }
}

/**
 * Bilinmeyen hata YUTULMAZ. 500'ü "e-posta geçersiz" diye göstermek gerçek arızayı
 * görünmez yapar (CLAUDE.md #1) — böyle bir durumda hata Next'in hata sınırına gider.
 */
function requestErrorKey(error: unknown): MessageKey {
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
function verifyErrorKey(error: unknown): MessageKey {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'auth.otp.error.invalid'
    if (error.status === 429) return 'auth.otp.error.locked'
    if (error.status === 403) return 'auth.error.suspended'
  }

  throw error
}
