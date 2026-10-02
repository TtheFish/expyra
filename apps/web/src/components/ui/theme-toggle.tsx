/**
 * Tema düğmesi — React / hidrasyon / document delegasyonu YOK.
 *
 * Tıklama HTML `onclick` özniteliğinde (progressive enhancement). Layout
 * script'i yalnız localStorage'dan ilk temayı basar; click listener birikmez,
 * text-node `.closest` tuzağı yok, soft nav sonrası da düğme kendi handler'ını taşır.
 */

export type ThemeToggleLabels = {
  toLight: string
  toDark: string
}

export function ThemeToggle({ labels }: { labels: ThemeToggleLabels }) {
  const toLight = escapeAttr(labels.toLight)
  const toDark = escapeAttr(labels.toDark)

  // this = button. İkon SVG — tıklama hedefi her zaman Element.
  const onClick = [
    "var r=document.documentElement;",
    "var n=r.getAttribute('data-theme')==='dark'?'light':'dark';",
    "r.setAttribute('data-theme',n);",
    "try{localStorage.setItem('theme',n)}catch(e){}",
    "var L=this.getAttribute('data-label-to-light');",
    "var D=this.getAttribute('data-label-to-dark');",
    "if(L&&D)this.setAttribute('aria-label',n==='dark'?L:D);",
  ].join('')

  return (
    <span
      className="contents"
      dangerouslySetInnerHTML={{
        __html: `<button type="button" class="glass glass-edge glass-interactive inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-glass-sm)] text-sm font-medium text-fg" data-theme-toggle="" data-label-to-light="${toLight}" data-label-to-dark="${toDark}" aria-label="${toDark}" onclick="${escapeAttr(onClick)}">${moonSvg}${sunSvg}</button>`,
      }}
    />
  )
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const moonSvg =
  '<svg class="theme-toggle-icon theme-toggle-icon--moon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 14.3A9 9 0 1 1 9.7 3a7 7 0 1 0 11.3 11.3z"/></svg>'

const sunSvg =
  '<svg class="theme-toggle-icon theme-toggle-icon--sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
