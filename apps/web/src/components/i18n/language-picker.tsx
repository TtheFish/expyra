'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  contentLanguages,
  localNameOf,
  searchLanguages,
  uiLanguages,
  type Language,
} from '@/lib/languages'
import { isRoutableLanguage, switchLanguage } from '@/lib/routes'

/**
 * Dil seçici.
 *
 * İki grup gösteriyor çünkü sistemde iki ayrı dil kavramı var (docs/I18N.md §1):
 * arayüz çevirisi kademeli açılıyor (şu an EN + TR), içerik dili ise sınırsız —
 * host Korece deneyim yazabilir. Tek liste gösterirsek kullanıcı 49 dilin
 * hepsinde arayüz bekler ve seçtiğinde hiçbir şey değişmeyince bozuk sanır.
 *
 * Seçim şimdilik yalnızca kaydediliyor: arayüz çevirisi Faz 8.1'de geliyor.
 * Bunu panelde açıkça yazıyoruz — sessizce hiçbir şey yapmayan bir kontrol,
 * çalışmayan bir kontroldür.
 */

const COOKIE_NAME = 'expyra_lang'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function LanguagePicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    // Panel açılınca odak arama kutusuna: 49 dilde tab'layarak gezmek işkence.
    searchRef.current?.focus()

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Liste kullanıcının seçtiği dilde adlandırılıyor; arama da o adlar üzerinde.
  const uiMatches = useMemo(() => searchLanguages(uiLanguages, query, selected), [query, selected])
  const contentMatches = useMemo(
    () =>
      searchLanguages(contentLanguages, query, selected).filter((item) => !item.uiAvailable),
    [query, selected],
  )

  const choose = (language: Language) => {
    setSelected(language.code)
    // httpOnly değil, bilinçli: dil tercihi hassas veri değil ve sunucu tarafı
    // (Faz 8.1) aynı çerezi okuyacak. SameSite=Lax — e-postadan gelen bağlantı
    // tercihi kaybetmesin.
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(language.code)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
    setOpen(false)

    // Arayüz dili ise URL de değişmeli: /tr/kesfet → /en/explore. Aynı sayfada
    // kalıyoruz — dil değiştirmenin bedelini kullanıcıya ana sayfaya atarak ödetmek
    // en sık yapılan i18n hatası (docs/I18N.md §5).
    if (isRoutableLanguage(language.code)) {
      // Query korunuyor: arama durumu URL'de yaşıyor (`?nerede=prag&yetiskin=2`).
      // Dil değiştirince aramanın sıfırlanması, kullanıcının girdiği her şeyi
      // silmek demek. useSearchParams yerine window: bu bir olay işleyicisi,
      // her zaman istemcide çalışıyor ve Suspense sınırı gerektirmiyor.
      router.push(switchLanguage(pathname, language.code) + window.location.search)
      return
    }

    // Arayüz çevirisi olmayan bir içerik dili: yalnızca tercih saklanır.
    // `<html lang>`e DOKUNULMUYOR — sayfa hâlâ Türkçe ve `lang="ja"` yazmak
    // ekran okuyucuyu Japonca ses motoruna geçirip metni anlaşılmaz kılar
    // (WCAG 3.1.1). `lang`/`dir`in tek kaynağı [lang]/layout.tsx.
    triggerRef.current?.focus()
  }

  const currentLanguage =
    uiLanguages.find((item) => item.code === selected) ??
    contentLanguages.find((item) => item.code === selected)

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Dil: ${currentLanguage?.nativeName ?? selected}. Değiştir.`}
        className="glass glass-edge glass-interactive inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-glass-sm)] px-3 text-sm font-medium text-nav-link"
      >
        <span aria-hidden="true">🌐</span>
        <span className="uppercase">{currentLanguage?.code ?? selected}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Dil seçimi"
          /* Panel opak — arkasında video akarken 49 satırlık liste okunmaz. */
          style={{ backgroundColor: 'color-mix(in oklch, var(--bg) 97%, transparent)' }}
          /*
            Telefonda viewport'a sabitleniyor. `absolute right-0` + sabit genişlik,
            tetikleyici sağda olduğu için paneli ekranın soluna taşırıyordu:
            375 px'te sol kenar -140 px, yani dil adlarının tamamı ekran dışında
            kalıp yalnız iki harflik kodlar görünüyordu. `end-0` (RTL için `right`
            değil) ve `sm:` üstü eski davranış.
          */
          className="glass glass-edge fixed inset-x-4 top-[4.25rem] z-30 flex max-h-[26rem] flex-col rounded-[var(--radius-glass)] p-3 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[22rem]"
        >
          <label className="sr-only" htmlFor={`${panelId}-ara`}>
            Dil ara
          </label>
          <input
            ref={searchRef}
            id={`${panelId}-ara`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Dil ara"
            autoComplete="off"
            className="mb-2 w-full rounded-[var(--radius-glass-sm)] border border-[var(--glass-border)] bg-transparent px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-brand-400"
          />

          <div className="min-h-0 flex-1 overflow-y-auto">
            {uiMatches.length > 0 ? (
              <Group title="Arayüz dilleri">
                {uiMatches.map((language) => (
                  <LanguageRow
                    key={language.code}
                    language={language}
                    displayLanguage={selected}
                    selected={language.code === selected}
                    onSelect={choose}
                  />
                ))}
              </Group>
            ) : null}

            {contentMatches.length > 0 ? (
              <Group
                title="Diğer diller"
                hint="Arayüz çevirisi henüz yok — deneyim içeriği bu dillerde yayınlanabilir."
              >
                {contentMatches.map((language) => (
                  <LanguageRow
                    key={language.code}
                    language={language}
                    displayLanguage={selected}
                    selected={language.code === selected}
                    onSelect={choose}
                  />
                ))}
              </Group>
            ) : null}

            {uiMatches.length === 0 && contentMatches.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-fg-muted">
                Bu aramaya uyan dil yok.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Group({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-2 last:mb-0">
      <h3 className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </h3>
      {hint ? <p className="px-2 pb-2 text-xs text-fg-muted">{hint}</p> : null}
      <ul className="space-y-0.5">{children}</ul>
    </section>
  )
}

function LanguageRow({
  language,
  displayLanguage,
  selected,
  onSelect,
}: {
  language: Language
  displayLanguage: string
  selected: boolean
  onSelect: (language: Language) => void
}) {
  // İkinci satır kullanıcının dilinde: "日本語 / Japonca". ICU o dili tanımıyorsa
  // İngilizce ada düşülür — satır asla boş kalmaz.
  const localName = localNameOf(language.code, displayLanguage) ?? language.englishName

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(language)}
        aria-current={selected ? 'true' : undefined}
        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-glass-sm)] px-2 py-2 text-left text-sm transition-colors duration-150 hover:bg-[rgb(var(--glass-tint)_/_0.22)] focus-visible:outline-2 focus-visible:outline-brand-400 focus-visible:outline-offset-[-2px]"
      >
        <span className="min-w-0">
          {/* Dil kendi dilinde yazılır; lang özniteliği olmadan ekran okuyucu
              "日本語"ü İngilizce sesletmeye çalışır. */}
          <span lang={language.code} className="block truncate font-medium">
            {language.nativeName}
          </span>
          <span className="block truncate text-xs text-fg-muted">{localName}</span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs uppercase text-fg-muted">{language.code}</span>
          <span aria-hidden="true" className={selected ? 'text-brand-400' : 'opacity-0'}>
            ✓
          </span>
        </span>
      </button>
    </li>
  )
}
