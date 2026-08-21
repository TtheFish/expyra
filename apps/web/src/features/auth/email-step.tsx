'use client'

import { useActionState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
import { requestCodeAction, type AuthFormState } from './actions'
import { RETURN_TO_PARAM } from './return-to'

/**
 * 1. adım: e-posta.
 *
 * `autoFocus` YOK — mobilde açılan klavye kartın üstündeki "Şifre yok" gerekçesini
 * örter ve kullanıcı neye giriş yaptığını okuyamadan yazmaya başlar.
 *
 * Metin PROP olarak geliyor (sözlük `server-only`); hata metnini ise sunucu
 * eylemi HAZIR döndürüyor — bu yüzden formda dilin de gitmesi gerekiyor.
 */

const INITIAL: AuthFormState = { error: null, at: 0 }

const HELP_ID = 'eposta-yardim'
const ERROR_ID = 'eposta-hata'

export type EmailStepLabels = {
  label: string
  help: string
  placeholder: string
  submit: string
  working: string
}

export function EmailStep({
  returnTo,
  lang,
  labels,
}: {
  returnTo: string
  lang: string
  labels: EmailStepLabels
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestCodeAction,
    INITIAL,
  )

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name={RETURN_TO_PARAM} value={returnTo} />
      {/*
        Sayfanın dili. İKİ işi birden görüyor ve ikisi de aynı gerekçeye dayanıyor
        — kullanıcı o dili görmeyi zaten seçmiş:

        1. Kod postasının dili (bkz. `requestCodeAction`).
        2. Sunucu eyleminin döndürdüğü hata metninin dili — eylem hangi sayfadan
           çağrıldığını başka türlü bilemiyor.
      */}
      <input type="hidden" name={UI_LANGUAGE_FIELD} value={lang} />

      <div>
        {/* Görünür etiket: placeholder etiket yerine geçmez, odakta kaybolur. */}
        <label className="auth-label" htmlFor="eposta">
          {labels.label}
        </label>

        <input
          id="eposta"
          name="eposta"
          className="auth-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          required
          maxLength={254}
          placeholder={labels.placeholder}
          disabled={pending}
          aria-describedby={`${HELP_ID} ${ERROR_ID}`}
          aria-invalid={state.error !== null}
        />

        <p id={HELP_ID} className="auth-help">
          {labels.help}
        </p>
      </div>

      {/*
        Hata kutusu BOŞKEN DE DOM'da: sonradan eklenen alert düğümünü bazı ekran
        okuyucular kaçırır, ayrıca sabit yükseklik kartın zıplamasını önler.
        Hata üç sinyalle taşınıyor — bu metin, aria-invalid kenarlığı ve metnin
        kendisi; marka rengi zaten kırmızı olduğu için yalnız renk yetmez.
      */}
      <p id={ERROR_ID} className="auth-alert" role="alert">
        {state.error}
      </p>

      <GlassButton type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? labels.working : labels.submit}
      </GlassButton>
    </form>
  )
}
