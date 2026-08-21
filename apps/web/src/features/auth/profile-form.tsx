'use client'

import { useActionState } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
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
 *
 * Formda İKİ dil alanı var ve karıştırılmamaları şart:
 * - `dil` → kullanıcının TERCİH ettiği içerik dili (49 seçenek, kaydediliyor).
 * - `arayuz-dili` → sayfanın dili; yalnız sunucu eyleminin cevabını hangi dilde
 *   yazacağını söylüyor, kaydedilmiyor.
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

export type ProfileFormLabels = {
  nameLabel: string
  nameHelp: string
  namePlaceholder: string
  languageLabel: string
  languageHelp: string
  languageNone: string
  save: string
  saving: string
}

type ProfileFormProps = {
  displayName: string | null
  preferredLanguage: string | null
  languages: readonly LanguageOption[]
  /** API'nin kabul ettiği üst sınır; sunucuda da doğrulanıyor. */
  displayNameMaxLength: number
  lang: string
  labels: ProfileFormLabels
}

export function ProfileForm({
  displayName,
  preferredLanguage,
  languages,
  displayNameMaxLength,
  lang,
  labels,
}: ProfileFormProps) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    INITIAL,
  )

  return (
    <form action={formAction} className="auth-form">
      <input type="hidden" name={UI_LANGUAGE_FIELD} value={lang} />

      <div>
        {/* Görünür etiket: placeholder etiket yerine geçmez, odakta kaybolur. */}
        <label className="auth-label" htmlFor="ad">
          {labels.nameLabel}
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
          placeholder={labels.namePlaceholder}
          disabled={pending}
          aria-describedby={`${NAME_HELP_ID} ${ERROR_ID}`}
          aria-invalid={state.error !== null}
        />

        <p id={NAME_HELP_ID} className="auth-help">
          {labels.nameHelp}
        </p>
      </div>

      <div>
        <label className="auth-label" htmlFor="dil">
          {labels.languageLabel}
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
          <option value="">{labels.languageNone}</option>
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
        </select>

        <p id={LANGUAGE_HELP_ID} className="auth-help">
          {labels.languageHelp}
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
          {pending ? labels.saving : labels.save}
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
