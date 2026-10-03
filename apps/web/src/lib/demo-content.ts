/**
 * Demo içerik kapısı — TEK bayrak.
 *
 * Arkasında duranlar: demo biletler (`/bilet/[code]`, `/api/bilet/[code]/*`,
 * "Deneyimlerim" listesi), sahte ödeme onayı (checkout'taki "Onayla ve öde"),
 * detay sayfasındaki örnek yorumlar ve puan. Hiçbiri gerçek veri değil; uydurma
 * yorum ve puan "örnek" etiketiyle bile tüketiciyi yanıltır (AB tüketici hukuku).
 *
 * **Varsayılan KAPALI.** Yalnız `EXPYRA_DEMO_CONTENT=1` açar — `true`, `yes`
 * gibi değerler bilerek kabul edilmiyor: prod'da yanlışlıkla açılmasın diye tek
 * bir yazım var. Yerel geliştirme: `apps/web/.env.local` (docs/DEMO.md).
 *
 * `NEXT_PUBLIC_` öneki YOK: bayrak sunucuda okunur, istemciye prop olarak iner.
 * Değer FONKSİYON İÇİNDE okunuyor — modül seviyesinde okunsaydı `next build`
 * anında donardı ve ortamdan açıp kapatmak yeniden derleme isterdi.
 */
export function isDemoContentEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.EXPYRA_DEMO_CONTENT?.trim() === '1'
}
