using System.Collections.ObjectModel;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;
using Expyra.Domain.Places;
using Expyra.Domain.Users;

namespace Expyra.Application.Features.Experiences;

/// <summary>
/// Misafirin görebildiği deneyimin TEK tanımı — liste ucu da detay ucu da buradan
/// besleniyor.
///
/// <para>Bir yerde toplanmalarının sebebi tekrarı azaltmak değil, <b>kararların
/// ayrışmasını engellemek</b>: "yalnız yayında" ve "banlı host görünmez" kuralları iki
/// handler'a iki kez yazılsaydı, birinde unutulan koşul listede görünüp detayda 404
/// veren (ya da tersi) bir ilan üretirdi — ve derleyici bunu görmezdi.</para>
/// </summary>
internal static class GuestExperienceQuery
{
    /// <summary>
    /// Misafire açık deneyimler.
    ///
    /// <para><b>Taslak ve arşiv burada YOK</b>, dolayısıyla ikisi de misafir için
    /// 404 (PLAN kabul kriteri 3). Başkasının taslağı da aynı 404'ü alıyor — 403
    /// "bu id'de bir ilan var" bilgisini sızdırırdı.</para>
    ///
    /// <para><b>Host durumu kapısı JOIN değil EXISTS</b>: host satırından hiçbir sütun
    /// okumuyoruz, yalnız bir koşul soruyoruz. EXISTS bunu söylüyor ve ayrıca satır
    /// çoğaltma riski taşımıyor. Banlı ya da askıya alınmış bir host'un ilanları o anda
    /// listeden ve detaydan düşüyor; ilan satırına dokunmaya (ör. hepsini arşivlemeye)
    /// gerek yok — yaptırım tek yerde ve geri alınabilir.</para>
    /// </summary>
    internal static IQueryable<Experience> Visible(IAppDbContext dbContext)
    {
        // Ayrı bir sorgu değil, EF'in ana sorguya gömdüğü bir alt sorgu: adının olması
        // yalnızca okunurluk için.
        var activeHosts = dbContext.Users.Where(x => x.Status == UserStatus.Active);

        return dbContext.Experiences
            .AsNoTracking()
            .Where(x => x.Status == ExperienceStatus.Published)
            .Where(x => activeHosts.Any(host => host.Id == x.HostId));
    }

    /// <summary>
    /// Misafirin gördüğü alanlar + şehir, en yeni YAYINLANAN üstte. İki ucun ORTAK
    /// gövdesi: liste buna limit ekliyor, detay tek satır çekiyor.
    ///
    /// <para><b>Filtreler parametre olarak GELİYOR, sonuca zincirlenmiyor</b> ve bunun
    /// teknik bir sebebi var: EF Core, <c>new Kayit(a, b)</c> biçimindeki bir
    /// projeksiyonun ÜZERİNE yazılan <c>Where</c>/<c>OrderBy</c>'da property'leri geri
    /// yapıcı argümanlarına bağlayamıyor (anonim tiplerin aksine, pozisyonel record'da
    /// <c>NewExpression.Members</c> boş). Böyle bir zincir çalışma anında "çevrilemedi"
    /// diye patlardı. Bu yüzden süzme ve sıralama entity üzerinde, projeksiyon EN SONDA.</para>
    ///
    /// <para>Sıralama BURADA, çağıranda değil: iki uç aynı sırayı kullanmak zorunda
    /// (cursor o sıraya göre çözülüyor) ve <c>Take</c> ile birlikte sıralamanın aynı
    /// SELECT'te kalması gerekiyor — alt sorguya inen bir <c>ORDER BY</c>, dış sorguda
    /// satır sırasını garanti etmez. Detay ucunda tek satır sıralamak bedava.</para>
    ///
    /// <para>Şehir INNER JOIN: yayın doğrulaması şehri şart koşuyor, yani yayındaki bir
    /// ilanın şehri daima var. LEFT JOIN yazmak "olabilir" demek olurdu ve o ihtimal
    /// yanıt tipine kadar (nullable şehir) sızardı. Şehir filtresi de bu join'in
    /// üzerinden geçiyor — <c>ux_city_country_slug</c> tek satır getiriyor, oradan
    /// <c>ix_experience_city_status</c>'a iniliyor.</para>
    ///
    /// <para><c>(Guid?)city.Id</c> dönüşümü derleyici için: <c>experience.CityId</c>
    /// nullable, join anahtarlarının tipi aynı olmak zorunda. SQL tarafında fark yok —
    /// NULL zaten hiçbir satırla eşleşmiyor.</para>
    /// </summary>
    internal static IQueryable<GuestExperienceRow> NewestFirst(
        IQueryable<Experience> experiences,
        IQueryable<City> cities)
        => from experience in experiences
           join city in cities on experience.CityId equals (Guid?)city.Id
           orderby experience.PublishedAtUtc descending, experience.Id descending
           select new GuestExperienceRow(
               experience.Id,
               experience.Slug!,
               experience.OriginalLanguage,
               experience.CategorySlug!,
               experience.DurationMinutes,
               experience.Capacity,
               // Yayındaki satırda daima dolu: durum ve damga aynı transaction'da yazılıyor
               // (PublishExperienceCommand). Boş olsaydı burada gürültüyle patlardı —
               // sessizce varsayılan bir tarih üretmek, bozuk satırı gizlemek olurdu.
               experience.PublishedAtUtc!.Value,
               city.Slug,
               city.CountryCode,
               city.Name,
               city.EnglishName);

