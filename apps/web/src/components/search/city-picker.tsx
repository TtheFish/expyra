'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PluralTemplates } from '@/features/i18n/dictionary'
import { formatPlural, interpolate } from '@/features/i18n/format'

/**
 * Şehir seçici — "Nereye?" alanının serbest metin hâlinin yerine geçen kontrol.
 *
 * ## Neden `role="combobox"`, `language-picker.tsx`'teki gibi `role="dialog"` değil
 *
 * Panelin görsel kalıbı dil seçicinin aynısı (aynı cam yüzey, telefonda viewport'a
 * sabitlenen panel, Escape ve dışarı tıklama davranışı) ama ROLÜ aynı olamaz:
 *
 * - Dil seçicide tetikleyici bir DÜĞME; panel açılınca odak arama kutusuna TAŞINIR
 *   ve kullanıcı ayrı bir bağlama girer. `dialog` tam olarak bunu anlatıyor.
 * - Burada değeri taşıyan kontrolün KENDİSİ metin kutusu. Odak hiç ayrılmıyor,
 *   liste o kutunun önerileri. `dialog` deseydik ekran okuyucu "iletişim kutusu"
 *   duyurur, ok tuşlarıyla gezerken hiçbir şey okumazdı: `aria-activedescendant`
 *   bağı yalnız `combobox`/`listbox` çiftinde kuruluyor ve seçili şehri her ok
 *   basışında duyuran mekanizma o.
 *
 * Bu yüzden DOM odağı her zaman input'ta kalıyor; "sanal odak"
 * `aria-activedescendant` ile taşınıyor (ARIA APG, "Combobox with List Autocomplete").
 * Seçenekler `<button>` DEĞİL: listbox içinde odaklanabilir düğme, ekran
 * okuyucunun liste sayımını bozar.
 *
 * ## Serbest metin neden GÖNDERİLEMİYOR
 *
 * Görünen metin kutusunun `name` özniteliği YOK — tarayıcı onu forma yazamıyor.
 * Forma giden tek şey gizli alandaki doğal anahtar (`cz-prague`) ve o da ancak
 * listeden seçilince doluyor. Her tuş vuruşu seçimi TEMİZLİYOR: kutuda "Berlin"
 * yazarken gizli alanda "Praha" kalmış olması, kullanıcının gördüğüyle sunucunun
 * aldığının ayrıştığı tam da o hata (PLAN Blok 4, kabul kriteri 3).
 *
 * ## Metin
 *
 * Sözlük `server-only`; etiketler PROP olarak iniyor. İki istisna ŞABLON olarak
 * geliyor çünkü içeriklerini kullanıcı değiştiriyor ve sayfa yenilenmiyor:
 * seçilen şehrin satırı (`selectedValue`) ve sonuç sayımları (çoğul tabloları) —
 * `guest-picker.tsx` ile aynı gerekçe.
 */

const CITIES_ENDPOINT = '/api/yerler/sehirler'
const COUNTRIES_ENDPOINT = '/api/yerler/ulkeler'

/**
 * Tuş vuruşu ile isteğin arasındaki bekleme. 180 ms, ortalama yazma hızında ardışık
 * harfleri tek isteğe topluyor; 300 ms'in üstünde kullanıcı listeyi "takılmış"
 * hissediyor. Bekleme İPTAL ile birlikte çalışıyor: yeni tuş, uçmuş isteği kesiyor.
 */
const DEBOUNCE_MS = 180

/**
 * API'nin autocomplete tavanı (`SearchCitiesQuery.MaxResults`). Burada yalnız bir
 * İPUCU için kullanılıyor: liste tam tavanda geldiyse "muhtemelen kırpıldı" deyip
 * kullanıcıya yazmaya devam etmesini söylüyoruz. Sayı yanlış olsa bile hiçbir
 * sonuç kaybolmaz — kırpma kararı sunucuda.
 */
const MAX_RESULTS = 20

/** Sabit boş dizi: her render'da yeni bir `[]` üretmek memo'ları boşuna geçersiz kılıyor. */
const NO_CITIES: CityOption[] = []

const HEADING_CLASS =
  'px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-muted'

