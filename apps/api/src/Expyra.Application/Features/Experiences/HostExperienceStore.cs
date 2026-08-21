using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences;

/// <summary>
/// Beş host komutunun ortak yazma adımları. Bir yerde toplanmalarının sebebi
/// tekrarı azaltmak değil, <b>kararların ayrışmasını engellemek</b>: "başkasının ilanı
/// 404 alır" kuralı beş handler'a beş kez yazılsaydı, birinde 403'e kaymak bir enumeration
/// açığı olurdu ve derleyici bunu görmezdi.
/// </summary>
internal static class HostExperienceStore
{
    /// <summary>
    /// Slug üretim denemesi. Sonek 9×10⁸ olasılıklı; beş deneme tükenmesi pratikte
    /// imkânsız — tükenirse bu bir "kullanıcı hatası" değil, sistemin bozulduğunun
    /// işaretidir ve öyle de raporlanır (bkz. <see cref="EnsureSlugAsync"/>).
    /// </summary>
    private const int SlugAttempts = 5;

    /// <summary>
    /// İlanı KİLİTLEYEREK yükler ve sahipliğini doğrular.
    ///
    /// <para><b>Başkasının ilanı 404, 403 DEĞİL</b> (PLAN Blok 5 kabul kriteri 3): 403,
    /// "bu id'de bir ilan var" bilgisini sızdırır ve saldırgan id uzayını tarayarak
    /// hangi ilanların var olduğunu haritalayabilir. Var olmayan id ile başkasının id'si
    /// AYNI yanıtı üretiyor — mesajı da aynı, çünkü farklı bir metin de bir oracle'dır.</para>
    ///
    /// <para>Sahiplik kontrolü kilitten SONRA: tek sorguda hem kilit hem filtre
    /// (<c>FindForUpdateAsync</c> yalnız anahtarla çalışır) mümkün değil. Yabancı bir
    /// satırın kilidi, hemen ardından rollback edilen çok kısa ömürlü bir transaction'da
    /// tutuluyor.</para>
    /// </summary>
    internal static async Task<Experience> LoadOwnedForUpdateAsync(
        IAppDbContext dbContext,
        Guid experienceId,
        Guid hostId,
        CancellationToken cancellationToken)
    {
        var experience = await dbContext
            .FindForUpdateAsync<Experience>(experienceId, cancellationToken)
            .ConfigureAwait(false);

        if (experience is null || experience.HostId != hostId)
        {
            throw new NotFoundException("Deneyim bulunamadı.");
        }

        return experience;
    }

    /// <summary>
    /// Slug'ı bir kez üretir. Zaten varsa DOKUNMAZ: başlık düzeltildiğinde URL'in
    /// değişmesi, paylaşılmış her bağlantıyı kırardı.
    ///
    /// <para>Advisory lock anahtarı slug GÖVDESİ: aynı başlığı aynı anda yazan iki host
    /// sıraya giriyor, farklı başlıklar birbirini hiç beklemiyor. Kilit olmadan iki
    /// süreç aynı gövdede aynı soneki üretirse (çok düşük olasılık) ikisi de "boş"
    /// görüp aynı slug'ı yazmaya kalkardı; <c>ux_experience_slug</c> ikinciyi
    /// reddederdi ve kullanıcı sebepsiz bir 500 görürdü.</para>
    ///
    /// <para>Çağıran AÇIK BİR TRANSACTION içinde olmak zorunda — advisory lock'un xact
    /// varyantı kilidi transaction'a bağlıyor (<c>AcquireAdvisoryLockAsync</c>).</para>
    /// </summary>
    internal static async Task EnsureSlugAsync(
        IAppDbContext dbContext,
        Experience experience,
        string title,
        CancellationToken cancellationToken)
    {
        if (experience.Slug is not null)
        {
            return;
        }

        var baseSlug = ExperienceSlug.BaseFrom(title);

        await dbContext
            .AcquireAdvisoryLockAsync($"experience-slug:{baseSlug}", cancellationToken)
            .ConfigureAwait(false);

        for (var attempt = 0; attempt < SlugAttempts; attempt++)
        {
            var candidate = ExperienceSlug.Compose(baseSlug, ExperienceSlug.NewSuffix());

            var taken = await dbContext.Experiences
                .AsNoTracking()
                .AnyAsync(x => x.Slug == candidate, cancellationToken)
                .ConfigureAwait(false);

            if (!taken)
            {
                experience.Slug = candidate;
                return;
            }
        }

        // ConflictException (409) DEĞİL: kullanıcının düzeltebileceği bir şey yok ve
        // 409 "başka bir şey dene" demek olurdu. Beş kriptografik sonek üst üste
        // çakışıyorsa rastgelelik kaynağı bozuk demektir — bu bir 500'dür ve öyle
        // görünmelidir (CLAUDE.md #1: bozuk sistem bozuk görünsün).
        throw new InvalidOperationException(
            $"'{baseSlug}' gövdesi için benzersiz slug üretilemedi ({SlugAttempts} deneme).");
    }

