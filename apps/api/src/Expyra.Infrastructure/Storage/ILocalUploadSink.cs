namespace Expyra.Infrastructure.Storage;

/// <summary>
/// Dev depolama sink'inin yükleme ucu. <b>Yalnız Development'ta kayıtlı</b>;
/// üretimde tarayıcı doğrudan S3/R2'ye PUT edeceği için karşılığı hiç olmayacak.
///
/// <para><b>Neden <c>IObjectStorage</c>'da değil:</b> o arayüz her sağlayıcı için
/// geçerli olmak zorunda ve S3'te "yüklemeyi kabul et" diye bir işlem yok — bulut
/// onu bizim yerimize yapıyor. Buraya konsaydı S3 implementasyonu boş gövdeli bir
/// metot taşırdı, yani arayüz yalan söylerdi.</para>
///
/// <para><b>Neden imza doğrulaması burada, controller'da değil:</b> anahtar
/// malzemesi depolamanın kendi sırrı. Controller'a taşınsaydı WebApi imza biçimini
/// bilmek zorunda kalır ve S3'e geçildiğinde de o kod orada kalırdı.</para>
/// </summary>
public interface ILocalUploadSink
{
    /// <summary>
    /// İmzalı yüklemeyi kabul eder. Gövde AKIŞ olarak geliyor ve diske akış olarak
    /// yazılıyor — belleğe alınsaydı 10 MB'lık her eşzamanlı yükleme sunucudan
    /// 10 MB isterdi.
    /// </summary>
    Task<LocalUploadResult> AcceptAsync(
        string? token,
        string? contentType,
        Stream body,
        CancellationToken cancellationToken);
}

/// <summary>
/// Yükleme sonucu. İstisna DEĞİL: geçersiz imza ve aşılan boyut beklenen
/// durumlar, controller bunları 4xx'e çeviriyor (CLAUDE.md #1 — yutma yok,
/// ama her başarısızlık da istisna değil).
/// </summary>
public enum LocalUploadResult
{
    Accepted = 0,

    /// <summary>İmza yok, bozuk ya da anahtarla eşleşmiyor.</summary>
    InvalidSignature = 1,

    /// <summary>İmza geçerli ama süresi dolmuş.</summary>
    Expired = 2,

    /// <summary>İstemci imzalanandan başka bir içerik tipi gönderdi.</summary>
    ContentTypeMismatch = 3,

    /// <summary>Gövde imzalanan tavanı aştı. Yazılan kısım siliniyor.</summary>
    TooLarge = 4,
}
