'use client'

import { useActionState, useId, type ReactNode } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
import type { ExperienceFormState } from './experience-actions'
import {
  EXPERIENCE_ID_FIELD,
  SECTION_FIELD,
  TEXT_LANGUAGE_FIELD,
  type ExperienceSection,
} from './experience-fields'

/**
 * Sihirbazın form kabuğu — tek bir istemci bileşeni, sekiz form.
 *
 * ## Neden istemci bileşeni ve neden yalnız BU
 *
 * `useActionState` olmadan hata mesajı ancak sayfa yeniden yüklenip hazır gelen
 * bir sorgu parametresiyle gösterilebilirdi; o durumda `role="alert"` hiçbir şey
 * duyurmaz (metin SONRADAN değişmediği için). `profile-form.tsx` ve
 * `activate-host-form.tsx` aynı gerekçeyle istemci bileşeni.
 *
 * Ama alanların KENDİSİ istemciye inmiyor: `children` olarak SUNUCUDA çiziliyorlar.
 * Böylece etiketler, yardım metinleri, kategori adları ve 49 dilin listesi sözlükten
 * geliyor — sözlük `server-only` ve tarayıcıya hiçbir dil inmiyor (docs/I18N.md §5).
 * Bu bileşenin tarayıcıya taşıdığı tek metin iki dizge: düğmenin etiketi ve bekleme
 * hâli.
 *
 * ## Gizli alanlar
 *
 * - `arayuz-dili` → cevabın dili. Sunucu eylemi hangi sayfadan çağrıldığını bilmiyor.
 * - `deneyim` → düzenlenen KAYNAĞIN kimliği. Kullanıcı kimliği değil (CLAUDE.md #3):
 *   başkasının id'si yazılsa API 404 döner, çünkü sahiplik token'dan çözülüyor.
 * - `bolum` → bu formun hangi alanlara sahip olduğu. `PATCH` bir delta olduğu için
 *   şart: boş bir onay kutusu grubu ile "bu alan bu formda yok" tarayıcıda aynı
 *   görünüyor, sunucuda ise zıt anlama geliyor.
 * - `metin-dili` → çeviri formunda hangi dilin metni yazılıyor.
 *
 * ## Bekleme sırasında alanlar kilitlenmiyor
 *
 * Yalnız düğme `disabled` — çift gönderimi önleyen o. Alanları da kilitlemek için
 * `pending` bilgisinin sunucuda çizilen `children`'a inmesi gerekirdi ve o iş tüm
 * alanları istemciye taşımak demekti. `aria-busy` durumu ekran okuyucuya söylüyor.
 */

type ExperienceFormAction = (
  state: ExperienceFormState,
  formData: FormData,
) => Promise<ExperienceFormState>

const INITIAL: ExperienceFormState = { error: null, success: null, at: 0 }

export type ExperienceFormLabels = {
  submit: string
  /** Gönderim sürerken düğmede yazan. */
  pending: string
}

type ExperienceFormProps = {
  action: ExperienceFormAction
  /** Sayfanın arayüz dili; eylem bunu `uiLocaleOf` ile kapalı kümeye daraltıyor. */
  lang: string
  /** Düzenlenen ilan. "Yeni deneyim" formunda henüz yok. */
  experienceId?: string
  section?: ExperienceSection
  /** Çeviri formunda: yazılan metnin dili. */
  textLanguage?: string
  labels: ExperienceFormLabels
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Sunucuda çizilen alanlar. Düğmesi olmayan form (yayınla/arşivle) için boş. */
  children?: ReactNode
}

export function ExperienceForm({
  action,
  lang,
  experienceId,
  section,
  textLanguage,
  labels,
  variant = 'secondary',
  size = 'md',
  className = '',
  children,
}: ExperienceFormProps) {
  const [state, formAction, pending] = useActionState<ExperienceFormState, FormData>(
    action,
    INITIAL,
  )

  const formId = useId()
  const errorId = `${formId}-hata`

  return (
    <form action={formAction} aria-busy={pending} className={className}>
      <input type="hidden" name={UI_LANGUAGE_FIELD} value={lang} />
      {experienceId ? (
        <input type="hidden" name={EXPERIENCE_ID_FIELD} value={experienceId} />
      ) : null}
      {section ? <input type="hidden" name={SECTION_FIELD} value={section} /> : null}
      {textLanguage ? (
        <input type="hidden" name={TEXT_LANGUAGE_FIELD} value={textLanguage} />
      ) : null}

      {children}

      {/*
        Hata kutusu BOŞKEN DE DOM'da: sonradan eklenen alert düğümünü bazı ekran
        okuyucular kaçırır, ayrıca sabit yükseklik kartın zıplamasını önler.
      */}
      <p id={errorId} className="auth-alert" role="alert">
        {state.error}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <GlassButton
          type="submit"
          variant={variant}
          size={size}
          disabled={pending}
          aria-describedby={errorId}
        >
          {pending ? labels.pending : labels.submit}
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
