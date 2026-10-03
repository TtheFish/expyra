using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Pricing;
using Expyra.Domain.Places;

namespace Expyra.Application.Features.Experiences.Queries.GetExperiences;

/// <summary>
/// Misafirin gördüğü ilan listesi — ana sayfa vitrini ve <c>/kesfet</c>.
///
/// <para><b>Anonim.</b> Oturum istenmiyor ve kimlik okunmuyor: keşif, giriş yapmamış
/// misafirin gördüğü ilk şey. Bu yüzden yanıt kullanıcıya göre değişmiyor — kişiselleştirme
/// (favori işareti, "senin şehrin") ayrı uçların işi.</para>
///
/// <para><b>Yalnız yayındakiler ve yalnız aktif host'ların ilanları</b>
/// (<see cref="GuestExperienceQuery.Visible"/>).</para>
/// </summary>
/// <param name="City">
/// Şehir filtresi, <c>ülke-slug</c> biçiminde: <c>cz-prague</c> (bkz. <see cref="CityKey"/>).
/// Boşsa tüm şehirler.
/// </param>
/// <param name="Cursor">
/// Önceki sayfanın <c>nextCursor</c> değeri. Opak; çözülemeyen değer <b>400</b>
/// (bkz. <see cref="ExperienceCursor"/>).
/// </param>
/// <param name="Language">
/// Metnin istendiği dil (BCP-47). Fallback zinciri sunucuda çözülüyor ve istemciye TEK
/// çeviri gidiyor (docs/I18N.md §2).
///
/// <para><b>Neden query parametresi, <c>Accept-Language</c> başlığı değil</b> — iki sebep:
/// (1) başlık ağırlıklı bir LİSTE taşıyor (<c>de-AT,de;q=0.9,en;q=0.8</c>) ve zincirin
/// tanımı tek bir istenen dil üzerine kurulu; q değerlerini yorumlamak, dokümandaki
/// zincirle sunucudaki davranışı sessizce ayrıştırırdı. (2) Yanıtın kimliği tamamen
/// URL'de kalıyor: bir gün önbelleğe alınırsa <c>Vary: Accept-Language</c> tuzağı hiç
/// doğmuyor. Arayüz zaten dili URL'den biliyor (<c>/tr/...</c>, <c>/en/...</c>).</para>
/// </param>
/// <param name="Currency">
/// Misafirin görüntüleme para birimi (ISO 4217). Boşsa kartlar host'un tahsilat
/// para biriminde kalır; doluysa kur ekiyle çevrilir — tahsilat alanı DEĞİŞMEZ
/// (PLAN Blok 7 kabul kriteri 3).
/// </param>
public sealed record GetExperiencesQuery(
    string? City = null,
    string? Cursor = null,
    string? Language = null,
    string? Currency = null)
    : IRequest<GuestExperiencePageResponse>
{
    /// <summary>
    /// Sayfa boyutu SABİT, istemci belirlemiyor.
    ///
    /// <para>Ayarlanabilir bir <c>limit</c> zaten bir tavan istiyor (aksi halde tek
    /// istekle tüm tablo çekilir), yani kazanılan tek şey "24 yerine 12" demek olurdu.
    /// PLAN'ın sözleşmesi iki parametre sayıyor; üçüncüsü gerçekten gerektiğinde
    /// eklenir — bugün eklenen, kullanılmayan bir sözleşme parçası olur.</para>
    ///
    /// <para>24: 2/3/4 sütunlu ızgaraların hepsinde tam sıra ile bitiyor.</para>
    /// </summary>
    public const int PageSize = 24;
}

