import Image from 'next/image'
import type { CSSProperties } from 'react'
import {
  countryDisplayName,
  experiencePath,
  type GuestExperienceImage,
  type GuestExperienceSummary,
} from '@/features/experiences/api'
import { categoryMessageKey } from '@/features/host/experiences-api'
import type { Translate } from '@/features/i18n/dictionary'
import { formatMinorMoney } from '@/features/i18n/format'
import { cityDisplayName } from '@/features/places/api'
import { localNameOf } from '@/lib/languages'

/**
 * Deneyim kartı. Ana sayfa vitrini ve `/kesfet` aynı kartı kullanır.
 *
 * `t` ve `lang` PROP: kart bir listede tekrarlanıyor, her kopyanın kendi
 * `getTranslator` çağrısını yapması (React `cache` sayesinde bedelsiz olsa da)
 * bileşeni gereksizce async yapardı. Aynı kalıp `become-a-host` sayfasında.
 *
 * Kart üzerindeki BAŞLIK, ŞEHİR ve ETİKETLER çevrilmiyor — onlar host'un yazdığı
 * içerik, arayüz metni değil (docs/I18N.md §1). Çevrilen şeyler: alan etiketleri,
 * kategori adı (o bizim kapalı listemiz) ve ülke adı (ICU'dan).
 *
 * **Fiyat ve puan YOK.** Prototipte `48 €` ve `★ 4.9` yazıyordu; ikisi de sabitti.
 * Fiyat Blok 7'de, puan Blok 14'te geliyor — o güne kadar uydurulmuş bir sayı
 * göstermek, boş bir alan bırakmaktan daha zararlı (PLAN Blok 14: "`rating: '4.9'`
 * sabit dizesi koddan silinir").
 */
export function ExperienceCard({
  item,
  lang,
  t,
}: {
  item: GuestExperienceSummary
  lang: string
  t: Translate
}) {
  const categoryKey = categoryMessageKey(item.categorySlug)
  const textLanguage = localNameOf(item.text.language, lang) ?? item.text.language

  return (
    /*
      Kart bir YÜZEY DEĞİL: kağıdın üstünde çerçevesiz duruyor, onu ayıran tek
      şey görselin köşe yarıçapı (tasarım). Çerçeve + gölge eklemek ızgarayı
      kutu tarlasına çeviriyordu.

      Kart komple <a> ile SARILMIYOR: ekran okuyucu sarmalayıcı bir linkin tüm
      metnini tek link adı olarak okur ("Prag, Çekya Vltava kıyısında fotoğraf
      turu 2 saat en fazla 6 kişi"). Link BAŞLIKTA, tıklama alanı `after:inset-0`
      ile karta yayılıyor; article'daki `relative` o mutlak konumlandırmanın
      çerçevesi.

      Tasarımdaki KALP DÜĞMESİ bilinçli olarak yok: favori ucu Blok 15'te
      (#23). Çalışmayan bir kalp, host kartının bir gün link olmaması kararıyla
      aynı sebeple yanlış — tıklanabilir görünüp hiçbir şey yapmamak.
    */
    <article className="group relative">
      <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-glass)] bg-[var(--surface-sunken)]">
        <ExperienceCover image={item.cover} slug={item.slug} />

        {categoryKey && (
          /* Fotoğrafın üstünde duruyor: `glass` burada YERİNDE (bkz. globals.css). */
          <span className="glass absolute top-3 left-3 rounded-full px-3 py-1.5 text-xs font-bold">
            {t(categoryKey)}
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="text-base leading-snug font-bold">
          <a
            href={experiencePath(lang, item.slug)}
            /* Odak halkası LİNKTE: kartın kendisi odak almıyor. */
            className="line-clamp-2 rounded-[4px] after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
            /* Başlık host'un dilinde: ekran okuyucu doğru fonetikle okusun (WCAG 3.1.2). */
            lang={item.text.language}
          >
            {item.text.title}
          </a>
        </h3>

        <p className="mt-1 text-sm text-fg-muted">
          {t('experience.place', {
            sehir: cityDisplayName(lang, item.city),
            ulke: countryDisplayName(lang, item.city.countryCode),
          })}
        </p>

        {/*
          Süre önce KENDİ anahtarlarında çekimleniyor, sonra `{sure}` olarak
          satıra yerleşiyor: bir metin tek çoğul sayacı taşıyabiliyor, burada ise
          iki sayım var (süre ve kişi).
        */}
        <p className="mt-0.5 text-sm text-fg-muted">
          {t('experience.meta', {
            sure: formatExperienceDuration(t, item.durationMinutes),
            n: item.capacity,
          })}
        </p>

        {item.pricing && (
          <p className="mt-1.5 text-sm text-fg-muted">
            <span className="font-bold text-fg">
              {formatMinorMoney(
                lang,
                item.pricing.display?.fromAmountMinor ?? item.pricing.fromAmountMinor,
                item.pricing.display?.currency ?? item.pricing.chargeCurrency,
                item.pricing.display?.minorUnits ?? item.pricing.chargeMinorUnits,
              )}
            </span>{' '}
            {t('experience.card.perPerson')}
          </p>
        )}

        {item.text.isFallback && (
          /*
            İstenen dilde çeviri yoktu; metin başka bir dilde geldi ve arayüz
            bunu GİZLEMİYOR (docs/I18N.md §2). Rozetin kendisinde `lang` YOK:
            içinde yazan "Çekçe" kullanıcının dilinde bir sözcük.
          */
          <p className="mt-1.5 text-xs text-fg-muted">
            <span className="sr-only">{t('experience.card.language', { dil: textLanguage })}</span>
            <span aria-hidden="true">{textLanguage}</span>
          </p>
        )}
      </div>
    </article>
  )
}

