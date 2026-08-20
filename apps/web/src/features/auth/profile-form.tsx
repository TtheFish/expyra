'use client'

import { useActionState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { t } from './account-messages'
import { updateProfileAction, type ProfileFormState } from './actions'

/**
 * Profil formu — `email-step.tsx` ile aynı kalıp: `useActionState`, görünür
 * etiket, `aria-describedby` ile bağlı yardım metni, boşken de DOM'da duran
 * hata kutusu.
 *
 * İstemci bileşeni olmasının tek nedeni bu: geri bildirim aynı sayfada, tam
 * sayfa gezinme olmadan görünmeli. `role="alert"` ancak metin SONRADAN
 * değişirse seslendirilir; sayfa yeniden yüklenip mesaj hazır gelseydi (ör.
 * `?durum=kaydedildi`) ekran okuyucu hiçbir şey duyurmazdı.
 */

const INITIAL: ProfileFormState = { error: null, success: null, at: 0 }

const NAME_HELP_ID = 'ad-yardim'
const LANGUAGE_HELP_ID = 'dil-yardim'
const ERROR_ID = 'hesap-hata'

export type LanguageOption = {
  code: string
  /** Sunucuda üretiliyor: `Intl.DisplayNames` verisi sayfanın diline bağlı. */
  label: string
}

type ProfileFormProps = {
  displayName: string | null
  preferredLanguage: string | null
  languages: readonly LanguageOption[]
  /** API'nin kabul ettiği üst sınır; sunucuda da doğrulanıyor. */
  displayNameMaxLength: number
}

export function ProfileForm({
  displayName,
  preferredLanguage,
  languages,
  displayNameMaxLength,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    INITIAL,
  )

  return (
    <form action={formAction} className="auth-form">
      <div>
        {/* Görünür etiket: placeholder etiket yerine geçmez, odakta kaybolur. */}
        <label className="auth-label" htmlFor="ad">
          {t('account.name.label')}
        </label>

        <input
          id="ad"
          name="ad"
          className="auth-input"
          type="text"
          autoComplete="name"
          /* `required` YOK: ad boş bırakılabilir ve boş gönderim onu temizler. */
          maxLength={displayNameMaxLength}
          defaultValue={displayName ?? ''}
          placeholder={t('account.name.placeholder')}
          disabled={pending}
          aria-describedby={`${NAME_HELP_ID} ${ERROR_ID}`}
          aria-invalid={state.error !== null}
        />

        <p id={NAME_HELP_ID} className="auth-help">
          {t('account.name.help')}
        </p>
      </div>

      <div>
        <label className="auth-label" htmlFor="dil">
          {t('account.language.label')}
        </label>

        {/*
          Native `<select>`: 49 satırlık liste için tarayıcının kendi kontrolü
          klavye, ekran okuyucu ve telefon tekerleği açısından elle yazılmış
          hiçbir açılır panelin ulaşamayacağı yerde. Dil SEÇİCİ (`language-picker`)
          buraya uymaz — o kontrol arayüz dilini değiştirip sayfayı yönlendiriyor,
          bu alan ise formla birlikte kaydedilen bir tercih.
        */}
        <select
          id="dil"
          name="dil"
          className="auth-input"
          defaultValue={preferredLanguage ?? ''}
          disabled={pending}
          aria-describedby={`${LANGUAGE_HELP_ID} ${ERROR_ID}`}
        >
          <option value="">{t('account.language.none')}</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>

        <p id={LANGUAGE_HELP_ID} className="auth-help">
          {t('account.language.help')}
        </p>
      </div>

      {/*
        Hata kutusu BOŞKEN DE DOM'da: sonradan eklenen alert düğümünü bazı ekran
        okuyucular kaçırır, ayrıca sabit yükseklik formun zıplamasını önler.
      */}
      <p id={ERROR_ID} className="auth-alert" role="alert">
        {state.error}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <GlassButton type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? t('account.saving') : t('account.save')}
        </GlassButton>

        {/*
          Başarı ayrı bir bölgede ve `role="status"` (kibar): `role="alert"`
          okuyucunun o an okuduğunu keser — bir onay için doğru şiddet değil.
          Bu düğüm de boşken DOM'da duruyor, aynı gerekçeyle.
        */}
        <p role="status" className="min-h-6 text-sm font-medium text-fg">
          {state.success}
        </p>
      </div>
    </form>
  )
}
