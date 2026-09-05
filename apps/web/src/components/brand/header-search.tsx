import { path } from '@/lib/routes'

/**
 * Header'daki kompakt arama hapı — tasarımın orta sütunu.
 *
 * **Form DEĞİL, link.** Üç alanı da doldurmak için gereken seçiciler (şehir
 * autocomplete, tarih tekerleği, misafir sayacı) istemci bileşeni ve hepsini
 * header'a koymak her sayfaya o JS'i indirirdi. Hap, arama alanlarının yaşadığı
 * yere (`/kesfet`) götürüyor; oradaki gerçek çubuk `experience-search.tsx`.
 *
 * Ana sayfada hero'nun içinde ayrıca büyük çubuk var — tasarım ikisini birden
 * gösteriyor, biri diğerinin yerine geçmiyor.
 */
export function HeaderSearch({
  lang,
  labels,
}: {
  lang: string
  labels: { where: string; when: string; who: string; submit: string }
}) {
  return (
    <a
      href={path(lang, 'explore')}
      aria-label={labels.submit}
      className="hidden h-13 max-w-full min-w-0 items-center justify-self-center rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] py-0 pr-1.5 pl-6 whitespace-nowrap shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-lifted)] md:flex"
    >
      <span className="pr-5 text-[0.9375rem] font-bold">{labels.where}</span>
      <span className="h-6 w-px bg-[var(--line-strong)]" />
      <span className="px-5 text-[0.9375rem] font-bold">{labels.when}</span>
      <span className="h-6 w-px bg-[var(--line-strong)]" />
      <span className="px-5 text-[0.9375rem] font-medium text-fg-muted">{labels.who}</span>
      <span className="glass-brand inline-flex size-10 items-center justify-center rounded-[0.875rem]">
        <SearchIcon />
      </span>
    </a>
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
