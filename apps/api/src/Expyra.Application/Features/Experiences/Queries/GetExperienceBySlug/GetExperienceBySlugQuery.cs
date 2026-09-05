using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Pricing;

namespace Expyra.Application.Features.Experiences.Queries.GetExperienceBySlug;

/// <summary>
/// Misafirin detay sayfası. Anonim.
///
/// <para><b>Yayınlanmamış her şey 404</b> (PLAN kabul kriteri 3): taslak da, arşiv de,
/// banlı host'un yayını da, hiç var olmayan slug da AYNI yanıtı alıyor — gövdesi ve
/// mesajı dahil. Farklı bir metin bile bir oracle olurdu: "bu slug var ama yayında
/// değil" bilgisi, yayınlanmamış ilanların varlığını haritalamaya yarardı.</para>
///
/// <para>Host'un kendi taslağını burada önizlemesi de YOK — o, host panelinin işi
/// (<c>GET /api/host/experiences</c>). Bu ucun kimliğe hiç bakmaması, "bazen kimliğe
/// bakan" bir uçtan daha güvenli: gözden kaçan bir dal, taslakları dışarı açamaz.</para>
/// </summary>
/// <param name="Slug">
/// URL'deki kalıcı kimlik. Dile göre değişmiyor: tek slug tüm dillerde geçerli, bu yüzden
/// <c>/tr/deneyim/...</c> ile <c>/en/experience/...</c> aynı kaynağa işaret ediyor ve
/// hreflang halkası kurulabiliyor.
/// </param>
/// <param name="Language">Metnin istendiği dil — bkz. <c>GetExperiencesQuery.Language</c>.</param>
public sealed record GetExperienceBySlugQuery(
    string Slug,
    string? Language = null,
    string? Currency = null) : IRequest<GuestExperienceDetailResponse>;

internal sealed class GetExperienceBySlugQueryHandler(IAppDbContext dbContext, IObjectStorage storage)
    : IRequestHandler<GetExperienceBySlugQuery, GuestExperienceDetailResponse>
{
    public async Task<GuestExperienceDetailResponse> Handle(
        GetExperienceBySlugQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Slug üretimi küçük harfli ASCII ve sütun "C" collation, yani karşılaştırma
        // bayt bayt. Adres çubuğunda büyük harfe dönmüş bir bağlantı (postadan, PDF'ten
        // gelen) aksi halde var olan bir ilan için 404 alırdı.
        //
        // ToLowerInvariant ZORUNLU: Türkçe kültürde "IZMIR".ToLower() → "ızmır" olur ve
        // slug hiçbir satırla eşleşmez (ExperienceSlug'ın kendi notundaki tuzağın aynısı).
        var slug = request.Slug.Trim().ToLowerInvariant();

        var language = GuestExperienceQuery.NormalizeLanguage(request.Language);

        // Slug süzmesi ENTITY üzerinde, projeksiyonun üzerinde değil: yapıcı tabanlı bir
        // projeksiyona zincirlenen Where'i EF geri bağlayamıyor (GuestExperienceQuery notu).
        var row = await GuestExperienceQuery
            .NewestFirst(
                GuestExperienceQuery.Visible(dbContext).Where(x => x.Slug == slug),
                dbContext.Cities)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false)
            ?? throw new NotFoundException("Deneyim bulunamadı.");

        // Konuşulan dil ve etiketler AYRI sorgular — ikisini de aynı SELECT'e koymak,
        // iki koleksiyonun kartezyen çarpımı demek: 15 dil × 20 etiket = 300 satır ve
        // her satırda deneyimin tüm sütunları tekrar. Blok 10 makine çevirisini açtığında
        // çeviri de eklenirse çarpan üçe çıkardı. Sabit üç sorgu, şişen tek sorgudan iyi.
        //
        // Sorgu sayısı satır sayısına BAĞLI DEĞİL — "N+1 yok" kuralının anlamı bu
        // (HostExperienceProjection ile aynı kalıp).
        var spokenLanguages = await dbContext.ExperienceSpokenLanguages
            .AsNoTracking()
            .Where(x => x.ExperienceId == row.Id)
            .OrderBy(x => x.Language)
            .Select(x => x.Language)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var tags = await dbContext.ExperienceTags
            .AsNoTracking()
            .Where(x => x.ExperienceId == row.Id)
            // Sıra katlanmış hâle göre: gösterimdeki yazıma göre sıralamak, aynı listeyi
            // sunucunun kültür ayarına bağlı hâle getirirdi.
            .OrderBy(x => x.NormalizedTag)
            .Select(x => x.DisplayTag)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var texts = await GuestExperienceQuery
            .LoadTextsAsync(dbContext, [row], language, withDescription: true, cancellationToken)
            .ConfigureAwait(false);

        var images = await GuestExperienceQuery
            .LoadImagesAsync(dbContext, storage, row.Id, cancellationToken)
            .ConfigureAwait(false);

        var host = await GuestExperienceQuery
            .LoadHostAsync(dbContext, storage, row.HostId, cancellationToken)
            .ConfigureAwait(false);

        var itinerary = await GuestExperienceQuery
            .LoadItineraryAsync(dbContext, row, language, cancellationToken)
            .ConfigureAwait(false);

        var pricing = await GuestPricingStore
            .LoadAsync(dbContext, row.Id, cancellationToken)
            .ConfigureAwait(false);

        // Kur çevrimi YALNIZ detayda ve teklifte: listede yirmi dört farklı tahsilat
        // para birimi olabilir ve hepsi için çapraz oran çözmek, kartlar için ödenecek
        // bir bedel değil (GetExperiencesQuery'deki notun karşılığı).
        var display = pricing is null
            ? null
            : await ExchangeRateStore
                .ResolveAsync(
                    dbContext, pricing.ChargeCurrency, pricing.ChargeMinorUnits,
                    request.Currency, cancellationToken)
                .ConfigureAwait(false);

        return GuestExperienceQuery.ToDetail(
            row,
            texts[row.Id],
            spokenLanguages,
            tags,
            images,
            host,
            pricing is null ? null : GuestPricingStore.ToResponse(pricing, display),
            itinerary,
            language);
    }
}