internal sealed class GetExperiencesQueryHandler(IAppDbContext dbContext, IObjectStorage storage)
    : IRequestHandler<GetExperiencesQuery, GuestExperiencePageResponse>
{
    public async Task<GuestExperiencePageResponse> Handle(
        GetExperiencesQuery request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var language = GuestExperienceQuery.NormalizeLanguage(request.Language);

        var experiences = GuestExperienceQuery.Visible(dbContext);
        IQueryable<City> cities = dbContext.Cities;

        // Biçimi bozuk anahtar doğrulayıcıda 400 oluyor; buradaki çözüm parçaları üretmek
        // için. İkisi ayrışırsa filtre sessizce uygulanmadan geçerdi.
        var hasCityFilter = CityKey.TryParse(request.City, out var countryCode, out var citySlug);
        if (hasCityFilter)
        {
            // Filtre ŞEHİR tarafında: join zaten kuruluyor, ikinci bir alt sorgu açmaya
            // gerek yok. ux_city_country_slug tek satır getiriyor.
            cities = cities.Where(x => x.CountryCode == countryCode && x.Slug == citySlug);
        }

        if (ExperienceCursor.TryDecode(request.Cursor, out var cursor))
        {
            // Cursor alanları YEREL değişkene alınıyor: EF, yakalanan struct'ın alanlarını
            // parametreye çevirirken daha az sürprizle çalışıyor ve üretilen SQL okunur
            // kalıyor.
            var cursorPublishedAt = cursor.SortedAtUtc;
            var cursorId = cursor.Id;

            // Keyset: "bu satırdan kesin olarak sonra gelenler". Eşit zaman damgasında
            // ikincil anahtar (id) devreye giriyor — onsuz aynı anda yayınlanan iki ilan
            // iki sayfada birden ya da hiçbirinde görünürdü.
            experiences = experiences.Where(x =>
                x.PublishedAtUtc < cursorPublishedAt
                || (x.PublishedAtUtc == cursorPublishedAt && x.Id < cursorId));
        }

        // Sayfa boyutundan BİR FAZLA: "daha var mı" sorusu ikinci bir COUNT sorgusu
        // olmadan cevaplanıyor ve boş bir son sayfaya yönlendiren cursor hiç üretilmiyor.
        var page = await GuestExperienceQuery
            .NewestFirst(experiences, cities)
            .Take(GetExperiencesQuery.PageSize + 1)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var hasMore = page.Count > GetExperiencesQuery.PageSize;
        if (hasMore)
        {
            page.RemoveAt(page.Count - 1);
        }

        if (page.Count == 0 && hasCityFilter)
        {
            await RequireKnownCityAsync(countryCode, citySlug, request.City!, cancellationToken)
                .ConfigureAwait(false);
        }

        var texts = await GuestExperienceQuery
            .LoadTextsAsync(dbContext, page, language, withDescription: false, cancellationToken)
            .ConfigureAwait(false);

        // Kapaklar da sayfanın tamamı için TEK sorguda: metinlerle aynı desen, sorgu
        // sayısı sayfa uzunluğundan bağımsız.
        var covers = await GuestExperienceQuery
            .LoadCoversAsync(dbContext, storage, page, cancellationToken)
            .ConfigureAwait(false);

        // Fiyat da sayfanın tamamı için toplu: kart başına sorgu, yirmi dört kartlık
        // bir sayfada kırk sekiz tur demekti.
        var pricing = await GuestPricingStore
            .LoadManyAsync(dbContext, [.. page.Select(x => x.Id)], cancellationToken)
            .ConfigureAwait(false);

        // Aynı tahsilat para birimi için kur bir kez çözülüyor: sayfada yirmiden fazla
        // ilan olsa da benzersiz para birimi sayısı tek haneli kalıyor (demo'da üç).
        var displaysByCharge = new Dictionary<string, CurrencyDisplay?>(StringComparer.Ordinal);

        foreach (var charge in pricing.Values
                     .Select(x => (x.ChargeCurrency, x.ChargeMinorUnits))
                     .Distinct())
        {
            displaysByCharge[charge.ChargeCurrency] = await ExchangeRateStore
                .ResolveAsync(
                    dbContext,
                    charge.ChargeCurrency,
                    charge.ChargeMinorUnits,
                    request.Currency,
                    cancellationToken)
                .ConfigureAwait(false);
        }

        var items = page
            .Select(row => GuestExperienceQuery.ToSummary(
                row,
                texts[row.Id],
                // Blok 6 öncesinde yayınlanmış kapaksız satırlar burada null'a düşüyor.
                covers.TryGetValue(row.Id, out var cover) ? cover : null,
                pricing.TryGetValue(row.Id, out var price)
                    ? GuestPricingStore.ToResponse(
                        price,
                        displaysByCharge.GetValueOrDefault(price.ChargeCurrency))
                    : null,
                language))
            .ToList();

        var nextCursor = hasMore
            ? new ExperienceCursor(page[^1].PublishedAtUtc, page[^1].Id).Encode()
            : null;

        return new GuestExperiencePageResponse(items, nextCursor);
    }

    /// <summary>
    /// Boş sayfa "bu şehirde ilan yok" mu, yoksa "böyle bir şehir yok" mu — ikisi
    /// misafire aynı ekranı gösterirdi ama biri istemci hatası.
    ///
    /// <para>Kontrol YALNIZ sayfa boşken koşuyor: dolu sayfada şehrin var olduğu zaten
    /// kanıtlanmış (satırlar ondan geldi), yani sıcak yolda ek sorgu yok. Bu, "sessizce
    /// yok sayma" yasağını (Blok 4 kabul kriteri 3) her isteğe bir SELECT ödemeden
    /// uyguluyor.</para>
    ///
    /// <para>404 değil <b>400</b>: bulunamayan şey uç değil, isteğin bir PARAMETRESİ.
    /// 404, detay ucunda "böyle bir deneyim yok" anlamına ayrılmış durumda.</para>
    /// </summary>
    private async Task RequireKnownCityAsync(
        string countryCode,
        string citySlug,
        string requestedKey,
        CancellationToken cancellationToken)
    {
        var exists = await dbContext.Cities
            .AsNoTracking()
            .AnyAsync(x => x.CountryCode == countryCode && x.Slug == citySlug, cancellationToken)
            .ConfigureAwait(false);

        if (!exists)
        {
            throw new BadRequestException($"Kayıt defterinde '{requestedKey}' diye bir şehir yok.");
        }
    }
}
