using MediatR;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Users.Commands.CreateAvatarUpload;

/// <summary>
/// Profil fotoğrafı için imzalı adres üretir.
///
/// <para><b>Neden ilan görsellerindeki gibi bir <c>Pending</c> satır yok:</b> avatarın
/// kendi tablosu yok, tek bir sütun (<c>app_user.avatar_key</c>) ve o sütun ancak
/// doğrulama bittiğinde yazılıyor. Ara durumu tutacak bir yer olmaması bir eksiklik
/// değil: kullanıcı başına en fazla bir yetim nesne doğabiliyor ve anahtar kullanıcı
/// kimliğiyle öneklendiği için temizlik komutu onu kullanıcıdan yürüyerek bulabiliyor.
/// İlan görsellerinde durum farklıydı — orada yetim sayısı sınırsızdı.</para>
///
/// <para>Anahtar her yüklemede YENİ: sabit bir ada (<c>avatar.jpg</c>) yazılsaydı CDN
/// önbelleği geçersizleşmez ve kullanıcı fotoğrafını değiştirdikten sonra günlerce
/// eskisini görürdü.</para>
/// </summary>
public sealed record CreateAvatarUploadCommand(string ContentType, long ByteSize)
    : IRequest<AvatarUploadResponse>;

/// <param name="StorageKey">
/// Onay adımında geri gönderilecek anahtar. İstemciye açık olması bir sorun değil:
/// anahtarın kullanıcı kimliğiyle başladığı sunucu tarafında doğrulanıyor, yani
/// başkasının anahtarı gönderilemiyor.
/// </param>
public sealed record AvatarUploadResponse(
    string StorageKey,
    Uri UploadUrl,
    string Method,
    IReadOnlyDictionary<string, string> Headers,
    DateTimeOffset ExpiresAtUtc);

internal sealed class CreateAvatarUploadCommandHandler(
    IObjectStorage storage,
    ICurrentUser currentUser)
    : IRequestHandler<CreateAvatarUploadCommand, AvatarUploadResponse>
{
    public async Task<AvatarUploadResponse> Handle(
        CreateAvatarUploadCommand request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);

        // Kimlik token'dan; istemciden kullanıcı kimliği ALINMIYOR (CLAUDE.md #3).
        var userId = currentUser.RequireUserId();

        var key = MediaRules.AvatarKey(
            userId,
            Guid.CreateVersion7(),
            MediaRules.ExtensionOfContentType(request.ContentType));

        var upload = await storage
            .CreateUploadAsync(
                new PresignedUploadRequest(
                    key, request.ContentType, request.ByteSize, MediaRules.UploadLifetime),
                cancellationToken)
            .ConfigureAwait(false);

        return new AvatarUploadResponse(
            key, upload.Url, upload.Method, upload.RequiredHeaders, upload.ExpiresAtUtc);
    }
}