function ExperienceCover({ image, slug }: { image: GuestExperienceImage | null; slug: string }) {
  if (!image) {
    // Kapak Blok 6'da yayın koşulu oldu; buraya yalnız ondan ÖNCE yayınlanmış
    // ilanlar düşüyor. Boş gri kutu yerine ilana özgü, kararlı bir renk.
    return <div className="h-full w-full" style={experienceCoverStyle(slug)} aria-hidden="true" />
  }

  return (
    <Image
      src={image.url}
      alt=""
      fill
      sizes="(min-width: 1280px) 18vw, (min-width: 768px) 30vw, 50vw"
      className="object-cover"
    />
  )
}

/**
 * Kapak yüzeyi. **Kart ve detay sayfası aynı fonksiyonu çağırıyor** — iki yerde iki
 * gradyan formülü, aynı deneyimin iki farklı renkte görünmesi demekti.
 *
 * Renk slug'dan türüyor: aynı ilan her yüklemede aynı rengi alıyor, sunucu ve
 * istemci aynı sonucu üretiyor.
 */
export function experienceCoverStyle(slug: string): CSSProperties {
  const tone = toneOf(slug)
  return { background: `linear-gradient(145deg, ${tone}, color-mix(in oklch, ${tone} 40%, black))` }
}

/**
 * Dakikayı okunur süreye çevirir: "2 saat 30 dakika", "45 dakika", "3 saat".
 *
 * Parçalar AYRI anahtarlarda ve birleşimi de bir anahtar (`{saat} {dakika}`):
 * saatle dakikanın arasına ne gireceğine (boşluk, virgül, "ve") çevirmen karar
 * verir. `Intl.DurationFormat` kullanılmadı — Node/tarayıcı desteği henüz her
 * yerde yok ve düşüşü sessiz olurdu.
 *
 * **0 dakika ayrı bir cümle:** yayın doğrulaması süreyi şart koşmuyor
 * (`ExperiencePublishRules` dört koşul sayıyor, süre onlardan biri değil), yani
 * süresi girilmemiş bir ilan yayında olabiliyor. "0 saat" yazmak bozuk veriyi
 * doğru gibi göstermek olurdu.
 */
export function formatExperienceDuration(t: Translate, minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return t('experience.duration.unknown')
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours === 0) return t('experience.duration.minutes', { n: rest })
  if (rest === 0) return t('experience.duration.hours', { n: hours })

  return t('experience.duration.full', {
    saat: t('experience.duration.hours', { n: hours }),
    dakika: t('experience.duration.minutes', { n: rest }),
  })
}

/**
 * Slug → sabit bir renk tonu (FNV-1a). Kriptografik değil ve olması gerekmiyor:
 * tek isteneni, aynı girdiye her zaman aynı çıktıyı vermesi ve komşu slug'ların
 * farklı tonlara düşmesi.
 */
function toneOf(slug: string): string {
  let hash = 2166136261

  for (let index = 0; index < slug.length; index += 1) {
    hash ^= slug.charCodeAt(index)
    // `Math.imul` 32 bitlik taşmayı koruyor; düz `*` çift duyarlıklı sayıya
    // taşar ve alt bitler erir.
    hash = Math.imul(hash, 16777619)
  }

  const hue = Math.abs(hash) % 360
  return `oklch(0.58 0.12 ${hue})`
}
