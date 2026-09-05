import Form from 'next/form'
import { CityPicker } from '@/components/search/city-picker'
import { DateField } from '@/components/search/date-field'
import { GuestPicker } from '@/components/search/guest-picker'
import { prefersEnglishCityName, MIN_CITY_QUERY_LENGTH } from '@/features/places/api'
import { getPluralTemplates, getTemplate, getTranslator } from '@/features/i18n/translator'
import { path } from '@/lib/routes'

/**
 * Header'daki kompakt arama hapı — tasarımın orta sütunu.
 *
 * Eskiden yalnız `/kesfet`'e giden bir linkti: "Nereye?" / "Ne zaman?" tıklanınca
 * sayfa yenileniyor, seçici açılmıyordu. Artık gerçek form: şehir, tarih, misafir
 * seçicileri + Ara; gönderim `experience-search` ile aynı URL sözleşmesini kullanır.
 */
export async function HeaderSearch({ lang }: { lang: string }) {
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
    getTemplate(lang, 'search.guests.summary.both'),
    getPluralTemplates(lang, 'search.city.results'),
    getPluralTemplates(lang, 'search.city.countryCities'),
    getTemplate(lang, 'search.city.selectedValue'),
    getTemplate(lang, 'search.date.stepUp'),
    getTemplate(lang, 'search.date.stepDown'),
  ])

  return (
    <Form
      action={path(lang, 'explore')}
      className="header-search relative z-20 hidden min-w-0 max-w-full items-center justify-self-center md:flex"
    >
      <div className="header-search-fields min-w-0 flex-1">
        <CityPicker
          lang={lang}
          preferEnglishName={prefersEnglishCityName(lang)}
          minQueryLength={MIN_CITY_QUERY_LENGTH}
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

        <span className="header-search-divider" aria-hidden="true" />

        <DateField
          lang={lang}
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

        <span className="header-search-divider" aria-hidden="true" />

        <GuestPicker
          lang={lang}
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

      <button
        type="submit"
        aria-label={t('search.submit')}
        className="glass-brand ms-1 inline-flex size-10 shrink-0 items-center justify-center rounded-[0.875rem]"
      >
        <SearchIcon />
      </button>
    </Form>
  )
}

export function SearchIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
