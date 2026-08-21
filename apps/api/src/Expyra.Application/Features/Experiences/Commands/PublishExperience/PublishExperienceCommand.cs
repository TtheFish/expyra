using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;

namespace Expyra.Application.Features.Experiences.Commands.PublishExperience;

/// <summary>
/// Taslağı (ya da arşivlenmiş bir ilanı) yayına alır.
///
/// <para><b>Eksik ilan için 409, 400 DEĞİL.</b> Gerekçe: isteğin kendisinde yanlış bir
/// şey yok — gövdesi bile yok. Başarısız olan şey KAYNAĞIN DURUMU: taslak Draft→Published
/// geçişini yapacak kadar tamam değil. 400 "isteğini düzelt" demek ve istemci bu isteği
/// düzeltemez; önce kaynağı düzeltmesi gerekiyor. RFC 9110'un 409 tanımı ("hedef kaynağın
/// mevcut durumuyla çakışma") tam olarak bu durum, ve depodaki <c>ConflictException</c>
/// zaten "iş kuralı çakışması" diye tanımlı. Alan bazlı 400'ler
/// <c>ValidationProblemDetails</c> üretiyor; buradaki hata bir alanın biçimi değil.</para>
///
/// <para><b>İDEMPOTENT:</b> yayındaki ilana ikinci kez yayınla demek 200 döner, çakışma
/// değil — arayüzdeki çift tıklama hata ekranı üretmemeli (<c>ActivateHostCommand</c>
/// ile aynı karar).</para>
///
/// <para><b>Arşivden geri dönüş serbest.</b> Arşiv bir silme değil, "şu an raftan indir";
/// tek yön yapılsaydı yazın kapanan bir host, sonbaharda ilanı sıfırdan yazmak zorunda
/// kalırdı. Yayın koşulları bu yolda da AYNEN çalışıyor.</para>
/// </summary>
public sealed record PublishExperienceCommand(Guid ExperienceId) : IRequest<HostExperienceResponse>;

internal sealed class PublishExperienceCommandHandler(
    IAppDbContext dbContext,
    ICurrentUser currentUser,
    IDateTimeProvider clock,
    ILogger<PublishExperienceCommandHandler> logger)
    : IRequestHandler<PublishExperienceCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        PublishExperienceCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        // Durum sütununda oku-değiştir-yaz var: transaction + satır kilidi (CLAUDE.md #5).
        // Kilitsiz hâlde eşzamanlı publish/archive çifti, arşivlemenin üzerine yayını
        // yazabilir ve host ilanı indirdiğini sanırken ilan yayında kalırdı.
        await using var transaction = await dbContext
            .BeginTransactionAsync(cancellationToken).ConfigureAwait(false);

        var experience = await HostExperienceStore
            .LoadOwnedForUpdateAsync(dbContext, request.ExperienceId, hostId, cancellationToken)
            .ConfigureAwait(false);

        if (experience.Status != ExperienceStatus.Published)
        {
            await PublishAsync(experience, cancellationToken).ConfigureAwait(false);
        }

        // Zaten yayında olan yolda da COMMIT ediliyor: yazılacak bir şey yok ama satır
        // kilidini burada bırakmak gerekiyor (ActivateHostCommandHandler ile aynı kalıp).
        await transaction.CommitAsync(cancellationToken).ConfigureAwait(false);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, experience, cancellationToken)
            .ConfigureAwait(false);
    }

    private async Task PublishAsync(Experience experience, CancellationToken cancellationToken)
    {
        // Tek sorgu iki soruyu birden cevaplıyor: "orijinal dilde çeviri var mı" ve
        // "slug hangi başlıktan türeyecek". Title sütunu NOT NULL olduğu için sonucun
        // null olması yalnızca satırın olmadığı anlamına gelir.
        var originalTitle = await dbContext.ExperienceTranslations
            .AsNoTracking()
            .Where(x => x.ExperienceId == experience.Id && x.Language == experience.OriginalLanguage)
            .Select(x => x.Title)
            .FirstOrDefaultAsync(cancellationToken)
            .ConfigureAwait(false);

        // PLAN Blok 5 kabul kriteri 1. Kural Domain'de ve saf: host listesindeki
        // "eksikler" rozeti de aynı fonksiyondan geçiyor, yani arayüzün gösterdiği
        // eksikler ile sunucunun reddettiği eksikler ayrışamıyor.
        var missing = ExperiencePublishRules.Missing(experience, originalTitle is not null);

        if (missing.Count > 0)
        {
            logger.LogInformation(
                "experience.publish.rejected experienceId={ExperienceId} missing={Missing}",
                experience.Id, string.Join(",", missing));

            // Taslak DEĞİŞMEDEN kalıyor: transaction commit edilmiyor (using kapsamı
            // rollback ediyor) ve durum hâlâ Draft.
            throw new ConflictException(
                $"Deneyim yayınlanamaz, eksik alanlar: {string.Join(", ", missing)}.");
        }

        // Savunma amaçlı: normal akışta slug orijinal dildeki çeviri yazılırken üretiliyor.
        // Bu satır, o adımı atlayan bir yol açılırsa slug'sız (yani misafirin URL'inden
        // ulaşılamayan) bir ilanın yayına çıkmasını engelliyor.
        await HostExperienceStore
            .EnsureSlugAsync(dbContext, experience, originalTitle!, cancellationToken)
            .ConfigureAwait(false);

        experience.Status = ExperienceStatus.Published;

        // İLK yayın anı korunuyor: yeniden yayınlamak bu damgayı tazelemez. Şehir kilidi
        // ve "yeni eklenenler" sıralaması buna dayanıyor (Experience.PublishedAtUtc).
        experience.PublishedAtUtc ??= clock.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "experience.published experienceId={ExperienceId} slug={Slug}",
            experience.Id, experience.Slug);
    }
}
