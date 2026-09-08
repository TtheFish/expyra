import { UI_LANGUAGE_FIELD } from '@/features/i18n/locale'
import { path } from '@/lib/routes'

/** Lokalize bilet görüntüleme yolu (`/tr/bilet/EXP-…`). */
export function ticketPath(lang: string, code: string): string {
  return path(lang, 'ticketDetail', [code])
}

export function applePassHref(lang: string, code: string): string {
  return `/api/bilet/${encodeURIComponent(code)}/apple?${UI_LANGUAGE_FIELD}=${encodeURIComponent(lang)}`
}

export function googlePassHref(lang: string, code: string): string {
  return `/api/bilet/${encodeURIComponent(code)}/google?${UI_LANGUAGE_FIELD}=${encodeURIComponent(lang)}`
}

export function ticketPdfHref(lang: string, code: string): string {
  return `/api/bilet/${encodeURIComponent(code)}/pdf?${UI_LANGUAGE_FIELD}=${encodeURIComponent(lang)}`
}
