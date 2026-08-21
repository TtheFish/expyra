import type { Translate } from '@/features/i18n/dictionary'
import { formatMoney, formatNumber } from '@/features/i18n/format'
import type { Experience } from '@/lib/experiences'

/**
 * Deneyim kartı. Ana sayfa ve arama sonuçları aynı kartı kullanır.
 *
 * `t` ve `lang` PROP: kart bir listede tekrarlanıyor, her kopyanın kendi
 * `getTranslator` çağrısını yapması (React `cache` sayesinde bedelsiz olsa da)
 * bileşeni gereksizce async yapardı. Aynı kalıp `become-a-host` sayfasında.
 *
 * Kart üzerindeki BAŞLIK, ŞEHİR ve ÜLKE çevrilmiyor — onlar host'un yazdığı
 * içerik, arayüz metni değil (docs/I18N.md §1). Çevrilen tek şey etiketler.
 */
export function ExperienceCard({
  item,
  lang,
  t,
}: {
  item: Experience
  lang: string
  t: Translate
}) {
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
          {/* Şehir/ülke sırası da anahtarın içinde: her dilde aynı değil. */}
          <span className="text-xs font-medium text-fg-muted">
            {t('experience.place', { sehir: item.city, ulke: item.country })}
          </span>
          {/* Puan metin olarak tutuluyor; sayı biçimi dile bağlı ("4,9" / "4.9"). */}
          <span className="text-xs font-medium text-fg-muted">
            {t('experience.rating', { puan: formatNumber(lang, Number(item.rating)) })}
          </span>
        </div>

        <h3 className="text-base font-semibold leading-snug">{item.title}</h3>

        <div className="mt-4 flex items-baseline justify-between">
          <span className="text-lg font-semibold">
            {formatMoney(lang, item.price, item.currency)}
            <span className="ml-1 text-xs font-normal text-fg-muted">
              {t('experience.perPerson')}
            </span>
          </span>
          {/*
            Süre önce KENDİ anahtarında çekimleniyor, sonra `{sure}` olarak
            satıra yerleşiyor: bir metin tek çoğul sayacı taşıyabiliyor, burada
            ise iki sayım var (saat ve kişi). İngilizce'de "1 hour"/"2 hours" ve
            "1 person"/"8 people" ayrımı ancak böyle korunuyor.
          */}
          <span className="text-xs text-fg-muted">
            {t('experience.meta', {
              sure: t('experience.duration', { n: item.durationHours }),
              n: item.maxGuests,
            })}
          </span>
        </div>
      </div>
    </article>
  )
}
