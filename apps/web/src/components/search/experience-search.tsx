import Form from 'next/form'
import { CityPicker, type CityOption } from '@/components/search/city-picker'
import { DateField } from '@/components/search/date-field'
import { GuestPicker } from '@/components/search/guest-picker'
import { getPluralTemplates, getTemplate, getTranslator } from '@/features/i18n/translator'
import { MIN_CITY_QUERY_LENGTH, prefersEnglishCityName } from '@/features/places/api'

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
 * **"Nereye?" artık serbest metin değil** (PLAN Blok 4): alan bir seçici ve
 * forma yalnız kayıt defterindeki bir şehrin doğal anahtarı (`cz-prague`)
 * gidiyor. Kullanıcının yazdığı metnin `name` özniteliği yok, yani tarayıcı onu
 * gönderemiyor — "seçilmeyen metin sessizce yok sayılmaz" kuralı burada yapısal
 * olarak sağlanıyor, bir kontrole bağlı değil.
 *
 * **JS kapalıyken şehir seçilemiyor** ve bu bilinçli bir kayıp: seçicisiz bir
 * kutunun yazdığı metnin karşılığı olan şehri bulmak zaten sunucuda yapılamıyor
 * (bugünkü substring eşleşmesi üç sabit satır üzerinde çalışan bir kurguydu).
 * Form yine gönderiliyor; sonuç sayfası şehir seçilmediğini SÖYLÜYOR.
 *
 * **Metin burada çözülüp istemci bileşenlerine prop olarak iniyor.** İstisnalar
 * yer tutucusu istemcide değişen metinler: misafir özeti ve şehir seçicinin
 * seçili satırı ile sonuç sayımları.
 */

type ExperienceSearchProps = {
  /** Sayfanın dili — biçimlendirme ve sözlük için. */
  lang: string
  /** Sonuç sayfasının yolu — dile göre değişiyor (`/tr/kesfet`, `/en/explore`). */
  action: string
  /** URL'den çözülmüş şehir. Çözülemediyse `null` (bkz. `defaultCityQuery`). */
  defaultCity?: CityOption | null
  /** Çözülemeyen ham metin; kutuya yazılı gelir ki kullanıcı doğrusunu seçebilsin. */
  defaultCityQuery?: string
  defaultDate?: string
  defaultAdults?: number
  defaultChildren?: number
  className?: string
}

export async function ExperienceSearch({
  lang,
  action,
  defaultCity = null,
  defaultCityQuery = '',
  defaultDate = '',
  defaultAdults,
  defaultChildren,
  className = '',
}: ExperienceSearchProps) {
  const [
    t,
    adultForms,
    childForms,
    summaryBoth,
    cityResults,
    cityCounts,
    citySelected,
    dateStepUp,
    dateStepDown,
  ] = await Promise.all([
      getTranslator(lang),
      getPluralTemplates(lang, 'search.guests.summary.adults'),
      getPluralTemplates(lang, 'search.guests.summary.children'),
      // Şablon olarak gidiyor: parçaları istemci dolduruyor (bkz. `getTemplate`).
      getTemplate(lang, 'search.guests.summary.both'),
      getPluralTemplates(lang, 'search.city.results'),
      getPluralTemplates(lang, 'search.city.countryCities'),
      getTemplate(lang, 'search.city.selectedValue'),
      getTemplate(lang, 'search.date.stepUp'),
      getTemplate(lang, 'search.date.stepDown'),
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
        <CityPicker
          lang={lang}
          /* Hangi dilin İngilizce exonimi tercih ettiği kararı SUNUCUDA
             (`features/places/api.ts`); istemciye yalnız sonucu iniyor. */
          preferEnglishName={prefersEnglishCityName(lang)}
          minQueryLength={MIN_CITY_QUERY_LENGTH}
          defaultCity={defaultCity}
          defaultQuery={defaultCityQuery}
          labels={{
            field: t('search.destination.label'),
            placeholder: t('search.destination.placeholder'),
            listLabel: t('search.city.listLabel'),
            countriesHeading: t('search.city.countriesHeading'),
            citiesHeading: t('search.city.citiesHeading'),
            allCountries: t('search.city.allCountries'),
            tooShort: t('search.city.tooShort'),
            loading: t('search.city.loading'),
            error: t('search.city.error'),
            empty: t('search.city.empty'),
            truncated: t('search.city.truncated'),
            clear: t('search.city.clear'),
            selectedValue: citySelected,
          }}
          forms={{ results: cityResults, countryCities: cityCounts }}
        />

        <div className="search-divider" aria-hidden="true" />

        <DateField
          lang={lang}
          defaultValue={defaultDate}
          labels={{
            field: t('search.date.label'),
            placeholder: t('search.date.placeholder'),
            dialog: t('search.date.dialogLabel'),
            day: t('search.date.day'),
            month: t('search.date.month'),
            year: t('search.date.year'),
            done: t('search.date.done'),
            clear: t('search.date.clear'),
            stepUp: dateStepUp,
            stepDown: dateStepDown,
          }}
        />

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
