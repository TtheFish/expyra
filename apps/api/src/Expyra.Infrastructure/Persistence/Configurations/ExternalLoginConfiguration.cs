using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Identity;
using Expyra.Domain.Users;

namespace Expyra.Infrastructure.Persistence.Configurations;

/// <summary>
/// Tablo Faz 1'de kuruluyor, kodu Faz 1.9'da yazılıyor: Apple gerçek e-postayı yalnız
/// İLK yetkilendirmede döndürüyor, dolayısıyla eşleşmeyi sonradan geriye dönük kurmak
/// mümkün değil.
/// </summary>
internal sealed class ExternalLoginConfiguration : IEntityTypeConfiguration<ExternalLogin>
{
    public void Configure(EntityTypeBuilder<ExternalLogin> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("external_login");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        // "google" | "apple". Language'ın aksine tabloya taşınmıyor: her sağlayıcı kod ister.
        builder.Property(x => x.Provider)
            .HasColumnName("provider")
            .HasMaxLength(32)
            .IsRequired();

        // Sağlayıcının 'sub' değeri. Google 21, Apple ~44 karakter; 128 rahat üst sınır.
        builder.Property(x => x.ProviderKey)
            .HasColumnName("provider_key")
            .HasMaxLength(128)
            .IsRequired();

        builder.Property(x => x.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        // Yalnız bilgi amaçlı; ASLA eşleştirme anahtarı değil — bu yüzden index de yok.
        builder.Property(x => x.ProviderEmail)
            .HasColumnName("provider_email")
            .HasMaxLength(EmailAddress.MaxLength);

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        builder.HasIndex(x => new { x.Provider, x.ProviderKey })
            .IsUnique()
            .HasDatabaseName("ux_external_login_provider_key");

        builder.HasIndex(x => x.UserId)
            .HasDatabaseName("ix_external_login_user");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_external_login_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