    /// <summary>
    /// Sayfanın metinlerini TEK sorguda getirir ve her satır için fallback zincirini
    /// çözer.
    ///
    /// <para><b>Neden seçim bellekte, SQL'de değil</b> (PLAN'ın açık sorusu):</para>
    /// <list type="number">
    /// <item><b>Zincir bir filtre değil.</b> Yayın kapısı orijinal dildeki satırı şart
    /// koştuğu için her yayındaki ilan DAİMA bir metin bulur — yani seçim, hangi
    /// satırların döneceğini değiştirmiyor, yalnız hangi metnin gösterileceğini seçiyor.
    /// Sayfanın satırları keyset ile zaten belirlendikten SONRA çalışıyor.</item>
    /// <item><b>Cursor sayfalama üst sınırı baştan veriyor.</b> Sayfa en fazla
    /// <c>PageSize + 1</c> satır; ikinci sorgu <c>experience_id = ANY(...) AND
    /// language = ANY(...)</c> ile bileşik birincil anahtarın önekinden gidiyor.
    /// Maliyet sayfa boyutuna bağlı, tablo boyutuna değil — N+1'in tanımı olan
    /// "satır başına sorgu" hiç doğmuyor.</item>
    /// <item><b>Yanlışı sessiz olmasın.</b> Zincir SQL'de bir <c>ORDER BY CASE</c>
    /// olsaydı, yanlış sıralanmış bir dal hata vermez; yalnızca yanlış dilde metin
    /// gösterirdi. Kural saf bir fonksiyonda (<see cref="ExperienceTextFallback"/>) ve
    /// her adımı tek başına test ediliyor.</item>
    /// </list>
    /// <para>Bedeli: liste ucu bir sorgu yerine iki sorgu koşuyor. Sabit iki — sayfada
    /// 1 satır da olsa 24 satır da olsa aynı (<c>HostExperienceProjection</c> ile aynı
    /// kalıp ve aynı gerekçe).</para>
    /// </summary>
    /// <param name="withDescription">
    /// Liste <c>false</c> geçiyor: açıklama sütunu 4000 karaktere kadar çıkabiliyor ve
    /// hiçbir kart onu çizmiyor. Sabit <c>null</c> projeksiyon, sütunu SELECT'e hiç
    /// koymuyor — "çekip atmak" yerine "hiç istememek".
    /// </param>
    internal static async Task<IReadOnlyDictionary<Guid, ExperienceTextRow>> LoadTextsAsync(
        IAppDbContext dbContext,
        IReadOnlyList<GuestExperienceRow> experiences,
        string? requestedLanguage,
        bool withDescription,
        CancellationToken cancellationToken)
    {
        if (experiences.Count == 0)
        {
            // Boş sayfa için sorgu AÇILMIYOR: son sayfadan sonrası ve sonuçsuz şehir
            // filtresi sık, ve `IN ()` boş listeyle çalışan bir sorgu boşa gidiş demek.
            return ReadOnlyDictionary<Guid, ExperienceTextRow>.Empty;
        }

        var ids = experiences.Select(x => x.Id).ToList();

        // Sorguya giden dil kümesi, sayfadaki HER satırın zincirinin birleşimi. Filtresiz
        // çekilseydi çok dilli bir ilan onlarca satır getirirdi; burada satır başına en
        // fazla dört aday var.
        var languages = new HashSet<string>(StringComparer.Ordinal);
        foreach (var experience in experiences)
        {
            foreach (var candidate in ExperienceTextFallback.Candidates(requestedLanguage, experience.OriginalLanguage))
            {
                languages.Add(candidate);
            }
        }

        var wantedLanguages = languages.ToList();

        var source = dbContext.ExperienceTranslations
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId) && wantedLanguages.Contains(x.Language));

        var rows = withDescription
            ? await source
                .Select(x => new ExperienceTextRow(x.ExperienceId, x.Language, x.Title, x.Description, x.Source))
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false)
            : await source
                .Select(x => new ExperienceTextRow(x.ExperienceId, x.Language, x.Title, (string?)null, x.Source))
                .ToListAsync(cancellationToken)
                .ConfigureAwait(false);

        var byExperience = rows.ToLookup(x => x.ExperienceId);
        var chosen = new Dictionary<Guid, ExperienceTextRow>(experiences.Count);

        foreach (var experience in experiences)
        {
            var available = byExperience[experience.Id].ToList();

            var language = ExperienceTextFallback.Resolve(
                requestedLanguage,
                experience.OriginalLanguage,
                available.ConvertAll(x => x.Language));

            if (language is null)
            {
                // Yayındaki bir ilanın hiçbir dilde metni olamaz: yayın kapısı orijinal
                // dildeki satırı şart koşuyor ve çeviriyi silen bir uç yok. Buraya
                // düşülüyorsa veri bozulmuş demektir — boş başlık üretip gizlemek yerine
                // 500 (CLAUDE.md #1: bozuk sistem bozuk görünsün).
                throw new InvalidOperationException(
                    $"Yayındaki '{experience.Slug}' deneyiminin hiçbir dilde metni yok.");
            }

            chosen[experience.Id] = available.Find(
                x => string.Equals(x.Language, language, StringComparison.Ordinal))!;
        }

        return chosen;
    }

    /// <summary>
    /// İstenen dili kanonikleştirir (<c>en_us</c> → <c>en-US</c>). Doğrulayıcı biçimi
    /// zaten reddettiği için buraya geçersiz bir değer gelmiyor; <c>null</c> "dil
    /// belirtilmedi" demek ve zincir doğrudan host'un dilinden başlıyor.
    /// </summary>
    internal static string? NormalizeLanguage(string? raw)
        => LanguageCode.TryNormalize(raw, out var normalized) ? normalized : null;

    internal static GuestExperienceCityResponse ToCity(GuestExperienceRow row)
        => new(row.CitySlug, row.CityCountryCode, row.CityName, row.CityEnglishName);

    /// <summary>
    /// Sayfadaki TÜM ilanların kapaklarını tek sorguda getirir.
    ///
    /// <para><b>Neden ana sorguya join edilmiyor:</b> deneyim başına birden fazla görsel
    /// var; join, ana satırları çoğaltır ve keyset sayfalaması (bir fazla satır çekip
    /// "daha var mı" diye bakma) anlamını yitirirdi. Metin yüklemesiyle aynı desen —
    /// sorgu sayısı sayfa uzunluğundan bağımsız ve sabit.</para>
    ///
    /// <para>Kapaksız ilan sözlükte HİÇ YOK: çağıran <c>TryGetValue</c> ile
    /// <c>null</c>'a düşüyor (bkz. <c>GuestExperienceSummaryResponse.Cover</c>).</para>
    /// </summary>
    internal static async Task<IReadOnlyDictionary<Guid, GuestExperienceImageResponse>> LoadCoversAsync(
        IAppDbContext dbContext,
        IObjectStorage storage,
        IReadOnlyList<GuestExperienceRow> rows,
        CancellationToken cancellationToken)
    {
        if (rows.Count == 0)
        {
            return new Dictionary<Guid, GuestExperienceImageResponse>();
        }

        var ids = rows.Select(x => x.Id).ToArray();

        var covers = await dbContext.ExperienceMedia
            .AsNoTracking()
            .Where(x => ids.Contains(x.ExperienceId) && x.IsCover && x.Status == MediaStatus.Active)
            .Select(x => new { x.ExperienceId, x.StorageKey, x.Width, x.Height })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return covers.ToDictionary(
            x => x.ExperienceId,
            x => new GuestExperienceImageResponse(storage.PublicUrl(x.StorageKey), x.Width, x.Height));
    }

    /// <summary>
    /// Tek ilanın galerisi, host'un verdiği sırada. Doğrulanmamış satırlar dışarıda —
    /// misafire yüklenmemiş bir dosyanın adresi gitmemeli.
    /// </summary>
    internal static async Task<IReadOnlyList<GuestExperienceImageResponse>> LoadImagesAsync(
        IAppDbContext dbContext,
        IObjectStorage storage,
        Guid experienceId,
        CancellationToken cancellationToken)
    {
        var media = await dbContext.ExperienceMedia
            .AsNoTracking()
            .Where(x => x.ExperienceId == experienceId && x.Status == MediaStatus.Active)
            // Kapak ÖNCE, sonra host'un sırası: galeri açıldığında ilk görülen, kartta
            // görülenle aynı olsun.
            .OrderByDescending(x => x.IsCover)
            .ThenBy(x => x.SortOrder)
            .Select(x => new { x.StorageKey, x.Width, x.Height })
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        return media
            .Select(x => new GuestExperienceImageResponse(storage.PublicUrl(x.StorageKey), x.Width, x.Height))
            .ToList();
    }

    internal static GuestExperienceSummaryResponse ToSummary(
        GuestExperienceRow row,
        ExperienceTextRow text,
        GuestExperienceImageResponse? cover,
        string? requestedLanguage)
        => new(
            row.Slug,
            ToCity(row),
            row.CategorySlug,
            row.DurationMinutes,
            row.Capacity,
            new GuestExperienceTextResponse(
                text.Language,
                text.Title,
                IsFallback(text.Language, requestedLanguage),
                text.Source.ToString()),
            cover,
            row.PublishedAtUtc);

    internal static GuestExperienceDetailResponse ToDetail(
        GuestExperienceRow row,
        ExperienceTextRow text,
        IReadOnlyList<string> spokenLanguages,
        IReadOnlyList<string> tags,
        IReadOnlyList<GuestExperienceImageResponse> images,
        string? requestedLanguage)
        => new(
            row.Slug,
            ToCity(row),
            row.CategorySlug,
            row.DurationMinutes,
            row.Capacity,
            spokenLanguages,
            tags,
            new GuestExperienceDetailTextResponse(
                text.Language,
                text.Title,
                text.Description,
                IsFallback(text.Language, requestedLanguage),
                text.Source.ToString()),
            images,
            row.PublishedAtUtc);

    /// <summary>
    /// Dil istenmediyse fallback de yok: karşılaştıracak bir talep olmadan "yedeğe
    /// düşüldü" demek, arayüze basmayacağı bir rozet bastırırdı.
    /// </summary>
    private static bool IsFallback(string language, string? requestedLanguage)
        => requestedLanguage is not null
            && !string.Equals(language, requestedLanguage, StringComparison.Ordinal);
}

/// <summary>
/// Sorgudan dönen ham satır. Yanıt tipi DEĞİL: <see cref="GuestExperienceRow.Id"/> ve
/// <see cref="GuestExperienceRow.OriginalLanguage"/> yalnız sunucu tarafında işe yarıyor
/// (cursor ve fallback zinciri), istemciye gitmiyor.
/// </summary>
internal sealed record GuestExperienceRow(
    Guid Id,
    string Slug,
    string OriginalLanguage,
    string CategorySlug,
    int DurationMinutes,
    int Capacity,
    DateTimeOffset PublishedAtUtc,
    string CitySlug,
    string CityCountryCode,
    string CityName,
    string CityEnglishName);

/// <summary>Bir çeviri satırının misafire lazım olan parçası.</summary>
internal sealed record ExperienceTextRow(
    Guid ExperienceId,
    string Language,
    string Title,
    string? Description,
    TranslationSource Source);
