using MediatR;
using Microsoft.Extensions.Logging;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Application.Features.Experiences.Commands.CreateExperience;

/// <summary>
/// Boş bir taslak açar. <b>Tek alanı var</b> ve bu bilinçli.
///
/// <para><see cref="OriginalLanguage"/> burada isteniyor çünkü DEĞİŞMEZ: fallback
/// zincirinin sonu ve slug'ın kaynağı o (docs/I18N.md §2). Sonradan değiştirilebilseydi
/// zorunlu çeviri satırı bir anda başka bir dile kayar ve yayınlanmış bir ilan kendi
/// doğrulamasını ihlal eder hâle gelirdi. Sonradan değişmeyecek tek alanı en başta
/// sormak, alanı bir daha asla açmamanın en ucuz yolu.</para>
///
/// <para><b>Şehir, kategori, süre, kapasite burada YOK</b>: hepsi
/// <c>PATCH /api/host/experiences/{id}</c>'nin işi. Sihirbaz zaten adım adım ilerliyor
/// ve aynı alanları iki uçta doğrulamak, iki kuralın ayrışmasına açık kapı bırakırdı.</para>
///
/// <para>Host kimliği gövdede YOK (CLAUDE.md #3) — <c>RequireHostId()</c> token'dan okuyor.</para>
/// </summary>
public sealed record CreateExperienceCommand(string OriginalLanguage)
    : IRequest<HostExperienceResponse>;

internal sealed class CreateExperienceCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    ICurrentUser currentUser,
    ILogger<CreateExperienceCommandHandler> logger)
    : IRequestHandler<CreateExperienceCommand, HostExperienceResponse>
{
    public async Task<HostExperienceResponse> Handle(
        CreateExperienceCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Kimlik EN BAŞTA ve istisnası YAKALANMIYOR (CLAUDE.md #1).
        var hostId = currentUser.RequireHostId();

        // Validator biçimi doğruladı; buradaki ikinci geçişin işi KANONİK hâli üretmek —
        // 'en_us' ile 'en-US' aynı dil, normalize edilmezse kayıt defterinde bulunamaz
        // (UpdateProfileCommandHandler ile aynı kalıp).
        if (!LanguageCode.TryNormalize(request.OriginalLanguage, out var originalLanguage))
        {
            throw new BadRequestException("Dil kodu geçersiz.");
        }

        await HostExperienceStore
            .RequireContentLanguageAsync(dbContext, originalLanguage, cancellationToken)
            .ConfigureAwait(false);

        var experience = new Experience
        {
            HostId = hostId,
            OriginalLanguage = originalLanguage,
            Status = ExperienceStatus.Draft,
        };

        dbContext.Experiences.Add(experience);

        // Transaction YOK ve bu bilinçli: tek satır ekleniyor, tek SaveChanges zaten
        // atomik. CLAUDE.md #5'in hedefi "oku-değiştir-yaz" ile korunan invariantlar;
        // burada okunan bir şey yok (UpdateProfileCommandHandler'daki aynı gerekçe).
        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        logger.LogInformation(
            "experience.created experienceId={ExperienceId} hostId={HostId} language={Language}",
            experience.Id, hostId, originalLanguage);

        return await HostExperienceProjection
            .ToResponseAsync(dbContext, storage, experience, cancellationToken)
            .ConfigureAwait(false);
    }
}
