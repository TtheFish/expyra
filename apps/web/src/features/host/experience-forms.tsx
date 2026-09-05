'use client'

import { useActionState, useId, useState, type ReactNode } from 'react'
import type { PluralTemplates } from '@/features/i18n/dictionary'
import { formatPlural } from '@/features/i18n/format'
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

export type LanguageOption = { code: string; label: string }

/**
 * Konuşulan dil listesi + süzgeç. Liste 70'in üstünde satır ve kaydırarak
 * "Almanca"yı bulmak host'un işi değil.
 *
 * **Süzgeç yalnız GİZLİYOR, DOM'dan çıkarmıyor.** Onay kutuları formun kendisi;
 * eşleşmeyen satır `hidden` ile saklanıyor ki işaretli bir dil süzgeç dışında
 * kalsa bile gönderimde yerinde dursun. Kutuyu DOM'dan çıkarmak, "İngilizce"yi
 * işaretleyip "alm" yazan host'un İngilizce'yi sessizce kaybetmesi demekti.
 *
 * Eşleştirme `toLocaleLowerCase(lang)`: Türkçe arayüzde "I" → "ı", aksi hâlde
 * "İngilizce" için "ing" yazan bulamazdı. Etiketle birlikte koda da bakılıyor
 * (`de`, `cs`) — host çoğu zaman kısa kodu biliyor.
 *
 * JS kapalıyken kutu görünmüyor (state yok) ve tam liste duruyor: süzgeç bir
 * kolaylık, form onsuz da çalışıyor.
 */
export function SpokenLanguagePicker({
  lang,
  name,
  options,
  selected,
  labels,
}: {
  lang: string
  name: string
  options: readonly LanguageOption[]
  selected: readonly string[]
  labels: {
    search: string
    placeholder: string
    none: string
    results: PluralTemplates
  }
}) {
  const [query, setQuery] = useState('')
  const id = useId()
  const listId = `${id}-liste`
  const selectedSet = new Set(selected)

  const needle = query.trim().toLocaleLowerCase(lang)
  const matches = (option: LanguageOption) =>
    needle === '' ||
    option.label.toLocaleLowerCase(lang).includes(needle) ||
    option.code.toLocaleLowerCase(lang).includes(needle)

  const visibleCount = options.filter(matches).length

  return (
    <>
      <label className="auth-label mt-3" htmlFor={`${id}-ara`}>
        {labels.search}
      </label>
      <input
        id={`${id}-ara`}
        /* `type="text"`, `type="search"` DEĞİL: search kutusunda Escape'i bazı
           tarayıcılar kendine alıyor (city-picker.tsx ile aynı not). */
        type="text"
        className="auth-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={labels.placeholder}
        autoComplete="off"
        aria-controls={listId}
      />

      {/* Sayım kibar canlı bölge: her tuş vuruşunda konuşmayı kesmemeli. */}
      <p aria-live="polite" className="sr-only">
        {formatPlural(lang, labels.results, visibleCount)}
      </p>

      <div
        id={listId}
        className="mt-2 grid max-h-64 gap-1 overflow-y-auto rounded-[var(--radius-glass-sm)] border border-[var(--glass-border)] p-3 sm:grid-cols-2"
      >
        {options.map((option) => (
          <label
            key={option.code}
            hidden={!matches(option)}
            className="flex items-center gap-2 py-1 text-sm"
          >
            <input
              type="checkbox"
              name={name}
              value={option.code}
              defaultChecked={selectedSet.has(option.code)}
              className="h-4 w-4"
            />
            <span className="min-w-0 truncate">{option.label}</span>
          </label>
        ))}
        {visibleCount === 0 ? (
          <p className="auth-help sm:col-span-2">{labels.none}</p>
        ) : null}
      </div>
    </>
  )
}

export type ItineraryRow = { title: string; body: string }

/**
 * Program adımları: satır ekle/kaldır. Alan adları tekrar ediyor (`getAll` sırayı
 * koruyor); satırın kimliği DOM sırası, ayrı bir id alanı yok — sunucu listeyi
 * toptan yazdığı için gerekmiyor.
 *
 * JS kapalıyken: mevcut satırlar + bir boş satır çiziliyor, "ekle" düğmesi yok.
 * Bir kerede bir adım eklemek yine mümkün (boş satırı doldur, kaydet, yenisi gelir).
 *
 * `key`: satır kaldırılınca kalanların `defaultValue`'su kaymasın diye her satır
 * artan bir sayaçla anahtarlanıyor; indeks anahtar olsaydı 2. satırı silmek 3.'nün
 * metnini 2.'ye taşırdı.
 */
export function ItineraryEditor({
  initial,
  lang,
  names,
  labels,
  maxSteps = 20,
}: {
  initial: readonly ItineraryRow[]
  lang: string
  names: { title: string; body: string }
  labels: {
    stepTitle: (n: number) => string
    titlePlaceholder: string
    bodyPlaceholder: string
    add: string
    remove: string
    help: string
  }
  maxSteps?: number
}) {
  const seed = initial.length > 0 ? initial : [{ title: '', body: '' }]
  const [rows, setRows] = useState<{ id: number; row: ItineraryRow }[]>(() =>
    seed.map((row, index) => ({ id: index, row })),
  )
  const [nextId, setNextId] = useState(seed.length)
  const helpId = useId()

  const add = () => {
    setRows((current) => [...current, { id: nextId, row: { title: '', body: '' } }])
    setNextId((value) => value + 1)
  }

  const remove = (id: number) => {
    setRows((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)))
  }

  return (
    <div aria-describedby={helpId}>
      <ol className="grid gap-4">
        {rows.map(({ id, row }, index) => (
          <li key={id} className="rounded-[var(--radius-glass-sm)] border border-[var(--glass-border)] p-3">
            <div className="flex items-center justify-between gap-3">
              <label className="auth-label" htmlFor={`adim-${id}-baslik`}>
                {labels.stepTitle(index + 1)}
              </label>
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="text-xs text-fg-muted underline underline-offset-4 hover:text-fg"
                >
                  {labels.remove}
                </button>
              ) : null}
            </div>
            <input
              id={`adim-${id}-baslik`}
              name={names.title}
              className="auth-input"
              type="text"
              maxLength={120}
              lang={lang}
              defaultValue={row.title}
              placeholder={labels.titlePlaceholder}
            />
            <textarea
              name={names.body}
              className="auth-input mt-2"
              rows={2}
              maxLength={600}
              lang={lang}
              defaultValue={row.body}
              placeholder={labels.bodyPlaceholder}
              aria-label={labels.stepTitle(index + 1)}
            />
          </li>
        ))}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {rows.length < maxSteps ? (
          <button
            type="button"
            onClick={add}
            className="glass glass-edge glass-interactive rounded-[var(--radius-glass-sm)] px-4 py-2 text-sm font-medium"
          >
            {labels.add}
          </button>
        ) : null}
        <p id={helpId} className="auth-help">
          {labels.help}
        </p>
      </div>
    </div>
  )
}