    /// <summary>
    /// İÇERİK dili doğrulaması: kod kayıt defterinde olmalı VE <c>ContentAllowed</c> olmalı.
    /// Kullanıldığı yer çeviri yazma — host'un metin girdiği dil (docs/I18N.md §1).
    ///
    /// <para>Kontrol handler'da, validator'da değil: cevabı veritabanında ve validator'a
    /// DB bağımlılığı sokmak her isteği bir sorgu daha pahalı yapardı
    /// (<c>UpdateProfileCommandValidator</c> ile aynı sınır).</para>
    /// </summary>
    internal static async Task RequireContentLanguageAsync(
        IAppDbContext dbContext,
        string languageCode,
        CancellationToken cancellationToken)
    {
        var allowed = await dbContext.Languages
            .AsNoTracking()
            .AnyAsync(x => x.Code == languageCode && x.ContentAllowed, cancellationToken)
            .ConfigureAwait(false);

        if (!allowed)
        {
            // FK'ye çarpmadan ÖNCE: fk_experience_translation_language ihlali kullanıcıya
            // 500 olarak düşerdi.
            throw new BadRequestException($"'{languageCode}' dilinde içerik girilemiyor.");
        }
    }

    /// <summary>
    /// KONUŞULAN dil doğrulaması: kod kayıt defterinde olmalı, o kadar.
    ///
    /// <para><b><c>ContentAllowed</c> BURADA ARANMIYOR ve bu bilinçli</b> (docs/I18N.md §3):
    /// o bayrak "host bu dilde METİN girebilir mi" sorusunun cevabı. Bir dilde içerik
    /// girişini kapatmak (ör. moderasyon kapasitemiz yok), host'un o dili konuştuğunu
    /// söylemesini engellememeli — konuşulan dil bir arama ölçütü, bir metin değil.
    /// İki kavramı aynı bayrağa bağlamak, PLAN'ın "karıştırma" uyarısının tam olarak
    /// uyardığı hata olurdu.</para>
    /// </summary>
    internal static async Task RequireKnownLanguagesAsync(
        IAppDbContext dbContext,
        IReadOnlyList<string> languageCodes,
        CancellationToken cancellationToken)
    {
        if (languageCodes.Count == 0)
        {
            return;
        }

        var known = await dbContext.Languages
            .AsNoTracking()
            .Where(x => languageCodes.Contains(x.Code))
            .Select(x => x.Code)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var unknown = languageCodes.Except(known, StringComparer.Ordinal).ToList();

        if (unknown.Count > 0)
        {
            throw new BadRequestException(
                $"Kayıt defterinde olmayan dil kodu: {string.Join(", ", unknown)}.");
        }
    }

    /// <summary>
    /// Yayın kuralının veritabanı gerektiren tek parçası. Kalanı saf
    /// (<see cref="ExperiencePublishRules"/>).
    /// </summary>
    internal static Task<bool> HasOriginalLanguageTranslationAsync(
        IAppDbContext dbContext,
        Experience experience,
        CancellationToken cancellationToken)
        => dbContext.ExperienceTranslations
            .AsNoTracking()
            .AnyAsync(
                x => x.ExperienceId == experience.Id && x.Language == experience.OriginalLanguage,
                cancellationToken);
}
