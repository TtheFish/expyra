using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences.Queries.GetHostExperiences;

/// <summary>
/// Host'un kendi ilanları. Yanıt misafir listesiyle AYNI ŞEY DEĞİL: burada taslaklar,
/// arşivler ve tüm çeviriler var.
///
/// <para><b>Sayfalama YOK</b> ve bu bilinçli: bir host'un ilan sayısı onlarla ölçülür,
/// misafir listesinin aksine (o cursor'lı — Blok 5b). Sayfalanmamış bir uç yazmak,
/// gerçekten gerektiğinde eklemekten ucuz; şimdi eklenen bir cursor sözleşmeyi
/// kullanılmayan bir alanla kilitlerdi.</para>
///
/// <para>Host kimliği parametre DEĞİL (CLAUDE.md #3): sorguya bir <c>HostId</c> alanı
/// konsaydı bu uç "başkasının taslaklarını listele" ucuna dönerdi.</para>
/// </summary>
/// <param name="Status">
/// <c>"Draft" | "Published" | "Archived"</c>, büyük/küçük harf duyarsız. Boşsa hepsi.
/// Tanınmayan değer <b>400</b> — sessizce yok sayılsaydı istemci "taslaklarım" sanırken
/// yayındakileri de görürdü (Blok 4 kabul kriteri 3'ün aynı ilkesi).
/// </param>
public sealed record GetHostExperiencesQuery(string? Status)
    : IRequest<IReadOnlyList<HostExperienceResponse>>
{
    /// <summary>
    /// Durum filtresini çözer. <c>Enum.TryParse</c> TEK BAŞINA kullanılmıyor: o, "1"
    /// girdisini de kabul eder ve sözleşmeyi sessizce enum SIRASINA bağlar — enum
    /// yeniden sıralandığı gün eski bir istemci başka bir durumu sorar. Yalnız harf
    /// içeren girdiler geçiyor.
    ///
    /// <para>Karşılaştırma ordinal: Türkçe kültürde büyük/küçük harf dönüşümü 'i' harfini
    /// bozar ve "published" filtresi sunucunun kültür ayarına göre çalışır/çalışmaz olurdu
    /// (<c>LanguageCode</c> ile aynı tuzak).</para>
    /// </summary>
    public static bool TryParseStatus(string? raw, out ExperienceStatus status)
    {
        status = default;

        if (string.IsNullOrWhiteSpace(raw))
        {
            return false;
        }

        foreach (var character in raw)
        {
            if (!char.IsAsciiLetter(character))
            {
                return false;
            }
        }

        return Enum.TryParse(raw, ignoreCase: true, out status) && Enum.IsDefined(status);
    }
}

internal sealed class GetHostExperiencesQueryHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser)
    : IRequestHandler<GetHostExperiencesQuery, IReadOnlyList<HostExperienceResponse>>
{
    public async Task<IReadOnlyList<HostExperienceResponse>> Handle(
        GetHostExperiencesQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        var source = dbContext.Experiences
            .AsNoTracking()
            .Where(x => x.HostId == hostId);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            // Validator zaten reddediyor; buradaki ikinci geçiş parse edilmiş DEĞERİ
            // üretmek için. İkisi ayrışırsa filtre sessizce boş liste döndürürdü.
            if (!GetHostExperiencesQuery.TryParseStatus(request.Status, out var status))
            {
                throw new BadRequestException($"'{request.Status}' geçerli bir durum değil.");
            }

            source = source.Where(x => x.Status == status);
        }

        // ix_experience_host_status satırları getiriyor. Sıralama en yeni ilan üstte;
        // Id ikincil anahtar olarak deterministiklik için (Guid v7 zaten zamana göre
        // sıralı, yani eşit zaman damgalarında da doğru yönde kırıyor).
        var experiences = await source
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        // Çeviri/dil/etiket satırları TEK seferde çekiliyor: liste ne kadar uzun olursa
        // olsun sorgu sayısı sabit (HostExperienceProjection sınıf notu).
        return await HostExperienceProjection
            .ToResponsesAsync(dbContext, experiences, cancellationToken)
            .ConfigureAwait(false);
    }
}
