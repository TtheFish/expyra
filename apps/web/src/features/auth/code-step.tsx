'use client'

import { useActionState, useEffect, useState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { formatNumber } from '@/features/i18n/format'
import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
import {
  resendCodeAction,
  restartFlowAction,
  verifyCodeAction,
  type AuthFormState,
} from './actions'
import { OtpInput } from './otp-input'
import { RETURN_TO_PARAM } from './return-to'

/**
 * 2. adım: kod.
 *
 * İç içe `<form>` YOK — "yeni kod gönder" ve "başka adres" aynı formda `formAction`
 * ile ayrı sunucu eylemlerine gidiyor. İkisi de `formNoValidate`: kod alanı
 * `required` olduğu için aksi halde tarayıcı bu iki butonu da bloke ederdi.
 *
 * `challengeId` bu bileşene HİÇ gelmiyor; sunucu eylemi onu `httpOnly` çerezden
 * okuyor. Ekranda yalnız kullanıcının kendi adresi var.
 *
 * `lang` prop'u iki yere gidiyor: gizli alan (sunucu eyleminin hata metnini
 * hangi dilde yazacağı) ve geri sayımın sayı biçimi. Sayıyı `String(n)` ile
 * basmak Arapça arayüzde ASCII rakam demek.
 */

const INITIAL: AuthFormState = { error: null, at: 0 }

const HELP_ID = 'kod-yardim'
const ERROR_ID = 'kod-hata'

export type CodeStepLabels = {
  label: string
  hint: string
  submit: string
  working: string
  resend: string
  changeEmail: string
}

type CodeStepProps = {
  codeLength: number
  resendAvailableAtUtc: string
  /**
   * Sunucunun hesapladığı kalan saniye. Prop olarak geliyor ki SSR ile ilk
   * hidrasyon render'ı AYNI sayıyı bassın; `Date.now()`'u iki tarafta ayrı ayrı
   * çağırmak hidrasyon uyuşmazlığı üretir. JS kapalıyken de buton doğru başlar.
   */
  initialRemainingSeconds: number
  returnTo: string
  lang: string
  labels: CodeStepLabels
}

export function CodeStep({
  codeLength,
  resendAvailableAtUtc,
  initialRemainingSeconds,
  returnTo,
  lang,
  labels,
}: CodeStepProps) {
  const [verifyState, verifyAction, verifyPending] = useActionState<AuthFormState, FormData>(
    verifyCodeAction,
    INITIAL,
  )
  const [resendState, resendAction, resendPending] = useActionState<AuthFormState, FormData>(
    resendCodeAction,
    INITIAL,
  )

  // Aynı formda iki eylem var; ekranda en SON çalışanın sonucu durmalı.
  // `at` sunucu saatinden geliyor, iki durumu birlikte sıralayabiliyor.
  const state = resendState.at > verifyState.at ? resendState : verifyState
  const busy = verifyPending || resendPending

  const remaining = useResendCountdown(resendAvailableAtUtc, initialRemainingSeconds)

  return (
    <form action={verifyAction} className="auth-form">
      <input type="hidden" name={RETURN_TO_PARAM} value={returnTo} />
      {/* Sunucu eylemlerinin cevabını hangi dilde yazacağı; üç eylem de aynı
          formdan besleniyor (bkz. `email-step.tsx`). */}
      <input type="hidden" name={UI_LANGUAGE_FIELD} value={lang} />

      <div>
        <label className="auth-label" htmlFor="kod">
          {labels.label}
        </label>

        {/*
          `key` her sunucu turunda değişiyor: hatalı kodun ardından alan temizlenir
          ve odak geri gelir. Aksi halde kullanıcı eski rakamların üstüne yazar.
        */}
        <OtpInput
          key={state.at}
          id="kod"
          name="kod"
          length={codeLength}
          describedBy={`${HELP_ID} ${ERROR_ID}`}
          invalid={state.error !== null}
          disabled={busy}
        />

        <p id={HELP_ID} className="auth-help">
          {labels.hint}
        </p>
      </div>

      <p id={ERROR_ID} className="auth-alert" role="alert">
        {state.error}
      </p>

      {/* Otomatik gönderim tek başına yeterli sayılmaz: görünür submit her zaman var. */}
      <GlassButton type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
        {busy ? labels.working : labels.submit}
      </GlassButton>

      <div className="auth-actions">
        {/*
          Erişilebilir ad SABİT; saniyeler `aria-hidden`. Canlı bölgeye konursa
          NVDA her saniye konuşur.
        */}
        <button
          type="submit"
          formAction={resendAction}
          formNoValidate
          className="auth-link-button"
          disabled={busy || remaining > 0}
          aria-label={labels.resend}
        >
          <span>{labels.resend}</span>
          {remaining > 0 ? (
            <span aria-hidden="true"> ({formatNumber(lang, remaining)})</span>
          ) : null}
        </button>

        <button
          type="submit"
          formAction={restartFlowAction}
          formNoValidate
          className="auth-link-button"
          disabled={busy}
        >
          {labels.changeEmail}
        </button>
      </div>
    </form>
  )
}

/**
 * Geri sayım sunucunun verdiği `resendAvailableAtUtc`'den hesaplanıyor, 60'tan
 * geri sayarak değil: sekme uyuyunca zamanlayıcı kısılır, yenilemede sıfırlanır
 * ve buton erken açılıp kullanıcıya 429 yedirir. Her tik mutlak damgadan yeniden
 * hesaplanıyor, azaltma yapılmıyor.
 */
function useResendCountdown(resendAvailableAtUtc: string, initialSeconds: number): number {
  // State'te tutulan tek şey "şimdi"; kalan saniye ondan TÜRETİLİYOR. Böylece
  // effect gövdesinde setState yok ve saniye, damga değiştiğinde (yeni kod
  // gönderildiğinde) bir sonraki render'da kendiliğinden doğruya oturuyor.
  // `null` başlangıcı sunucu render'ıyla ilk hidrasyon render'ını eşitliyor.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const target = Date.parse(resendAvailableAtUtc)
  if (now === null || Number.isNaN(target)) return initialSeconds

  return Math.max(0, Math.ceil((target - now) / 1000))
}
