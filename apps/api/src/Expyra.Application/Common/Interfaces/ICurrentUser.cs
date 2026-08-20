namespace Expyra.Application.Common.Interfaces;

/// <summary>
/// Aktif isteğin kullanıcısı. Controller'dan handler'a UserId parametresi TAŞIMA —
/// command'ın içine kullanıcı id'si koymak, istemcinin başkası adına işlem yapmasına kapı açar.
/// </summary>
public interface ICurrentUser
{
    Guid? UserId { get; }

    bool IsAuthenticated { get; }

    /// <summary>
    /// İsteği yapan hesapta Host rolü var mı.
    ///
    /// <para>Kaynak TOKEN'dır, veritabanı değil: rolü her istekte DB'den okumak, 3-16
    /// arası her host ucuna bir sorgu daha ekler. Bedeli, rolün token kadar (15 dk)
    /// gecikmeli olması; "host ol" ucu bu yüzden dönüşünde YENİ access token veriyor
    /// (bkz. ActivateHostCommand) ve kullanıcı beklemek zorunda kalmıyor.</para>
    /// </summary>
    bool IsHost { get; }

    /// <summary>Kimlik yoksa UnauthorizedAccessException fırlatır.</summary>
    Guid RequireUserId();

    /// <summary>
    /// Host kimliği. İki hata durumu AYRI: kimlik yoksa
    /// <see cref="UnauthorizedAccessException"/> (401 — "yeniden giriş yap"), kimlik
    /// var ama rol yoksa <c>ForbiddenException</c> (403 — "önce host ol"). Tek koda
    /// indirilirse istemci hangi düğmeyi göstereceğini bilemez.
    /// </summary>
    Guid RequireHostId();
}
