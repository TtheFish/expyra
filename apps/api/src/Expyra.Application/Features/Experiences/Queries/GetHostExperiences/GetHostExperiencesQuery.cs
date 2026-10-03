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
/// <para><b>Keyset sayfalı</b> (issue #54), misafir listesiyle aynı desen
/// (<see cref="ExperienceCursor"/>): sınırsız bir liste, ilan sayısı büyüyen tek bir
/// host'un her panel açılışında tüm satırları — çevirileri, galerisi, programıyla —
/// çektirirdi. Sıralama <c>(created_at_utc, id)</c> azalan; taslağın yayın damgası
/// olmadığı için misafir listesindeki <c>published_at_utc</c> burada kullanılamıyor.</para>
///
/// <para>Host kimliği parametre DEĞİL (CLAUDE.md #3): sorguya bir <c>HostId</c> alanı
/// konsaydı bu uç "başkasının taslaklarını listele" ucuna dönerdi.</para>
/// </summary>
/// <param name="Status">
/// <c>"Draft" | "Published" | "Archived"</c>, büyük/küçük harf duyarsız. Boşsa hepsi.
/// Tanınmayan değer <b>400</b> — sessizce yok sayılsaydı istemci "taslaklarım" sanırken
/// yayındakileri de görürdü (Blok 4 kabul kriteri 3'ün aynı ilkesi).
/// </param>
/// <param name="Cursor">
/// Önceki sayfanın <c>nextCursor</c> değeri. Opak; çözülemeyen değer <b>400</b> —
/// sessizce ilk sayfaya sarmak sayfalayan istemciyi sonsuz döngüye sokardı.
/// </param>
/// <param name="Limit">
/// Sayfa boyutu; boşsa <see cref="DefaultPageSize"/>. Misafir listesinin aksine
/// ayarlanabilir: web'deki tekil ilan araması (API'de <c>GET /{id}</c> yok) sayfaları
/// geniş adımlarla geziyor. Tavan <see cref="MaxPageSize"/>, aşan değer 400.
/// </param>
public sealed record GetHostExperiencesQuery(
    string? Status,
    string? Cursor = null,
    int? Limit = null)
    : IRequest<HostExperiencePageResponse>
{
    /// <summary>Misafir listesiyle aynı: 2/3/4 sütunlu ızgaraların hepsinde tam sıra.</summary>
    public const int DefaultPageSize = 24;

    /// <summary>Tek istekte taşınabilecek en fazla ilan — her biri tüm çevirileri ve
    /// galerisiyle geliyor, bu yüzden misafir kartından çok daha ağır.</summary>
    public const int MaxPageSize = 100;

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
    IObjectStorage storage,
    ICurrentUser currentUser)
    : IRequestHandler<GetHostExperiencesQuery, HostExperiencePageResponse>
{
    public async Task<HostExperiencePageResponse> Handle(
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

        if (ExperienceCursor.TryDecode(request.Cursor, out var cursor))
        {
            var cursorCreatedAt = cursor.SortedAtUtc;
            var cursorId = cursor.Id;

            // Keyset: "bu satırdan kesin olarak sonra gelenler". Eşit zaman damgasında
            // ikincil anahtar (id) devreye giriyor — onsuz aynı anda açılan iki taslak
            // iki sayfada birden ya da hiçbirinde görünürdü.
            source = source.Where(x =>
                x.CreatedAtUtc < cursorCreatedAt
                || (x.CreatedAtUtc == cursorCreatedAt && x.Id < cursorId));
        }

        var pageSize = request.Limit ?? GetHostExperiencesQuery.DefaultPageSize;

        // ix_experience_host_status satırları getiriyor. Sıralama en yeni ilan üstte;
        // Id ikincil anahtar olarak deterministiklik için (Guid v7 zaten zamana göre
        // sıralı, yani eşit zaman damgalarında da doğru yönde kırıyor). Sayfa
        // boyutundan BİR FAZLA: "daha var mı" ikinci bir COUNT olmadan cevaplanıyor.
        var experiences = await source
            .OrderByDescending(x => x.CreatedAtUtc)
            .ThenByDescending(x => x.Id)
            .Take(pageSize + 1)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var hasMore = experiences.Count > pageSize;
        if (hasMore)
        {
            experiences.RemoveAt(experiences.Count - 1);
        }

        // Çeviri/dil/etiket satırları TEK seferde çekiliyor: sayfa ne kadar uzun olursa
        // olsun sorgu sayısı sabit (HostExperienceProjection sınıf notu).
        var items = await HostExperienceProjection
            .ToResponsesAsync(dbContext, storage, experiences, cancellationToken)
            .ConfigureAwait(false);

        var nextCursor = hasMore
            ? new ExperienceCursor(experiences[^1].CreatedAtUtc, experiences[^1].Id).Encode()
            : null;

        return new HostExperiencePageResponse(items, nextCursor);
    }
}
