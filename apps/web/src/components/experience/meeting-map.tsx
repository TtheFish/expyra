/**
 * Buluşma noktası haritası — OpenStreetMap gömülü harita + dış bağlantı.
 *
 * Google Maps SDK / API anahtarı YOK: üçüncü taraf script ve fatura açmaz.
 * OSM embed anonim iframe; işaretçi URL'deki `marker` parametresiyle geliyor.
 */

export function MeetingMap({
  latitude,
  longitude,
  openLabel,
  embedLabel,
  pinLabel,
}: {
  latitude: number
  longitude: number
  openLabel: string
  embedLabel: string
  pinLabel: string
}) {
  const delta = 0.012
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join('%2C')

  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`
  const openHref = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-[var(--radius-glass-lg)] border border-[var(--line)]">
        <iframe
          title={embedLabel}
          src={embedSrc}
          className="aspect-[16/10] w-full border-0 bg-[var(--surface-sunken)]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <span className="pointer-events-none absolute bottom-3 left-1/2 z-[1] -translate-x-1/2 rounded-full bg-[rgb(16_24_40_/_0.88)] px-3 py-1 text-xs font-semibold text-white shadow-lg">
          {pinLabel}
        </span>
      </div>

      <a
        href={openHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-ink)] underline-offset-4 hover:underline"
      >
        {openLabel}
        <span aria-hidden="true">→</span>
      </a>
    </div>
  )
}
