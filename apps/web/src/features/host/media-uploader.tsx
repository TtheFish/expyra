'use client'

import Image from 'next/image'
import { useId, useRef, useState, useTransition } from 'react'
import { GlassButton } from '@/components/ui/glass-button'
import {
  confirmMediaAction,
  deleteMediaAction,
  refreshMediaAction,
  reorderMediaAction,
  requestMediaUploadAction,
  setMediaCoverAction,
} from './experience-actions'
import type { HostExperienceMedia } from './experiences-api'

/**
 * İlan görselleri: yükleme, sıralama, kapak seçimi, silme.
 *
 * ## Bayt bu bileşenden Next sunucusuna GİTMİYOR
 *
 * Akış üç adımlı: (1) sunucu eylemi imzalı bir adres üretiyor, (2) **tarayıcı**
 * dosyayı doğrudan depoya PUT ediyor, (3) sunucu eylemi onaylıyor ve doğrulamayı
 * o yapıyor. İkinci adım hiçbir sunucudan geçmiyor — dosya bir `FormData` ile
 * sunucu eylemine verilseydi PLAN Blok 6 kabul kriteri 1 ("API bayt taşımaz")
 * BFF katmanında delinirdi: dosya yine bir sunucudan geçmiş olurdu.
 *
 * ## Yerel galeri
 *
 * Çoklu seçimde her onaydan sonra sayfayı tazelemek bileşeni ortada yeniden
 * kuruyor ve sıradaki PUT'lar yarım kalıyordu. Onay yanıtındaki galeri burada
 * tutuluyor; tur bitince tek `refreshMediaAction` yayın rozetini de güncelliyor.
 */
