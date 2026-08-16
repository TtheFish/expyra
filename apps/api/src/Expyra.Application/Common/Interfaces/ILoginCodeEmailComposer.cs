namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Kod postasının konusu ve gövdesi, dile göre. Faz 8.1'de sökülecek metin borcunun
/// TEK dosyada kalması için ayrı bir arayüz (docs/I18N.md §5).
/// </summary>
public interface ILoginCodeEmailComposer
{
    /// <param name="language">
    /// <c>login_code.language</c>. null = doğrulanmış dil bulunamadı; implementasyon
    /// kendi son çaresine düşer.
    /// </param>
    /// <param name="lifetime">
    /// "Kod 10 dakika geçerli" cümlesi buradan kurulur. Saat okumak composer'ın işi
    /// değil — süreyi hazır alıyor.
    /// </param>
    EmailMessage Compose(string toEmail, string code, string? language, TimeSpan lifetime);
}
