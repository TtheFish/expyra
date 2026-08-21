import Form from 'next/form'
import { DateField } from '@/components/search/date-field'
import { GuestPicker } from '@/components/search/guest-picker'
import { getPluralTemplates, getTemplate, getTranslator } from '@/features/i18n/translator'

/**
 * Arama çubuğu — nereye / ne zaman / kaç kişi.
 *
 * `next/form` kullanıyoruz: submit'te alanlar URL query'sine yazılıyor, sonuç
 * sayfasına client-side geçiliyor ve JS kapalıyken düz GET formu olarak
 * çalışmaya devam ediyor. Aramanın durumu URL'de olunca sonuç paylaşılabilir
 * ve geri tuşu beklendiği gibi davranır.
 *
 * Otelden farkımız: "oda" yok, tarih aralığı yok. Bir deneyim tek gün sürer —
 * giriş/çıkış yerine tek tarih soruyoruz.
 *
 * **Metin burada çözülüp iki istemci bileşenine prop olarak iniyor.** Tek
 * istisna misafir seçicinin özet satırı: sayıyı kullanıcı değiştiriyor, o
 * yüzden hazır metin değil ÇOĞUL BİÇİM TABLOSU gidiyor (bkz. `guest-picker`).
 */

type ExperienceSearchProps = {
  /** Sayfanın dili — biçimlendirme ve sözlük için. */
  lang: string
  /** Sonuç sayfasının yolu — dile göre değişiyor (`/tr/kesfet`, `/en/explore`). */
  action: string
  defaultDestination?: string
  defaultDate?: string
  defaultAdults?: number
  defaultChildren?: number
  className?: string
}

export async function ExperienceSearch({
  lang,
  action,
  defaultDestination = '',
  defaultDate = '',
  defaultAdults,
  defaultChildren,
  className = '',
}: ExperienceSearchProps) {
  const [t, adultForms, childForms, summaryBoth] = await Promise.all([
    getTranslator(lang),
    getPluralTemplates(lang, 'search.guests.summary.adults'),
    getPluralTemplates(lang, 'search.guests.summary.children'),
    // Şablon olarak gidiyor: parçaları istemci dolduruyor (bkz. `getTemplate`).
    getTemplate(lang, 'search.guests.summary.both'),
  ])

  return (
    <Form
      action={action}
      /*
        relative + z-20 şart: `.glass` içinde `isolation: isolate` var, yani çubuk kendi
        stacking context'ini kuruyor. Context'in kendisi z-auto kalırsa misafir paneli
        (context İÇİNDE z-30) DOM'da sonra gelen kardeşlerin — butonlar, kartlar —
        altında çizilir. Paneldeki z-index tek başına yetmez.
      */
      className={`glass glass-edge glass-thick search-bar relative z-20 mx-auto w-full max-w-4xl ${className}`}
    >
      <div className="search-group">
        <label className="search-field" htmlFor="search-nerede">
          <span className="search-field-label">{t('search.destination.label')}</span>
          <input
            id="search-nerede"
            name="nerede"
            type="search"
            defaultValue={defaultDestination}
            placeholder={t('search.destination.placeholder')}
            autoComplete="off"
            className="search-field-input"
          />
        </label>

        <div className="search-divider" aria-hidden="true" />

        <DateField defaultValue={defaultDate} label={t('search.date.label')} />

        <div className="search-divider" aria-hidden="true" />

        <GuestPicker
          lang={lang}
          defaultAdults={defaultAdults}
          defaultChildren={defaultChildren}
          labels={{
            trigger: t('search.guests.label'),
            dialog: t('search.guests.dialogLabel'),
            done: t('search.guests.done'),
            adults: t('search.guests.adults'),
            adultsHint: t('search.guests.adults.hint'),
            adultsDecrease: t('search.guests.adults.decrease'),
            adultsIncrease: t('search.guests.adults.increase'),
            children: t('search.guests.children'),
            childrenHint: t('search.guests.children.hint'),
            childrenDecrease: t('search.guests.children.decrease'),
            childrenIncrease: t('search.guests.children.increase'),
            summaryBoth,
          }}
          summaryForms={{ adults: adultForms, children: childForms }}
        />
      </div>

      <button type="submit" className="glass-brand search-submit">
        {t('search.submit')}
      </button>
    </Form>
  )
}
