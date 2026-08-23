using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Common;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.UpdateExperience;

/// <summary>
/// İlanın dil-bağımsız alanları. Başlık ve açıklama BURADA DEĞİL — onlar
/// <c>PUT .../translations/{lang}</c>'in işi (docs/I18N.md §2).
///
/// <para><b>Sözleşme: gerçek bir PATCH, delta.</b> Verilmeyen (<c>null</c>) skaler alan
/// "dokunma" demek. <c>PATCH /api/users/me</c> bunun TERSİNİ yapıyor (orada gövde tam
/// profili taşır ve verilmeyen alan temizlenir) — ayrım bilinçli: iki alanlık bir formda
/// "hepsini gönder" ucuz, altı alanlık bir sihirbazda ise adım 2'yi kaydeden istemci
/// adım 1'i sessizce silerdi.</para>
///
/// <para>Koleksiyonlar için "boşalt" niyeti <b>boş dizi</b> ile anlatılır: <c>null</c>
/// dokunma, <c>[]</c> hepsini kaldır. Skalerlerde böyle bir ayrım yok — şehri ya da
/// kategoriyi <i>temizlemenin</i> bir kullanım senaryosu yok, değiştirmenin var.</para>
/// </summary>
/// <param name="ExperienceId">
/// Gövdeden DEĞİL, yoldan doldurulur (controller <c>with</c> ile yazıyor). İstemci
/// gövdeye başka bir id koysa bile üzerine yazılır.
/// </param>
/// <param name="InfantCountsTowardCapacity">
/// Bebek koltuk tüketiyor mu. Karar HOST'un çünkü fiziksel sınırı bilen o: teknede
/// her baş sayılır, yürüyüş turunda kucaktaki bebek saymayabilir. Varsayılan
/// <c>true</c> — güvenli taraf, kapasiteyi aşmayan taraf.
/// </param>
/// <param name="SpokenLanguages">
/// Deneyim sırasında konuşulan diller. <b>Çeviri dili değil</b> (docs/I18N.md §3):
/// Prag'daki host ilanını İngilizce yazıp turu Çekçe anlatabilir.
/// </param>
public sealed record UpdateExperienceCommand(
    Guid ExperienceId,
    Guid? CityId,
    string? CategorySlug,
    int? DurationMinutes,
    int? Capacity,
    bool? InfantCountsTowardCapacity,
    IReadOnlyList<string>? SpokenLanguages,
    IReadOnlyList<string>? Tags) : IRequest<HostExperienceResponse>;