export type CityOption = {
  /** Forma ve URL'e giden doğal anahtar; sunucuda kuruluyor (`cityKeyOf`). */
  key: string
  name: string
  englishName: string
  countryCode: string
}

export type CountryOption = {
  code: string
  englishName: string
  cityCount: number
}

export type CityPickerLabels = {
  /** Alanın üst etiketi — "Nereye?". */
  field: string
  placeholder: string
  /** Öneri listesinin erişilebilir adı. */
  listLabel: string
  countriesHeading: string
  citiesHeading: string
  /** Ülke filtresinden çıkış satırı. */
  allCountries: string
  tooShort: string
  loading: string
  error: string
  empty: string
  truncated: string
  clear: string
  /** `{sehir}` + `{ulke}` yer tutuculu ŞABLON: seçim istemcide değişiyor. */
  selectedValue: string
}

export type CityPickerForms = {
  /** "{n} şehir bulundu" — yalnız canlı bölgede, ekran okuyucu için. */
  results: PluralTemplates
  /** Ülke satırındaki rozet: "{n} şehir". */
  countryCities: PluralTemplates
}

type CityPickerProps = {
  /** Sayı biçimi, ad sıralaması ve ülke adlarının dili. */
  lang: string
  /** `prefersEnglishCityName(lang)` sonucunu taşır — karar sunucuda verildi. */
  preferEnglishName: boolean
  /** `MIN_CITY_QUERY_LENGTH` — API'nin kuralının istemci kopyası. */
  minQueryLength: number
  labels: CityPickerLabels
  forms: CityPickerForms
  /** URL'den çözülmüş şehir; alan bununla dolu açılır. */
  defaultCity?: CityOption | null
  /**
   * Çözülemeyen ham metin (eski bir bağlantıdan gelen `?nerede=prag` gibi).
   * Kutuya yazılı geliyor ki kullanıcı listeden doğrusunu tek tıkla seçebilsin —
   * sessizce silinmesi, "bir şey aramıştım" hissini karşılıksız bırakırdı.
   */
  defaultQuery?: string
}

type ListState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  items: T[]
}

/**
 * Şehir sonucu, HANGİ İSTEĞE ait olduğuyla birlikte saklanıyor.
 *
 * Anahtar olmasaydı "yükleniyor" durumunu efekt içinde `setState` ile kurmak
 * gerekirdi; React 19 bunu haklı olarak cascading render sayıyor (lint kuralı
 * `react-hooks/set-state-in-effect`). Anahtarla birlikte durum TÜRETİLEBİLİYOR:
 * elde tutulan sonucun anahtarı o anki isteğin anahtarından farklıysa cevap
 * beklendiği kesindir. Yan fayda, eski sorgunun sonuçlarının yeni sorgunun
 * altında bir an görünmesinin imkânsız hâle gelmesi.
 */
type CityResults = ListState<CityOption> & { key: string }

type Option =
  | { kind: 'reset'; id: string }
  | { kind: 'country'; id: string; country: CountryOption; label: string }
  | { kind: 'city'; id: string; city: CityOption; label: string }

