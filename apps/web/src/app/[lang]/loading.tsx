/**
 * Yükleniyor iskeleti — bu dil segmentinin altındaki tüm sayfaları saran
 * Suspense sınırı.
 *
 * İskelet, spinner'a tercih ediliyor: gelecek sayfanın kabaca şeklini gösterdiği
 * için içerik yerleştiğinde göz aynı yerde kalıyor. Kutular gerçek düzenle aynı
 * genişlikte (`max-w-5xl`) — dar bir iskeletten geniş içeriğe atlamak, boş ekran
 * kadar rahatsız edici.
 *
 * **Dikkat (Next 16 davranışı):** Suspense fallback'i basıldığı anda yanıt
 * akmaya başlar ve HTTP durumu 200'e sabitlenir. Yani bir sayfa `notFound()`'u
 * bir `await`'ten SONRA çağırırsa kullanıcı 404 ekranını görür ama durum kodu 200
 * olur (Next bu duruma `noindex` meta'sı ekliyor, indekslenme sorunu doğmuyor).
 * PLAN Blok 1 kabul kriteri #4 gerçek 404 kodu istiyor: eşleşmeyen yol zaten
 * render'dan önce elenir, ama ileride veri çekip `notFound()` çağıran sayfalar
 * yazılırsa o çağrı ilk `await`'ten önce yapılmalı.
 */
export default function Loading() {
  return (
    <div
      className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-10"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Sayfa yükleniyor</span>

      {/*
        `animate-pulse` yalnız hareketi kabul eden kullanıcıda çalışıyor:
        sürekli yanıp sönen büyük yüzeyler vestibüler rahatsızlık kaynağı
        (WCAG 2.3.3). Hareket kapalıyken kutular sabit duruyor — bilgi kaybı yok.
      */}
      <div className="motion-reduce:animate-none animate-pulse" aria-hidden="true">
        <div className="glass glass-edge h-16 w-full rounded-[var(--radius-glass-lg)]" />

        <div className="mt-10 h-7 w-56 rounded-[var(--radius-glass-sm)] bg-[var(--glass-border)]" />
        <div className="mt-3 h-4 w-40 rounded-[var(--radius-glass-sm)] bg-[var(--glass-border)]" />

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="glass glass-edge h-64 rounded-[var(--radius-glass-lg)]"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
