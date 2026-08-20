using MediatR;
using Expyra.Application.Common.Interfaces;

namespace Expyra.Application.Features.Host.Queries.GetHostIdentity;

/// <summary>
/// Kapının ARKASINDAKİ asgari uç.
///
/// <para>Blok 2 bir ürün özelliği teslim etmiyor; 3-16 arası her host ucunun önündeki
/// kapıyı teslim ediyor. Kapının gerçekten kapı olduğunu kanıtlayacak tek bir uç
/// olmasaydı bunu ancak Blok 5'te — ya da üretimde — öğrenirdik. Bu yüzden burada
/// bilerek en küçük uç var: iş kuralı yok, veritabanı yok, yalnız "rol claim'i
/// olmayan istek buraya giremiyor" iddiası.</para>
///
/// <para>Blok 5 gerçek host uçlarını (deneyim taslağı, yayınlama) eklediğinde bu ucun
/// yerini onlar alır ve dosya SİLİNİR — kalıcı bir yüzey değil.</para>
/// </summary>
public sealed record GetHostIdentityQuery : IRequest<HostIdentityResponse>;

/// <param name="HostId">
/// Host'un kullanıcı kimliği. Ayrı bir "host id" YOK ve olmayacak: host, ayrı bir varlık
/// değil rol kazanmış bir hesap. İkinci bir kimlik üretmek her deneyimi iki tabloya
/// bağlardı.
/// </param>
public sealed record HostIdentityResponse(Guid HostId);

internal sealed class GetHostIdentityQueryHandler(ICurrentUser currentUser)
    : IRequestHandler<GetHostIdentityQuery, HostIdentityResponse>
{
    /// <summary>
    /// Veritabanına GİTMİYOR: hem kimlik hem rol token'da. Controller'daki policy zaten
    /// kapıyı tutuyor; buradaki <see cref="ICurrentUser.RequireHostId"/> ikinci kapı —
    /// bir gün <c>[Authorize(Policy = ...)]</c> attribute'u unutulursa handler yine 403
    /// veriyor, sessizce açılmıyor.
    /// </summary>
    public Task<HostIdentityResponse> Handle(
        GetHostIdentityQuery request,
        CancellationToken cancellationToken)
        => Task.FromResult(new HostIdentityResponse(currentUser.RequireHostId()));
}
