using MediatR;
using Microsoft.EntityFrameworkCore;
using Expyra.Application.Common.Exceptions;
using Expyra.Application.Common.Interfaces;
using Expyra.Application.Features.Media;
using Expyra.Domain.Experiences;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Experiences.Commands.CreateMediaUpload;

/// <summary>
/// Görsel yüklemek için imzalı adres üretir. <b>Bayt bu uçtan geçmiyor</b>
/// (PLAN Blok 6 kabul kriteri 1) — tarayıcı dönen adrese doğrudan PUT ediyor.
///
/// <para><b>Neden satır ŞİMDİ açılıyor:</b> adres verildiği anda depoda bir nesne
/// belirebilir. Kayıt yalnız <c>POST .../media</c> adımında açılsaydı, yüklemesini
/// yarıda bırakan her host geride veritabanının hiç bilmediği bir nesne bırakırdı
/// ve onları bulmanın tek yolu tüm kovayı taramak olurdu.
/// <see cref="MediaStatus.Pending"/> satırı temizliğin veritabanından yürümesini
/// sağlıyor.</para>
///
/// <para><b>Neden boyut istemciden alınıyor:</b> imzalanan tavanı daraltmak için.
/// İstemci "2 MB" derse 3 MB'lık bir gövde depo tarafından reddediliyor. Beyan
/// güvenilir değil ama beyanın KENDİSİ bir üst sınır olduğu için yalan söylemek
/// saldırganın işine yaramıyor: tavan zaten <see cref="MediaRules.MaxByteSize"/> ile
/// sınırlı.</para>
/// </summary>
public sealed record CreateMediaUploadCommand(
    Guid ExperienceId,
    string ContentType,
    long ByteSize) : IRequest<MediaUploadResponse>;

/// <param name="MediaId">
/// Kayıt adımında geri gönderilecek kimlik. İstemci yükleme ile kayıt arasında
/// bunu kendi belleğinde tutuyor — yanıtta <c>Pending</c> satır dönmediği için
/// (bkz. <c>HostExperienceResponse.Media</c>) tek bağ bu.
/// </param>
/// <param name="Headers">
/// PUT isteğinde AYNEN gönderilmesi gereken başlıklar. İmza bunların üzerine
/// kurulu; eksik gönderilirse depo reddediyor.
/// </param>
public sealed record MediaUploadResponse(
    Guid MediaId,
    Uri UploadUrl,
    string Method,
    IReadOnlyDictionary<string, string> Headers,
    DateTimeOffset ExpiresAtUtc);

internal sealed class CreateMediaUploadCommandHandler(
    IAppDbContext dbContext,
    IObjectStorage storage,
    IDateTimeProvider clock,
    ICurrentUser currentUser)
    : IRequestHandler<CreateMediaUploadCommand, MediaUploadResponse>
{
    public async Task<MediaUploadResponse> Handle(
        CreateMediaUploadCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        var hostId = currentUser.RequireHostId();

        // Satır kilidi GEREKMİYOR: burada ilanın hiçbir alanı değişmiyor, yalnız
        // sahiplik doğrulanıyor. Kilit almak, yükleme ekranını açan her host'un
        // ilan satırını gereksizce kilitlemesi olurdu.
        var experience = await dbContext.Experiences
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.ExperienceId, cancellationToken)
            .ConfigureAwait(false);

        // Başkasının ilanı 404 — enumeration (LoadOwnedForUpdateAsync sınıf notu).
        if (experience is null || experience.HostId != hostId)
        {
            throw new NotFoundException("Deneyim bulunamadı.");
        }

        // TAZE Pending satırlar da sayılıyor: sayılmasaydı, yüklemeyi hiç bitirmeyen
        // bir istemci sınırsız sayıda imzalı adres alarak tavanı boşa çıkarabilirdi.
        //
        // Ama ÖLÜ olanlar sayılmıyor. İmzalı adresin ömrü dolduğunda o satır artık
        // hiçbir zaman Active olamaz — nesne yüklense bile onay ucu imzayı reddeder.
        // Hepsini saymak, yarıda kalan her yüklemenin 12'lik hakkı KALICI yemesi
        // demekti: on iki kopan yüklemeden sonra host kapak yükleyemez ve kapak
        // yayın koşulu olduğu için ilanı hiç yayınlayamazdı. Kota böylece kendi
        // kendini onarıyor; satırların silinmesi hâlâ Blok 10'un temizleyicisinde.
        var staleBefore = clock.UtcNow - MediaRules.UploadLifetime;

        var existing = await dbContext.ExperienceMedia
            .CountAsync(
                x => x.ExperienceId == experience.Id
                    && (x.Status == MediaStatus.Active || x.CreatedAtUtc > staleBefore),
                cancellationToken)
            .ConfigureAwait(false);

        if (existing >= MediaRules.MaxPerExperience)
        {
            throw new ConflictException(
                $"Bir deneyimde en fazla {MediaRules.MaxPerExperience} görsel olabilir.",
                MediaConflict.LimitReached);
        }

        var contentType = MediaRules.NormalizeContentType(request.ContentType)
            ?? throw new InvalidOperationException(
                "İçerik tipi doğrulayıcıdan geçtikten sonra normalize edilemedi.");

        var mediaId = Guid.CreateVersion7();
        var key = MediaRules.ExperienceKey(
            experience.Id, mediaId, MediaRules.ExtensionOfContentType(contentType));

        var media = new ExperienceMedia
        {
            Id = mediaId,
            ExperienceId = experience.Id,
            StorageKey = key,
            ContentType = contentType,
            ByteSize = request.ByteSize,
            Status = MediaStatus.Pending,
        };

        dbContext.ExperienceMedia.Add(media);

        // Satır imzalı adresten ÖNCE yazılıyor: ters sırada, kayıt yazılamadan
        // düşen bir süreç geride izlenemeyen bir yükleme izni bırakırdı.
        await dbContext.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var upload = await storage
            .CreateUploadAsync(
                new PresignedUploadRequest(
                    key, contentType, request.ByteSize, MediaRules.UploadLifetime),
                cancellationToken)
            .ConfigureAwait(false);

        return new MediaUploadResponse(
            mediaId, upload.Url, upload.Method, upload.RequiredHeaders, upload.ExpiresAtUtc);
    }
}