export function MediaUploader({
  experienceId,
  language,
  media,
  labels,
}: {
  experienceId: string
  language: string
  media: HostExperienceMedia[]
  labels: MediaUploaderLabels
}) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, startTransition] = useTransition()
  const [gallery, setGallery] = useState(media)
  const [mediaSig, setMediaSig] = useState(() => gallerySignature(media))
  const [uploading, setUploading] = useState(0)

  // Props yenilenince (refresh) galeriyi senkronla — effect içinde setState
  // lint'i kırıyor; render sırasında prop değişimine göre ayarlama (React docs).
  const nextSig = gallerySignature(media)
  if (nextSig !== mediaSig) {
    setMediaSig(nextSig)
    setGallery(media)
  }

  const atLimit = gallery.length >= MAX_MEDIA
  const disabled = busy || uploading > 0 || atLimit

  async function upload(files: FileList | File[]) {
    setError(null)

    const remaining = MAX_MEDIA - gallery.length
    if (remaining <= 0) {
      setError(labels.errorLimit)
      return
    }

    const selected = Array.from(files).slice(0, remaining)
    let confirmedAny = false

    // Sıralı yükleme: paralel PUT yavaş bağlantıda tıkanır; kota sayacı da
    // sıralı akışta doğru davranır.
    for (const file of selected) {
      setUploading((count) => count + 1)

      // İzin ALINDIKTAN sonra her başarısızlıkta satır geri veriliyor: sunucu
      // taze Pending satırları kotaya sayıyor. Silmek onu anında iade ediyor.
      let mediaId: string | null = null

      try {
        const contentType = resolveContentType(file)
        if (contentType === null) {
          setError(labels.errorUnsupported)
          continue
        }

        const permit = await requestMediaUploadAction(
          language,
          experienceId,
          contentType,
          file.size,
        )

        if (permit.error !== null) {
          setError(permit.error)
          continue
        }

        mediaId = permit.upload.mediaId

        const headers = uploadHeaders(permit.upload.headers, contentType)

        const response = await fetch(permit.upload.uploadUrl, {
          method: permit.upload.method,
          headers,
          body: file,
          // Kimlik doğrulaması YOK: yetki imzada. Çerez gönderilseydi depo
          // başka alana taşındığında oturum çerezi de oraya sızardı.
          credentials: 'omit',
        })

        if (!response.ok) {
          setError(response.status === 413 ? labels.errorTooLarge : labels.errorRejected)
          continue
        }

        const confirmed = await confirmMediaAction(language, experienceId, permit.upload.mediaId, {
          refresh: false,
        })

        if (confirmed.error !== null) {
          setError(confirmed.error)
          continue
        }

        mediaId = null
        confirmedAny = true

        if (confirmed.media) {
          setGallery(confirmed.media)
        }
      } catch {
        setError(labels.errorRejected)
      } finally {
        setUploading((count) => count - 1)

        if (mediaId !== null) {
          // Temizlik — sayfayı yenileme: tur ortasında remount sıradaki
          // dosyaları kesiyordu.
          void deleteMediaAction(language, experienceId, mediaId, { refresh: false })
        }
      }
    }

    if (confirmedAny) {
      await refreshMediaAction(language, experienceId)
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  function run(action: () => Promise<{ error: string | null; media?: HostExperienceMedia[] }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error !== null) {
        setError(result.error)
        return
      }
      if (result.media) setGallery(result.media)
    })
  }

  function move(index: number, delta: number) {
    const next = [...gallery]
    const target = index + delta

    if (target < 0 || target >= next.length) return

    ;[next[index], next[target]] = [next[target], next[index]]

    run(() => reorderMediaAction(language, experienceId, next.map((item) => item.id)))
  }

  return (
    <div aria-busy={busy || uploading > 0}>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (!disabled && event.dataTransfer.files.length > 0) void upload(event.dataTransfer.files)
        }}
        className={[
          'mt-3 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-glass)]',
          'border border-dashed p-6 text-center text-sm transition-colors',
          dragging
            ? 'border-brand-400 bg-[rgb(var(--glass-tint)_/_0.12)]'
            : 'border-[rgb(var(--glass-tint)_/_0.35)]',
          disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-brand-400',
        ].join(' ')}
      >
        <span className="font-medium">{uploading > 0 ? labels.uploading : labels.add}</span>
        <span className="text-xs text-fg-muted">{labels.drop}</span>
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) void upload(event.target.files)
        }}
      />

      {error !== null && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {gallery.length === 0 ? (
        <p className="mt-4 text-sm text-fg-muted">{labels.empty}</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {gallery.map((item, index) => (
            <li
              key={item.id}
              className="glass glass-edge overflow-hidden rounded-[var(--radius-glass-sm)]"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.url}
                  alt={labels.positions[index] ?? ''}
                  fill
                  sizes="(min-width: 640px) 200px, 45vw"
                  className="object-cover"
                />

                {item.isCover && (
                  <span className="glass glass-edge absolute left-2 top-2 rounded-[var(--radius-glass-sm)] px-2 py-0.5 text-[0.6875rem] font-medium">
                    {labels.cover}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1 p-2">
                <IconButton
                  label={labels.moveEarlier}
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ←
                </IconButton>

                <IconButton
                  label={labels.moveLater}
                  disabled={busy || index === gallery.length - 1}
                  onClick={() => move(index, 1)}
                >
                  →
                </IconButton>

                {!item.isCover && (
                  <GlassButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => setMediaCoverAction(language, experienceId, item.id))}
                  >
                    {labels.makeCover}
                  </GlassButton>
                )}

                <GlassButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => run(() => deleteMediaAction(language, experienceId, item.id))}
                  className="ml-auto"
                >
                  {labels.delete}
                </GlassButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: string
}) {
  return (
    <GlassButton
      type="button"
      size="sm"
      variant="ghost"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true">{children}</span>
    </GlassButton>
  )
}

/**
 * Tarayıcının boş / `image/jpg` beyanını kanonik MIME'a çevirir. Uzantı yedek:
 * Windows'ta bazı dosyaların `type`'ı boş geliyor ve sunucu 400 dönüyordu.
 */
function resolveContentType(file: File): string | null {
  const raw = file.type.trim().toLowerCase()
  if (raw === 'image/jpg' || raw === 'image/jpeg') return 'image/jpeg'
  if (raw === 'image/png' || raw === 'image/webp') return raw

  const name = file.name.toLowerCase()
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'

  return null
}

/** İmza bu başlıkların üzerine kurulu; Content-Type anahtarı büyük/küçük harf kaybederse tamamla. */
function uploadHeaders(
  required: Record<string, string>,
  contentType: string,
): Record<string, string> {
  const headers = { ...required }
  const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')
  if (!hasContentType) headers['Content-Type'] = contentType
  return headers
}

export type MediaUploaderLabels = {
  add: string
  drop: string
  uploading: string
  empty: string
  cover: string
  makeCover: string
  delete: string
  moveEarlier: string
  moveLater: string
  /** Sunucuda çözülmüş sıra etiketleri (en fazla 12 — yeni yüklenenler için yer). */
  positions: string[]
  errorRejected: string
  errorTooLarge: string
  errorUnsupported: string
  errorLimit: string
}

const MAX_MEDIA = 12

function gallerySignature(items: HostExperienceMedia[]): string {
  return items.map((item) => `${item.id}:${item.isCover ? 1 : 0}:${item.url}`).join('|')
}
