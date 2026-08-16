using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Identity;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class LoginCodeConfiguration : IEntityTypeConfiguration<LoginCode>
{
    public void Configure(EntityTypeBuilder<LoginCode> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("login_code");

        builder.HasKey(x => x.Id);

        // Id hash'in tuzu: HMAC girdisi "{Id:N}:{code}". Değer handler'da üretilip
        // hash'lendiği için DB'nin üretmesi söz konusu bile değil.
        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.NormalizedEmail)
            .HasColumnName("normalized_email")
            .HasMaxLength(EmailAddress.MaxLength)
            .IsRequired();

        builder.Property(x => x.EmailDisplay)
            .HasColumnName("email_display")
            .HasMaxLength(EmailAddress.MaxLength)
            .IsRequired();

        builder.Property(x => x.CodeHash)
            .HasColumnName("code_hash")
            .HasColumnType("bytea")
            .IsRequired();

        builder.Property(x => x.ClosedAtUtc)
            .HasColumnName("closed_at_utc");

        builder.Property(x => x.AttemptCount)
            .HasColumnName("attempt_count")
            .IsRequired();

        builder.Property(x => x.ExpiresAtUtc)
            .HasColumnName("expires_at_utc")
            .IsRequired();

        builder.Property(x => x.Language)
            .HasColumnName("language")
            .HasMaxLength(LanguageCode.MaxLength);

        // IPv6'da /64'e maskelenmiş geliyor; inet tipi maskeyi de saklayabilir ama
        // biz adresi saklıyoruz — sorgular eşitlikle çalışıyor.
        builder.Property(x => x.RequestIp)
            .HasColumnName("request_ip")
            .HasColumnType("inet");

        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(LoginCodeStatus.Pending)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        // TEK geçerli kod değişmezi. Advisory lock varken ASLA tetiklenmemeli;
        // tetiklenirse bir hata var ve 500 olarak görünür ("sistem bozuksa bozuk görünsün").
        builder.HasIndex(x => x.NormalizedEmail)
            .IsUnique()
            .HasDatabaseName("ux_login_code_pending")
            .HasFilter("status = 'Pending'");

        // Hız sınırı sayaçları buradan okunuyor — ayrı throttle tablosu YOK.
        // Bu index kısmi DEĞİL: filtre koyulursa sayaç sorgusu index'ten mahrum kalır.
        builder.HasIndex(x => new { x.NormalizedEmail, x.CreatedAtUtc })
            .HasDatabaseName("ix_login_code_email_created");

        builder.HasIndex(x => new { x.RequestIp, x.CreatedAtUtc })
            .HasDatabaseName("ix_login_code_ip_created");

        builder.HasIndex(x => x.ExpiresAtUtc)
            .HasDatabaseName("ix_login_code_expires_at");

        builder.HasOne<Language>()
            .WithMany()
            .HasForeignKey(x => x.Language)
            .HasPrincipalKey(x => x.Code)
            .HasConstraintName("fk_login_code_language")
            .OnDelete(DeleteBehavior.Restrict);

        // user_id'ye FK YOK — kod, kullanıcı satırından ÖNCE var olabiliyor.
        // code_hash'e index YOK — satır daima id ile çekilir; "WHERE code_hash = @h"
        // yazılırsa kod tüm hesaplar için global arama anahtarına döner.
    }
}
