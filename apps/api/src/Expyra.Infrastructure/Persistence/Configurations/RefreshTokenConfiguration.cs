using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Identity;
using Expyra.Domain.Users;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("refresh_token");

        builder.HasKey(x => x.Id);

        // İlk token'da FamilyId = Id; ikisi de INSERT'ten önce biliniyor olmak zorunda.
        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(x => x.TokenHash)
            .HasColumnName("token_hash")
            .HasColumnType("bytea")
            .IsRequired();

        builder.Property(x => x.FamilyId)
            .HasColumnName("family_id")
            .IsRequired();

        builder.Property(x => x.PreviousTokenId)
            .HasColumnName("previous_token_id");

        builder.Property(x => x.SuccessorTokenId)
            .HasColumnName("successor_token_id");

        builder.Property(x => x.ExpiresAtUtc)
            .HasColumnName("expires_at_utc")
            .IsRequired();

        builder.Property(x => x.AbsoluteExpiresAtUtc)
            .HasColumnName("absolute_expires_at_utc")
            .IsRequired();

        builder.Property(x => x.RevokedAtUtc)
            .HasColumnName("revoked_at_utc");

        builder.Property(x => x.RevocationReason)
            .HasColumnName("revocation_reason")
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.CreatedByIp)
            .HasColumnName("created_by_ip")
            .HasColumnType("inet");

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        // Her yenilemede kullanılan lookup.
        builder.HasIndex(x => x.TokenHash)
            .IsUnique()
            .HasDatabaseName("ux_refresh_token_hash");

        // Steady-state'te aile içindeki satırların neredeyse hepsi Rotated; filtre
        // index'i gerçekten küçültüyor.
        builder.HasIndex(x => x.FamilyId)
            .HasDatabaseName("ix_refresh_token_family")
            .HasFilter("revoked_at_utc IS NULL");

        builder.HasIndex(x => x.UserId)
            .HasDatabaseName("ix_refresh_token_user");

        builder.HasIndex(x => x.ExpiresAtUtc)
            .HasDatabaseName("ix_refresh_token_expires_at");

        // previous_token_id ve successor_token_id'ye FK YOK: temizlik eski satırı silince sarkması serbest,
        // forensik işaretçi — bütünlük kısıtı değil.
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .HasConstraintName("fk_refresh_token_user")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
