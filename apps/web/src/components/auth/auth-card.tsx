import type { ReactNode } from 'react'
import { GlassSurface } from '@/components/ui/glass-surface'

/**
 * Giriş kartı.
 *
 * Yeni bir cam yüzey TANIMLAMIYOR: `GlassSurface tone="thick"` — misafir seçici
 * panelinin yoğunluğu. Elle `backdrop-filter` yazmak yasak (CLAUDE.md); form
 * alanları camın kendisi değil, camın ÜZERİNDE duran yüzeyler.
 */

type AuthCardProps = {
  title: string
  lede?: ReactNode
  children: ReactNode
}

export function AuthCard({ title, lede, children }: AuthCardProps) {
  return (
    <GlassSurface tone="thick" className="auth-card">
      <h1 className="auth-title">{title}</h1>
      {lede ? <p className="auth-lede">{lede}</p> : null}
      {children}
    </GlassSurface>
  )
}
