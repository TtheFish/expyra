namespace Expyra.Infrastructure.Email;

/// <summary>
/// Dev e-posta sink'inin BELLEKTEKİ son mesajları. <b>Yalnız Development'ta kayıtlı</b>
/// (<c>ILocalUploadSink</c> ile birebir aynı kalıp ve aynı gerekçe).
///
/// <para><b>Neden var:</b> şifresiz sistemde her giriş bir OTP istiyor ve geliştirme
/// sırasında o kodu okumanın tek yolu <c>.mail-drop</c> klasöründeki en yeni
/// <c>.eml</c> dosyasını elle açmaktı. Günde onlarca kez yapılan bir iş.</para>
///
/// <para><b>Neden <c>IEmailSender</c>'a eklenmedi:</b> o arayüz her sağlayıcı için
/// geçerli olmak zorunda ve gerçek bir SMTP göndericisinde "az önce ne gönderdim"
/// diye bir işlem yok. Buraya konsaydı üretim implementasyonu boş liste döndüren bir
/// metot taşırdı — yani arayüz yalan söylerdi.</para>
///
/// <para><b>Neden diskteki dosyalar okunmuyor da bellek tutuluyor:</b> klasör yolu
/// yapılandırmaya bağlı ve dosya adı alıcıyı taşımıyor (bilinçli — klasör listesi
/// "kim giriş denedi" dökümüne dönmesin diye). Alıcıya göre filtrelemek için mesajı
/// gönderildiği anda yakalamak gerekiyor.</para>
/// </summary>
public interface ILocalMailbox
{
    /// <summary>
    /// Son gönderilen mesajlar, YENİDEN ESKİYE. <paramref name="to"/> verilirse yalnız
    /// o adrese gidenler — adres karşılaştırması büyük/küçük harf duyarsız.
    /// </summary>
    IReadOnlyList<LocalMailMessage> Recent(string? to, int count);
}

/// <param name="Body">
/// Düz metin gövde. Kodun kendisi burada ve konu satırında; ayrıştırma çağıranın işi.
/// Sunucu kodu ayıklamıyor: bu bir dev aracı ve şablon değiştiğinde sessizce yanlış
/// bir sayı döndürmektense ham metni vermek dürüst olan.
/// </param>
public sealed record LocalMailMessage(
    string To,
    string Subject,
    string Body,
    DateTimeOffset SentAtUtc);
