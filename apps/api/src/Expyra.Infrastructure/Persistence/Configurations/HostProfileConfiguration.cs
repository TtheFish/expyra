using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Languages;
using Expyra.Domain.Users;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class HostProfileConfiguration : IEntityTypeConfiguration<HostProfile>
{
    public void Configure(EntityTypeBuilder<HostProfile> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("host_profile");

        builder.HasKey(x => x.UserId);

        builder.Property(x => x.UserId)
            .HasColumnName("user_id")
            .ValueGeneratedNever();

        builder.Property(x => x.Headline)
            .HasColumnName("headline")
            .HasMaxLength(HostProfile.MaxHeadlineLength);

        builder.Property(x => x.Bio)
            .HasColumnName("bio")
            .HasMaxLength(HostProfile.MaxBioLength);

        builder.Property(x => x.Language)
            .HasColumnName("language")
            .HasMaxLength(LanguageCode.MaxLength)
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc")
            .IsRequired();

        // Kullanıcı silinirse profili de gider: içerik sahibinden bağımsız yaşayamaz.
        builder.HasOne<User>()
            .WithOne()
            .HasForeignKey<HostProfile>(x => x.UserId)
            .HasConstraintName("fk_host_profile_user")
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Language>()
            .WithMany()
            .HasForeignKey(x => x.Language)
            .HasPrincipalKey(x => x.Code)
            .HasConstraintName("fk_host_profile_language")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Language)
            .HasDatabaseName("ix_host_profile_language");
    }
}
