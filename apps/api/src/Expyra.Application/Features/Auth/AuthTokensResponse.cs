namespace Expyra.Application.Features.Auth;

/// <summary>
/// "Request + response + handler aynı dosyada" kalıbının TEK bilinçli istisnası:
/// bu record iki komuttan (verify-code, refresh) dönüyor. İki yerde ayrı ayrı
/// tanımlanırsa OpenAPI iki şema üretir ve <c>api.generated.ts</c>'e iki ayrı tip
/// gibi düşer — web tarafı aynı şeyi iki isimle görmeye başlar.
///
/// <para>API cookie bilmez: token'lar JSON gövdede döner, httpOnly çerezleri Next
/// sunucusu yazar (BFF). Tarayıcı JS'i token görmediği için yapısal olarak CSRF'e
/// kapalıyız ve Faz 9'daki Expo aynı sözleşmeyi kullanır.</para>
/// </summary>
/// <param name="IsNewAccount">
/// Yalnız kod doğrulamasında true olabilir. Yenilemede daima false — yeni hesap
/// doğmadı, oturum tazelendi.
/// </param>
public sealed record AuthTokensResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAtUtc,
    bool IsNewAccount);