export function CityPicker({
  lang,
  preferEnglishName,
  minQueryLength,
  labels,
  forms,
  defaultCity = null,
  defaultQuery = '',
}: CityPickerProps) {
  const [selected, setSelected] = useState<CityOption | null>(defaultCity)
  const [query, setQuery] = useState(() =>
    defaultCity ? selectedText(lang, labels, preferEnglishName, defaultCity) : defaultQuery,
  )
  const [open, setOpen] = useState(false)
  /** Ülkeye göre gezinme filtresi. `null` → ülke listesi gösteriliyor. */
  const [countryCode, setCountryCode] = useState<string | null>(null)
  const [countries, setCountries] = useState<ListState<CountryOption>>({
    status: 'idle',
    items: [],
  })
  const [fetched, setFetched] = useState<CityResults>({ key: '', status: 'idle', items: [] })
  /**
   * Sanal odak KİMLİKLE tutuluyor, sırayla değil. Liste değiştiğinde eski kimlik
   * yeni listede bulunmuyor ve işaret kendiliğinden düşüyor — "seçenekler değişti,
   * indeksi sıfırla" diye ayrı bir efekt (ve onun tetiklediği fazladan render)
   * gerekmiyor.
   */
  const [activeId, setActiveId] = useState<string | null>(null)

  const fieldId = useId()
  const listboxId = `${fieldId}-liste`
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  /** Ülke listesi panel başına bir kez isteniyor; hata olursa yeniden denenebilir. */
  const countriesRequested = useRef(false)

  const folded = useMemo(() => foldSearchText(query), [query])

  /** Seçili şehrin alanda yazan hâli — "Praha, Çekya". */
  const selectedLabel = selected ? selectedText(lang, labels, preferEnglishName, selected) : ''

  /**
   * Kutuda DOKUNULMAMIŞ bir seçim duruyor. O metni arama sanmak, alana geri
   * dönen kullanıcıya "Praha, Çekya" araması yaptırıp "sonuç yok" göstermek
   * olurdu. Bu durumda seçici gezinme moduna (ülke listesi) düşüyor; ilk tuş
   * vuruşu metni değiştirdiği anda arama başlıyor.
   */
  const showingSelection = selected !== null && query === selectedLabel

  const searching = !showingSelection && folded.length >= minQueryLength
  const wantsCities = searching || countryCode !== null

  /** O anda hangi cevabın beklendiği. Boş dize → şehir sorulmuyor. */
  const requestKey = wantsCities ? `${countryCode ?? ''}|${searching ? folded : ''}` : ''

  const cities: ListState<CityOption> = !wantsCities
    ? { status: 'idle', items: NO_CITIES }
    : fetched.key === requestKey
      ? { status: fetched.status, items: fetched.items }
      : { status: 'loading', items: NO_CITIES }

  // Dışarı tıklama paneli kapatır. Escape input'un kendi işleyicisinde: odak her
  // zaman orada ve olayı yakalayan tek yer olması, iki kez kapatmayı önlüyor.
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  /**
   * Ülke listesi paneli AÇAN OLAYDA isteniyor, efektte değil: React'in kendi
   * önerisi bu ("You Might Not Need an Effect") ve burada da doğrusu o — istek
   * bir durum senkronizasyonu değil, kullanıcının paneli açmasının sonucu.
   * Panel başına bir kez; hata olursa bayrak geri açılıyor ve sonraki açılışta
   * yeniden deneniyor.
   */
  const loadCountries = () => {
    if (countriesRequested.current) return
    countriesRequested.current = true
    setCountries({ status: 'loading', items: [] })

    fetch(COUNTRIES_ENDPOINT)
      .then(async (response) => {
        if (!response.ok) throw new Error(`ulke listesi ${response.status}`)
        return (await response.json()) as { countries: CountryOption[] }
      })
      .then((payload) => setCountries({ status: 'ready', items: payload.countries }))
      .catch((error: unknown) => {
        // Yutulmuyor: konsola yazılıyor ve listede görünür bir hata satırına
        // dönüşüyor. Boş liste göstermek "hiçbir ülkede deneyim yok" derdi.
        console.error('city-picker.countries', error)
        countriesRequested.current = false
        setCountries({ status: 'error', items: [] })
      })
  }

  const openPanel = () => {
    setOpen(true)
    loadCountries()
  }

  // Şehir araması. Her değişiklikte önceki istek İPTAL ediliyor — sıralama
  // sorunu böyle çözülüyor: geç gelen eski bir yanıtın yeniyi ezmesi imkânsız.
  // Efektin gövdesinde `setState` YOK; "yükleniyor" durumu `requestKey` ile
  // türetiliyor (bkz. `CityResults`).
  useEffect(() => {
    if (!open || requestKey === '') return

    const controller = new AbortController()

    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      // KATLANMIŞ metin gidiyor: aynı aramanın farklı yazımları tek URL'e
      // düşüyor ve tarayıcı önbelleği işe yarıyor. Katlama idempotent, yani
      // sunucu kendi `SearchText.Fold`'unu yeniden uyguladığında sonuç değişmiyor
      // — kural yine sunucunun.
      if (searching) params.set('q', folded)
      if (countryCode) params.set('ulke', countryCode)

      fetch(`${CITIES_ENDPOINT}?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`sehir aramasi ${response.status}`)
          return (await response.json()) as { cities: CityOption[] }
        })
        .then((payload) => {
          if (controller.signal.aborted) return
          setFetched({ key: requestKey, status: 'ready', items: payload.cities })
        })
        .catch((error: unknown) => {
          // İptal bir hata değil, tasarımın parçası: her tuş önceki isteği kesiyor.
          if (controller.signal.aborted) return
          console.error('city-picker.search', error)
          setFetched({ key: requestKey, status: 'error', items: [] })
        })
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [open, requestKey, searching, folded, countryCode])

  /**
   * Ülke adları kullanıcının dilinde ve o dilin sıralamasıyla. Kendi çeviri
   * tablomuzu tutmuyoruz: ICU zaten taşıyor ve 249 ülkeyi her arayüz diline
   * çevirmek, açtığımız her yeni dilde 249 satırlık çeviri borcu demekti
   * (docs/I18N.md §1; API tarafı da bu yüzden yalnız kod + İngilizce ad dönüyor).
   */
  const countryMatches = useMemo(() => {
    if (countryCode !== null) return []

    const collator = new Intl.Collator(lang)

    return countries.items
      .map((country) => ({ country, label: regionName(lang, country.code) ?? country.englishName }))
      .filter(({ country, label }) => {
        if (!folded) return true
        return (
          foldSearchText(label).startsWith(folded) ||
          foldSearchText(country.englishName).startsWith(folded)
        )
      })
      .sort((a, b) => collator.compare(a.label, b.label))
  }, [countries.items, countryCode, folded, lang])

  /*
    Liste GÖRSEL olarak gruplu ama klavye için TEK dizi. Ok tuşları grupları
    aşarak yürüyor; `aria-activedescendant` de tek bir kimlik taşıyabiliyor.
    Üç parça ayrı ayrı üretilip birleştiriliyor, sonra aynı sırayla basılıyor —
    böylece ekrandaki sıra ile klavyedeki sıra ayrışamıyor.
  */
  const resetOption = useMemo<Option | null>(
    () => (countryCode === null ? null : { kind: 'reset', id: `${fieldId}-reset` }),
    [countryCode, fieldId],
  )

  const countryOptions = useMemo<Option[]>(
    () =>
      countryMatches.map((match) => ({
        kind: 'country',
        id: `${fieldId}-ulke-${match.country.code}`,
        country: match.country,
        label: match.label,
      })),
    [countryMatches, fieldId],
  )

  const cityOptions = useMemo<Option[]>(
    () =>
      cities.items.map((city) => ({
        kind: 'city',
        id: `${fieldId}-sehir-${city.key}`,
        city,
        label: preferEnglishName ? city.englishName : city.name,
      })),
    [cities.items, fieldId, preferEnglishName],
  )

  const options = useMemo<Option[]>(
    () => [...(resetOption ? [resetOption] : []), ...countryOptions, ...cityOptions],
    [resetOption, countryOptions, cityOptions],
  )

  /** Grupların düz dizideki başlangıç kaydırmaları. */
  const countryOffset = resetOption ? 1 : 0
  const cityOffset = countryOffset + countryOptions.length

  /*
    İşaretli satırın indeksi TÜRETİLİYOR. Liste yenilendiğinde eski kimlik yeni
    listede bulunamaz ve indeks -1e düşer: kullanıcı ok tuşuna basmadan hiçbir
    şehir "seçili" görünmez (ARIA APG kuralı) ve bunun için bir efekt gerekmez.
  */
  const activeIndex = activeId ? options.findIndex((option) => option.id === activeId) : -1
  const resolvedActiveId = activeIndex >= 0 && activeId ? activeId : undefined

  /** Ok/Home/End tuşlarının ortak adımı: indeksten kimliğe. */
  const moveActive = (index: number) => setActiveId(options[index]?.id ?? null)

  // İşaretli satır görünür alanda kalsın; DOM odağı taşınmadığı için tarayıcı bunu
  // kendiliğinden yapmıyor.
  useEffect(() => {
    if (!resolvedActiveId) return
    document.getElementById(resolvedActiveId)?.scrollIntoView({ block: 'nearest' })
  }, [resolvedActiveId])

  const closePanel = () => {
    setOpen(false)
    setCountryCode(null)
    setActiveId(null)
    // Metin seçime geri dönüyor. Yazılanı bırakmak, kutuda "Berl" yazarken
    // aramanın Praha'da olduğu bir durum üretirdi.
    setQuery(selectedLabel)
  }

  const choose = (option: Option) => {
    setActiveId(null)

    if (option.kind === 'reset') {
      setCountryCode(null)
      setQuery('')
      return
    }

    if (option.kind === 'country') {
      setCountryCode(option.country.code)
      setQuery('')
      return
    }

    setSelected(option.city)
    setQuery(selectedText(lang, labels, preferEnglishName, option.city))
    setCountryCode(null)
    setOpen(false)
    inputRef.current?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()

      if (!open) {
        openPanel()
        return
      }

      if (options.length === 0) return

      // Uçlarda başa/sona sarıyor: 156 şehirlik bir kayıt defterinde listenin
      // sonuna gelip takılmak, kullanıcıyı yeniden yukarı taramaya zorlar.
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const next = activeIndex + delta
      moveActive(next < 0 ? options.length - 1 : next >= options.length ? 0 : next)
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      if (!open || options.length === 0) return
      event.preventDefault()
      moveActive(event.key === 'Home' ? 0 : options.length - 1)
      return
    }

    if (event.key === 'Enter') {
      // Liste kapalıysa Enter formu gönderir (varsayılan davranış korunuyor).
      if (!open || options.length === 0) return

      event.preventDefault()

      // İşaretli satır yokken göndermek, yazılan metni sessizce çöpe atmak olurdu.
      // Bunun yerine ilk seçenek işaretleniyor: kullanıcı Enter'ın ne yapacağını
      // görüyor ve ikinci Enter onu seçiyor.
      if (activeIndex < 0) {
        moveActive(0)
        return
      }

      const option = options[activeIndex]
      if (option) choose(option)
      return
    }

    if (event.key === 'Escape') {
      if (!open) return
      event.preventDefault()
      closePanel()
      return
    }

    if (event.key === 'Tab' && open) {
      closePanel()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/*
        Forma giden TEK alan. Boşken sunucu "şehir seçilmedi" görüyor; asla
        kullanıcının yazdığı ham metni almıyor.
      */}
      <input type="hidden" name="nerede" value={selected?.key ?? ''} />

      <label className="search-field" htmlFor={fieldId}>
        <span className="search-field-label">{labels.field}</span>
        <input
          ref={inputRef}
          id={fieldId}
          /*
            `type="text"`, `type="search"` DEĞİL: search kutusunda Escape'i bazı
            tarayıcılar alanı temizlemek için kendisi kullanıyor ve paneli
            kapatan davranışımızla çakışıyor. Native temizleme düğmesi de React
            durumunu atlıyordu.
          */
          type="text"
          role="combobox"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            // Metin değişti: seçim artık geçerli değil. Gizli alan boşalıyor ki
            // kutuda yazan ile forma giden asla ayrışmasın.
            setSelected(null)
            openPanel()
          }}
          /* Odakta metin işaretleniyor: seçili şehrin adı duruyorken ilk tuş
             vuruşu onu değiştirsin, kullanıcı önce silmek zorunda kalmasın. */
          onFocus={(event) => {
            event.target.select()
            openPanel()
          }}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={resolvedActiveId}
          placeholder={labels.placeholder}
          autoComplete="off"
          className="search-field-input pe-7"
        />
      </label>

      {selected ? (
        <button
          type="button"
          onClick={() => {
            setSelected(null)
            setQuery('')
            setCountryCode(null)
            setActiveId(null)
            openPanel()
            inputRef.current?.focus()
          }}
          aria-label={labels.clear}
          className="absolute end-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-sm text-fg-muted transition-colors duration-150 hover:bg-[rgb(var(--glass-tint)_/_0.35)] focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}

      {/*
        Canlı bölge PANELDEN BAĞIMSIZ duruyor: yalnız açıkken basılsaydı ilk
        duyuru kaçardı, ekran okuyucu boş bir bölgenin sonradan dolmasını
        duyurmuyor.
      */}
      <p aria-live="polite" className="sr-only">
        {open ? announcement(lang, labels, forms, cities, options.length, wantsCities) : ''}
      </p>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={labels.listLabel}
          /* Panel opak: arkasında video akarken şehir listesi okunmaz — kontrast
             AA'nın altına düşüyor (CLAUDE.md: örtü artar, metin rengi değişmez). */
          style={{ backgroundColor: 'color-mix(in oklch, var(--bg) 97%, transparent)' }}
          /*
            Telefonda viewport'a sabit (`inset-x-4`), masaüstünde alanın ALTINDA ve
            sola hizalı — dil seçicinin `end-0`'ı burada yanlış olurdu: bu alan
            çubuğun solunda, panel sağa hizalanırsa alanla ilgisiz bir yerde açılır.
            `start-0` RTL'de kendiliğinden sağa dönüyor.
          */
          className="glass glass-edge fixed inset-x-4 top-[4.25rem] z-30 flex max-h-[22rem] flex-col overflow-y-auto rounded-[var(--radius-glass)] p-2 text-start sm:absolute sm:inset-x-auto sm:start-0 sm:top-full sm:mt-2 sm:w-[24rem]"
        >
          {resetOption ? (
            <Row
              option={resetOption}
              active={activeIndex === 0}
              lang={lang}
              labels={labels}
              forms={forms}
              preferEnglishName={preferEnglishName}
              onSelect={choose}
            />
          ) : null}

          {countryOptions.length > 0 ? (
            /* `role="group"` listbox'ın izin verdiği tek ara katman; başlığın
               kendisi `aria-hidden` çünkü adı zaten grubun etiketi taşıyor —
               iki kez okunması gürültü olurdu. */
            <div role="group" aria-label={labels.countriesHeading}>
              <p aria-hidden="true" className={HEADING_CLASS}>
                {labels.countriesHeading}
              </p>
              {countryOptions.map((option, index) => (
                <Row
                  key={option.id}
                  option={option}
                  active={activeIndex === countryOffset + index}
                  lang={lang}
                  labels={labels}
                  forms={forms}
                  preferEnglishName={preferEnglishName}
                  onSelect={choose}
                />
              ))}
            </div>
          ) : null}

          {cityOptions.length > 0 ? (
            <div role="group" aria-label={labels.citiesHeading}>
              <p aria-hidden="true" className={HEADING_CLASS}>
                {labels.citiesHeading}
              </p>
              {cityOptions.map((option, index) => (
                <Row
                  key={option.id}
                  option={option}
                  active={activeIndex === cityOffset + index}
                  lang={lang}
                  labels={labels}
                  forms={forms}
                  preferEnglishName={preferEnglishName}
                  onSelect={choose}
                />
              ))}
            </div>
          ) : null}

          <Status
            labels={labels}
            optionCount={options.length}
            cities={cities}
            countries={countries}
            wantsCities={wantsCities}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Bir satır. Ülke ve şehir aynı bileşende: ikisi de listbox'ın seçeneği ve
 * klavye gezinmesi tek dizi üzerinde yürüyor.
 */
function Row({
  option,
  active,
  lang,
  labels,
  forms,
  preferEnglishName,
  onSelect,
}: {
  option: Option
  active: boolean
  lang: string
  labels: CityPickerLabels
  forms: CityPickerForms
  preferEnglishName: boolean
  onSelect: (option: Option) => void
}) {
  // `cursor-pointer` + `select-none`: satır tıklanabilir seçenek; metin imleci
  // (I-beam) "yazı seçilir" hissi verip tıklanamayacak gibi duruyordu.
  const className = `flex w-full cursor-pointer select-none items-center justify-between gap-3 rounded-[var(--radius-glass-sm)] px-2 py-2 text-start text-sm transition-colors duration-150 hover:bg-[rgb(var(--glass-tint)_/_0.22)] ${
    active ? 'bg-[rgb(var(--glass-tint)_/_0.35)]' : ''
  }`

  // `onMouseDown` engelleniyor: tıklama input'un odağını almasın. Odak kaybı
  // paneli kapatır ve tıklama hiçbir zaman seçime dönüşmezdi.
  const handlers = {
    onMouseDown: (event: React.MouseEvent) => event.preventDefault(),
    onClick: () => onSelect(option),
  }

  if (option.kind === 'reset') {
    return (
      <div id={option.id} role="option" aria-selected={active} className={className} {...handlers}>
        <span className="font-medium">
          <span aria-hidden="true" className="me-2">
            ←
          </span>
          {labels.allCountries}
        </span>
      </div>
    )
  }

  if (option.kind === 'country') {
    return (
      <div id={option.id} role="option" aria-selected={active} className={className} {...handlers}>
        <span className="min-w-0 truncate font-medium">{option.label}</span>
        <span className="shrink-0 text-xs text-fg-muted">
          {formatPlural(lang, forms.countryCities, option.country.cityCount)}
        </span>
      </div>
    )
  }

  const region = regionName(lang, option.city.countryCode) ?? option.city.countryCode
  // İkinci satırda ülke; ad kullanıcının gördüğünden farklıysa öbür yazım da
  // yazılıyor ("Praha · Çekya · Prague") — hangi şehir olduğu tartışmasız olsun.
  const other = preferEnglishName ? option.city.name : option.city.englishName
  const secondary = other === option.label ? region : `${region} · ${other}`

  return (
    <div id={option.id} role="option" aria-selected={active} className={className} {...handlers}>
      <span className="min-w-0">
        <span className="block truncate font-medium">{option.label}</span>
        <span className="block truncate text-xs text-fg-muted">{secondary}</span>
      </span>
    </div>
  )
}

/**
 * Listenin durum satırı. Boş liste ASLA sessiz kalmıyor: yükleniyor mu, hata mı,
 * gerçekten sonuç yok mu, yoksa daha yazmak mı gerekiyor — dördü ayrı cümle.
 */
function Status({
  labels,
  optionCount,
  cities,
  countries,
  wantsCities,
}: {
  labels: CityPickerLabels
  optionCount: number
  cities: ListState<CityOption>
  countries: ListState<CountryOption>
  wantsCities: boolean
}) {
  const line = (text: string) => <p className="px-2 py-4 text-center text-sm text-fg-muted">{text}</p>

  if (cities.status === 'error') return line(labels.error)
  if (countries.status === 'error' && !wantsCities) return line(labels.error)

  // Şehirler yükleniyorsa satır HER ZAMAN görünür: ülke filtresinde listede
  // "← Tüm ülkeler" satırı duruyor ve tek başına "sonuç yok" gibi okunuyordu.
  if (cities.status === 'loading') return line(labels.loading)
  if (countries.status === 'loading' && optionCount === 0) return line(labels.loading)

  if (optionCount === 0) {
    if (wantsCities) {
      return cities.status === 'ready' ? line(labels.empty) : null
    }
    return line(labels.tooShort)
  }

  // Liste tavanda geldiyse KIRPILDIĞI söyleniyor. Sessizce kesilen bir liste,
  // kullanıcıya şehrinin kayıtlı olmadığını düşündürür.
  if (cities.status === 'ready' && cities.items.length >= MAX_RESULTS) {
    return <p className="px-2 py-2 text-center text-xs text-fg-muted">{labels.truncated}</p>
  }

  return null
}

/** Seçili şehrin alandaki metni: "Praha, Çekya". Sıra ve ayraç çevirmenin elinde. */
function selectedText(
  lang: string,
  labels: CityPickerLabels,
  preferEnglishName: boolean,
  city: CityOption,
): string {
  return interpolate(lang, labels.selectedValue, {
    sehir: preferEnglishName ? city.englishName : city.name,
    ulke: regionName(lang, city.countryCode) ?? city.countryCode,
  })
}

/**
 * Ekran okuyucuya durum duyurusu. Görsel kullanıcı listenin dolduğunu görüyor;
 * duyurmazsak klavye kullanıcısı için hiçbir şey olmuyor gibi görünür.
 */
function announcement(
  lang: string,
  labels: CityPickerLabels,
  forms: CityPickerForms,
  cities: ListState<CityOption>,
  optionCount: number,
  wantsCities: boolean,
): string {
  if (cities.status === 'error') return labels.error
  if (cities.status === 'loading') return labels.loading
  if (wantsCities && cities.status === 'ready') {
    return formatPlural(lang, forms.results, cities.items.length)
  }
  // Ne arama var ne de ülke filtresi: liste boşsa kullanıcı neden boş olduğunu
  // duymalı, doluysa (ülke listesi) listbox'ın kendisi zaten duyuruluyor.
  return optionCount === 0 ? labels.tooShort : ''
}

/**
 * Ülke adı kullanıcının dilinde: `CZ` → "Çekya" (tr), "Czechia" (en).
 * `lib/languages.ts:localNameOf` ile aynı kalıp — ICU verisi Node ve tarayıcıda
 * aynı olduğu için sunucu/istemci metni ayrışmıyor.
 */
function regionName(lang: string, code: string): string | undefined {
  try {
    return new Intl.DisplayNames([lang], { type: 'region', fallback: 'none' }).of(code)
  } catch {
    // Geçersiz locale etiketi. Yutulmuyor: çağıran `undefined` görüp İngilizce ada
    // düşüyor, yani satır her zaman bir ad taşıyor.
    return undefined
  }
}

/** NFD ile çözülmeyen harfler — `SearchText.Expand` tablosunun aynısı. */
const EXPANSIONS: Readonly<Record<string, string>> = {
  ı: 'i',
  ß: 'ss',
  ẞ: 'ss',
  ø: 'o',
  Ø: 'o',
  æ: 'ae',
  Æ: 'ae',
  œ: 'oe',
  Œ: 'oe',
  đ: 'd',
  Đ: 'd',
  ð: 'd',
  Ð: 'd',
  þ: 'th',
  Þ: 'th',
  ł: 'l',
  Ł: 'l',
  ħ: 'h',
  Ħ: 'h',
  ŀ: 'l',
  Ŀ: 'l',
}

const COMBINING_MARK = /\p{Mn}/u
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u

/**
 * Aksan duyarsız arama anahtarı — API'deki `SearchText.Fold`'un TypeScript
 * karşılığı ve bilinçli bir kopya.
 *
 * İki işi var, ikisi de sunucuya sormadan yapılmak zorunda:
 * 1. "Bu metin sormaya değer mi" (en az iki harf). Her tuşta bir gidiş-dönüşle
 *    öğrenilecek bir şey değil.
 * 2. Ülke listesinin yerel filtrelemesi — o liste zaten tarayıcıda.
 *
 * `lib/languages.ts` içindeki `fold` KULLANILMIYOR (ve kullanılamaz): orası
 * `toLocaleLowerCase('tr-TR')` yapıyor, yani `I` → `ı`. Şehir adı araması Türkçe
 * kuralda katlanırsa "ISTANBUL" ile "istanbul" ayrışır — API tarafı da tam bu
 * yüzden invariant katlıyor. Ayrıca ß/ø/æ gibi ayrışmayan harfler orada açılmıyor.
 *
 * Katlamanın YETKİLİSİ yine sunucu: buradaki çıktı hiçbir zaman sorguya
 * yazılmıyor, ham metin gönderiliyor.
 */
function foldSearchText(value: string): string {
  // Sunucudaki `SearchText.MaxLength` ile aynı kırpma: daha uzun bir metin
  // doğrulamadan 400 ile döner ve kullanıcı hata ekranını hak etmiyor.
  const source = value.trim().slice(0, 200)

  let expanded = ''
  for (const character of source) {
    expanded += EXPANSIONS[character] ?? character
  }

  const decomposed = expanded.normalize('NFD')
  let result = ''
  let pendingSpace = false

  for (const character of decomposed) {
    if (COMBINING_MARK.test(character)) continue

    if (LETTER_OR_DIGIT.test(character)) {
      if (pendingSpace && result.length > 0) result += ' '
      pendingSpace = false
      // Invariant: `toLocaleLowerCase` değil. Türkçe kuralda "I" → "ı" olurdu.
      result += character.toLowerCase()
      continue
    }

    pendingSpace = true
  }

  return result.normalize('NFC')
}