internal sealed class UpdateExperienceCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser)
    : IRequestHandler<UpdateExperienceCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        UpdateExperienceCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        // Transaction ŞART (CLAUDE.md #5): tek istekte experience satırı + konuşulan dil
        // satırları + etiket satırları değişiyor. Yarım uygulanmış bir düzenleme,
        // "şehir değişti ama saat dilimi eski kaldı" gibi FK'si tutan ama anlamsız bir
        // duruma bırakırdı.
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        if (request.CityId is { } cityId)
        {
            await ApplyCityAsync(experience, cityId, cancellationToken).ConfigureAwait(false);
        }

        if (request.CategorySlug is not null)
        {
            await ApplyCategoryAsync(experience, request.CategorySlug, cancellationToken)
                .ConfigureAwait(false);
        }

        if (request.DurationMinutes is { } duration)
        {
            experience.DurationMinutes = duration;
        }

        if (request.Capacity is { } capacity)
        {
            experience.Capacity = capacity;
        }

        if (request.InfantCountsTowardCapacity is { } infantsCount)
        {
            experience.InfantCountsTowardCapacity = infantsCount;
        }

        if (request.SpokenLanguages is not null)
        {
            await ApplySpokenLanguagesAsync(experience, request.SpokenLanguages, cancellationToken)
                .ConfigureAwait(false);
        }

        if (request.Tags is not null)
        {
            await ApplyTagsAsync(experience, request.Tags, cancellationToken).ConfigureAwait(false);
        }

        await GuardPublishedInvariantAsync(experience, cancellationToken).ConfigureAwait(false);

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }

    /// <summary>
    /// Şehri yazar ve saat dilimini ONDAN TÜRETİR — istemciden saat dilimi alınmıyor
    /// (PLAN Blok 5). Gezginin tarayıcı saati, Prag'daki bir turun saatini tanımlayamaz.
    /// </summary>
    private async Task ApplyCityAsync(
        Experience experience,
        Guid cityId,
        CancellationToken cancellationToken)
    {
        if (experience.CityId == cityId)
        {
            return;
        }

        // Bir kez yayınlanmış ilanın şehri DEĞİŞMEZ. Değişseydi hem saat dilimi hem de
        // (Blok 7'den sonra) mevcut rezervasyonların yeri kayardı: gezgin Prag için
        // bilet almışken deneyim Viyana'ya taşınırdı. Şehir değiştirmek isteyen host
        // ilanı arşivleyip yenisini açar — bu, verinin kaybolmadığı tek yol.
        if (experience.PublishedAtUtc is not null)
        {
            throw new ConflictException(
                "Yayınlanmış bir deneyimin şehri değiştirilemez. İlanı arşivleyip yenisini oluşturun.");
        }

        var city = await dbContext.Cities
            .AsNoTracking()
            .Where(x => x.Id == cityId)
            .Select(x => new { x.Id, x.TimeZoneId })
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        // FK'ye çarpmadan ÖNCE: fk_experience_city ihlali kullanıcıya 500 olarak düşerdi.
        if (city is null)
        {
            throw new BadRequestException("Seçilen şehir kayıt defterinde yok.");
        }

        experience.CityId = city.Id;
        experience.TimeZoneId = city.TimeZoneId;
    }

    private async Task ApplyCategoryAsync(
        Experience experience,
        string categorySlug,
        CancellationToken cancellationToken)
    {
        // Slug'ı INVARIANT katlamadan geçiriyoruz: istemci "Food-Drink" gönderse de
        // "food-drink" satırını buluyor ve Türkçe kültürdeki I/i tuzağı hiç doğmuyor
        // (SearchText sınıf notu).
        var slug = SearchText.ToSlug(categorySlug);

        var known = await dbContext.Categories
            .AsNoTracking()
            .AnyAsync(x => x.Slug == slug && x.IsActive, cancellationToken)
            .ConfigureAwait(false);

        // IsActive de aranıyor: kapatılmış kategori yeni ilanda seçilemez ama satırı
        // durur ve ona bağlı eski ilanlar bozulmaz (Category sınıf notu).
        if (!known)
        {
            throw new BadRequestException($"'{slug}' geçerli bir kategori değil.");
        }

        experience.CategorySlug = slug;
    }

    /// <summary>
    /// Konuşulan dilleri istenen kümeye eşitler.
    ///
    /// <para><b>Neden hepsini silip yeniden yazmıyoruz:</b> aynı SaveChanges içinde aynı
    /// birincil anahtarı silip yeniden eklemek, EF'in komut sıralamasına bağlı kırılgan
    /// bir davranış. Fark alma hem bundan kaçınıyor hem de değişmeyen satırlara hiç
    /// dokunmuyor.</para>
    /// </summary>
    private async Task ApplySpokenLanguagesAsync(
        Experience experience,
        IReadOnlyList<string> requested,
        CancellationToken cancellationToken)
    {
        var codes = new List<string>(requested.Count);

        foreach (var raw in requested)
        {
            if (!LanguageCode.TryNormalize(raw, out var code))
            {
                throw new BadRequestException($"Dil kodu geçersiz: '{raw}'.");
            }

            // Tekrar sessizce eleniyor: istemcinin iki kez 'en' göndermesi bir hata
            // değil, bileşik anahtar zaten tek satıra izin veriyor.
            if (!codes.Contains(code, StringComparer.Ordinal))
            {
                codes.Add(code);
            }
        }

        // ContentAllowed ARANMIYOR — gerekçe HostExperienceStore.RequireKnownLanguagesAsync'te.
        await HostExperienceStore
            .RequireKnownLanguagesAsync(dbContext, codes, cancellationToken)
            .ConfigureAwait(false);

        var existing = await dbContext.ExperienceSpokenLanguages
            .Where(x => x.ExperienceId == experience.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var row in existing.Where(x => !codes.Contains(x.Language, StringComparer.Ordinal)))
        {
            dbContext.ExperienceSpokenLanguages.Remove(row);
        }

        foreach (var code in codes.Except(existing.Select(x => x.Language), StringComparer.Ordinal))
        {
            dbContext.ExperienceSpokenLanguages.Add(new ExperienceSpokenLanguage
            {
                ExperienceId = experience.Id,
                Language = code,
            });
        }
    }

    private async Task ApplyTagsAsync(
        Experience experience,
        IReadOnlyList<string> requested,
        CancellationToken cancellationToken)
    {
        // Anahtar KATLANMIŞ hâl, değer host'un yazdığı hâl: "Vegan" ile "vegan" tek satır.
        var displayByNormalized = new Dictionary<string, string>(StringComparer.Ordinal);

        foreach (var raw in requested)
        {
            var display = raw?.Trim() ?? string.Empty;
            var normalized = SearchText.Fold(display);

            // Sessizce ATLAMIYORUZ (CLAUDE.md #1): "!!!" gibi bir girdi katlanınca hiçbir
            // şey bırakmıyor. Atlansaydı host etiketini kaydettiğini sanır, listede
            // görmez ve nedenini hiçbir yerde bulamazdı.
            if (normalized.Length == 0)
            {
                throw new BadRequestException($"'{raw}' geçerli bir etiket değil.");
            }

            // Tekrarda İLK yazım kazanıyor; ikincisi bir hata değil, aynı etiket.
            displayByNormalized.TryAdd(normalized, display);
        }

        var existing = await dbContext.ExperienceTags
            .Where(x => x.ExperienceId == experience.Id)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        foreach (var row in existing)
        {
            if (displayByNormalized.TryGetValue(row.NormalizedTag, out var display))
            {
                // Aynı etiketin yazımı değişmiş olabilir ("vegan" → "Vegan"): anahtar
                // katlanmış hâl olduğu için satır aynı, gösterilen metin güncelleniyor.
                row.DisplayTag = display;
            }
            else
            {
                dbContext.ExperienceTags.Remove(row);
            }
        }

        foreach (var tag in displayByNormalized.Where(
            candidate => !existing.Exists(
                row => string.Equals(row.NormalizedTag, candidate.Key, StringComparison.Ordinal))))
        {
            dbContext.ExperienceTags.Add(new ExperienceTag
            {
                ExperienceId = experience.Id,
                NormalizedTag = tag.Key,
                DisplayTag = tag.Value,
            });
        }
    }

    /// <summary>
    /// <b>Yayınlanmış ilan yayın koşullarını ihlal edecek şekilde düzenlenemez.</b>
    ///
    /// <para>Bu kural olmasaydı yayın kapısı tek yönlü bir kontrol olurdu: host bir kez
    /// yayınlar, ertesi gün kapasiteyi 0 yapar ve ilan yayında kalırdı — misafir onu
    /// listede görür, rezervasyon denemesi ilk adımda ölürdü. Kapı, durumun kendisini
    /// korumak zorunda, yalnız geçişi değil.</para>
    ///
    /// <para>Taslak ve arşiv için çalışmıyor: eksik bir taslağı kaydedebilmek zaten
    /// taslağın tanımı.</para>
    /// </summary>
    private async Task GuardPublishedInvariantAsync(
        Experience experience,
        CancellationToken cancellationToken)
    {
        if (experience.Status != ExperienceStatus.Published)
        {
            return;
        }

        var hasTranslation = await HostExperienceStore
            .HasOriginalLanguageTranslationAsync(dbContext, experience, cancellationToken)
            .ConfigureAwait(false);

        // Kapak da sorgulanıyor: bu koruma "yayındaki ilan zorunlu bir alanı kaybedemez"
        // diyor ve kapak artık o alanlardan biri. Bugün güncelleme ucu medyaya dokunmuyor,
        // yani sonuç daima true — ama kuralı burada sabitlemek, medyayı değiştiren bir yol
        // eklendiğinde korumanın sessizce delinmesini engelliyor.
        var hasCover = await HostExperienceStore
            .HasActiveCoverAsync(dbContext, experience.Id, cancellationToken)
            .ConfigureAwait(false);

        // Fiyat da aynı korumanın parçası: yayındaki bir ilan fiyatını kaybedemez.
        var hasPrice = await HostExperienceStore
            .HasPriceAsync(dbContext, experience.Id, cancellationToken)
            .ConfigureAwait(false);

        var missing = ExperiencePublishRules.Missing(experience, hasTranslation, hasCover, hasPrice);

        if (missing.Count > 0)
        {
            throw new ConflictException(
                $"Yayındaki deneyim bu alanlar olmadan kaydedilemez: {string.Join(", ", missing)}. " +
                "Önce arşivleyin.");
        }
    }
}
