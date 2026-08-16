/** Ortak alt bilgi. Header ile aynı gerekçe: her sayfaya kopyalanmıştı. */
export function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--glass-border)] px-1 py-4 text-xs text-fg-muted">
        <span className="font-semibold tracking-tight text-fg">Expyra</span>
        <span className="font-mono">Faz 0 · iskelet</span>
      </div>
    </footer>
  )
}
