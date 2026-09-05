using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences;

/// <summary>
/// Çeviri satırına bağlı ek metinlerin (bilmen gerekenler, buluşma yönergesi,
/// program) ortak kuralları.
///
/// <para><b>Satır yoksa metin yazılmaz.</b> Çeviri satırı başlık taşımak zorunda
/// (<c>title</c> NOT NULL); "yanında getir" için başlıksız bir satır açmak, o dilde
/// başlığı olmayan ama yönergesi olan bir ilan üretirdi — misafir tarafı bunu
/// tutarlı gösteremez. Bu yüzden 409 <c>translation-missing</c>: host'a "önce bu
/// dilde başlığı yaz" deniyor, arayüz kodu bir cümleye eşliyor.</para>
/// </summary>
internal static class TranslationText
{
    /// <summary>
    /// Telde camelCase METİN (CLAUDE.md #8), enum değil: <c>"moderate"</c>. Tek
    /// kelimeli değerlerde küçük harf ile camelCase aynı (<c>ScheduleFormat.Name</c>
    /// notu).
    /// </summary>
    internal static string? ActivityLevelName(ActivityLevel? value)
        => value?.ToString().ToLowerInvariant();

    internal const string TranslationMissing = "translation-missing";

    internal static readonly string DetailTooLong = string.Create(
        CultureInfo.InvariantCulture,
        $"Metin en fazla {ExperienceTranslation.MaxDetailLength} karakter olabilir.");

    internal static string? Clean(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    internal static bool FitsDetail(string? value)
        => value is null || value.Trim().Length <= ExperienceTranslation.MaxDetailLength;

    /// <summary>
    /// Dilin çeviri satırını (izlenen) getirir. Satır yoksa: metin yazılacaksa 409,
    /// yazılmayacaksa null — yalnız skaler güncelleyen bir istek satır olmadan da
    /// geçerli.
    /// </summary>
    internal static async Task<ExperienceTranslation?> RequireForWriteAsync(
        IAppDbContext dbContext,
        Experience experience,
        string language,
        bool hasText,
        CancellationToken cancellationToken)
    {
        var translation = await dbContext.ExperienceTranslations
            .FirstOrDefaultAsync(
                x => x.ExperienceId == experience.Id && x.Language == language,
                cancellationToken)
            .ConfigureAwait(false);

        if (translation is null && hasText)
        {
            throw new ConflictException(
                $"'{language}' dilinde önce başlık yazılmalı.",
                TranslationMissing);
        }

        return translation;
    }
}
