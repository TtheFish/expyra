using MediatR;
using Expyra.Application.Common.Interfaces;
using Expyra.Domain.Media;

namespace Expyra.Application.Features.Users.Commands.CreateAvatarUpload;

/// <summary>
/// Profil fotoğrafı için imzalı adres üretir.
///
/// <para><b>Neden ilan görsellerindeki gibi bir <c>Pending</c> satır yok:</b> avatarın
/// kendi tablosu yok, tek bir sütun (<c>app_user.avatar_key</c>) ve o sütun ancak
/// doğrulama bittiğinde yazılıyor.</para>
///
/// <para><b>Bedeli:</b> yarıda bırakılan her yükleme bir yetim nesne bırakıyor ve
/// anahtar her seferinde yeni olduğu için sayı SINIRSIZ — bu notun önceki hâli
/// "kullanıcı başına en fazla bir yetim" diyordu ve iki paragraf aşağıdaki
/// "anahtar her yüklemede YENİ" cümlesiyle çelişiyordu. İlan görsellerinden farkı
/// yetimin sayısı değil, KOTAYI YEMEMESİ: avatarın tavanı yok, dolayısıyla sızıntı
/// kullanıcıyı kilitlemiyor. Temizlik <c>avatars/{userId}/</c> ön ekinden yürüyor
/// ve zamanlayıcıyı bekliyor (Blok 10).</para>
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

        // İmza YÜKLEME anahtarına (issue #50): profilde görünecek anahtara hiçbir zaman
        // imzalı adres verilmiyor, onay adımı oraya yeniden kodlanmış kopyayı yazıyor.
        var key = MediaRules.UploadKeyOf(MediaRules.AvatarKey(
            userId,
            Guid.CreateVersion7(),
            MediaRules.ExtensionOfContentType(request.ContentType)));

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
