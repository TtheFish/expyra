'use client'

import { useActionState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { requestCodeAction, type AuthFormState } from './actions'
import { t } from './messages'
import { RETURN_TO_PARAM } from './return-to'

/**
 * 1. adım: e-posta.
 *
 * `autoFocus` YOK — mobilde açılan klavye kartın üstündeki "Şifre yok" gerekçesini
 * örter ve kullanıcı neye giriş yaptığını okuyamadan yazmaya başlar.
 */

const INITIAL: AuthFormState = { error: null, at: 0 }

const HELP_ID = 'eposta-yardim'
const ERROR_ID = 'eposta-hata'

export function EmailStep({ returnTo, lang }: { returnTo: string; lang: string }) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestCodeAction,
    INITIAL,
  )

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name={RETURN_TO_PARAM} value={returnTo} />
      {/* Kod postasının dili: kullanıcının bulunduğu sayfadan geliyor, tarayıcı
          tercihinden değil (bkz. requestCodeAction). */}
      <input type="hidden" name="dil" value={lang} />

      <div>
        {/* Görünür etiket: placeholder etiket yerine geçmez, odakta kaybolur. */}
        <label className="auth-label" htmlFor="eposta">
          {t('auth.email.label')}
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
          placeholder={t('auth.email.placeholder')}
          disabled={pending}
          aria-describedby={`${HELP_ID} ${ERROR_ID}`}
          aria-invalid={state.error !== null}
        />

        <p id={HELP_ID} className="auth-help">
          {t('auth.email.help')}
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
        {pending ? t('auth.common.working') : t('auth.common.continue')}
      </GlassButton>
    </form>
  )
}
