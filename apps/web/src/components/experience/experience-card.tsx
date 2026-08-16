import { formatPrice, type Experience } from '@/lib/experiences'

/** Deneyim kartı. Ana sayfa ve arama sonuçları aynı kartı kullanır. */
export function ExperienceCard({ item }: { item: Experience }) {
  return (
    /*
      `glass-interactive` YOK — hover'da yükselip basılınca çöken bir yüzey
      "tıklayınca bir yere gider" diyor, kart ise tıklanamıyor (detay sayfası
      Faz 4.5). Yanlış afordans; taklidi kaldırmak dürüst olan.
      Detay sayfası gelince: başlığı <a> yap + after:absolute after:inset-0,
      article'a relative. Kartı komple <a> ile sarmak ekran okuyucuda tüm metni
      tek link adı olarak okutur.
    */
    <article className="glass glass-edge overflow-hidden rounded-[var(--radius-glass-lg)]">
      <div
        className="h-40 w-full"
        style={{
          background: `linear-gradient(145deg, ${item.tone}, color-mix(in oklch, ${item.tone} 40%, black))`,
        }}
        aria-hidden="true"
      />

      <div className="p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-fg-muted">
            {item.city}, {item.country}
          </span>
          <span className="text-xs font-medium text-fg-muted">★ {item.rating}</span>
        </div>

        <h3 className="text-base font-semibold leading-snug">{item.title}</h3>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-lg font-semibold">
            {formatPrice(item.price, item.currency)}
            <span className="ml-1 text-xs font-normal text-fg-muted">/ kişi</span>
          </span>
          <span className="text-xs text-fg-muted">
            {item.durationHours} saat · en fazla {item.maxGuests} kişi
          </span>
        </div>
      </div>
    </article>
  )
}
