using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // "user" Postgres'te ayrılmış kelime: EF tırnaklar ama psql'de elle yazılan
        // her SELECT patlar.
        builder.ToTable("app_user");

        builder.HasKey(x => x.Id);

        // Id'yi BaseEntity üretiyor (Guid v7). ValueGeneratedNever olmazsa EF anahtarı
        // "store generated" sayar; handler'lar SaveChanges'ten ÖNCE user.Id'yi okuyup
        // refresh_token satırına yazıyor — geçici değer yazılırsa FK yanlış olur.
        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.Email)
            .HasColumnName("email")
            .HasMaxLength(EmailAddress.MaxLength)
            .IsRequired();

        builder.Property(x => x.NormalizedEmail)
            .HasColumnName("normalized_email")
            .HasMaxLength(EmailAddress.MaxLength)
            .IsRequired();

        builder.Property(x => x.EmailVerifiedAtUtc)
            .HasColumnName("email_verified_at_utc");

        builder.Property(x => x.DisplayName)
            .HasColumnName("display_name")
            .HasMaxLength(80);

        builder.Property(x => x.LastLoginAtUtc)
            .HasColumnName("last_login_at_utc");

        builder.Property(x => x.PreferredLanguage)
            .HasColumnName("preferred_language")
            .HasMaxLength(LanguageCode.MaxLength);

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        // Enum METİN olarak: psql'de okunur ve enum yeniden sıralanırsa eski satırlar
        // sessizce başka anlama gelmez.
        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(UserStatus.Active)
            .IsRequired();

        // Sistemin en sıcak lookup'ı. Banlı satır SİLİNMEDİĞİ için bu index aynı
        // adresin ikinci kez kayıt olmasını da engelliyor (VISION §9).
        builder.HasIndex(x => x.NormalizedEmail)
            .IsUnique()
            .HasDatabaseName("ux_app_user_normalized_email");

        builder.HasIndex(x => x.PreferredLanguage)
            .HasDatabaseName("ix_app_user_preferred_language");

        // Navigation property YOK (Language'da da yok): Domain nesne grafiği taşımıyor,
        // her sorgu açık join. Kazara eager/lazy sürprizi olmuyor.
        builder.HasOne<Language>()
            .WithMany()
            .HasForeignKey(x => x.PreferredLanguage)
            .HasPrincipalKey(x => x.Code)
            .HasConstraintName("fk_app_user_preferred_language")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
