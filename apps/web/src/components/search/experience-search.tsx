import Form from 'next/form'
import { GuestPicker } from '@/components/search/guest-picker'

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
 */

type ExperienceSearchProps = {
  defaultDestination?: string
  defaultDate?: string
  defaultAdults?: number
  defaultChildren?: number
  className?: string
}

export function ExperienceSearch({
  defaultDestination = '',
  defaultDate = '',
  defaultAdults,
  defaultChildren,
  className = '',
}: ExperienceSearchProps) {
  return (
    <Form
      action="/kesfet"
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
          <span className="search-field-label">Nereye?</span>
          <input
            id="search-nerede"
            name="nerede"
            type="search"
            defaultValue={defaultDestination}
            placeholder="Şehir veya deneyim"
            autoComplete="off"
            className="search-field-input"
          />
        </label>

        <div className="search-divider" aria-hidden="true" />

        <label className="search-field" htmlFor="search-tarih">
          <span className="search-field-label">Ne zaman?</span>
          <input
            id="search-tarih"
            name="tarih"
            type="date"
            defaultValue={defaultDate}
            className="search-field-input"
          />
        </label>

        <div className="search-divider" aria-hidden="true" />

        <GuestPicker defaultAdults={defaultAdults} defaultChildren={defaultChildren} />
      </div>

      <button
        type="submit"
        className="glass-brand search-submit"
      >
        Ara
      </button>
    </Form>
  )
}
