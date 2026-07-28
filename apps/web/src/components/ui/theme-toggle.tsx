'use client'

import { useSyncExternalStore } from 'react'
import { GlassButton } from './glass-button'

type Theme = 'light' | 'dark'

const THEME_EVENT = 'tajriba:themechange'

/**
 * Tema geçişi.
 *
 * Kaynak tek: `<html data-theme>`. React state tutmuyoruz — tema DOM'da yaşıyor
 * (layout'taki inline script hidrasyondan önce basıyor, yoksa koyu tema kullanıcısı
 * ilk karede beyaz ekran görürdü). useSyncExternalStore o DOM'u okuyor.
 */
function subscribe(onChange: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', onChange)
  window.addEventListener('storage', onChange)
  window.addEventListener(THEME_EVENT, onChange)

  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener('storage', onChange)
    window.removeEventListener(THEME_EVENT, onChange)
  }
}

function getSnapshot(): Theme {
  const attr = document.documentElement.dataset.theme
  if (attr === 'dark' || attr === 'light') return attr
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Sunucuda tema bilinemez; ikon ilk boyamada boş kalır, hidrasyonda dolar. */
function getServerSnapshot(): Theme | null {
  return null
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    window.dispatchEvent(new Event(THEME_EVENT))
  }

  return (
    <GlassButton
      size="sm"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
      className="w-9 !px-0"
    >
      <span aria-hidden="true">{theme === null ? '' : theme === 'dark' ? '☀' : '☾'}</span>
    </GlassButton>
  )
}
