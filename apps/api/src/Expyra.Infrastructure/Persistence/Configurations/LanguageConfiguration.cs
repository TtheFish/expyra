using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Languages;
using Expyra.Infrastructure.Persistence.Seed;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class LanguageConfiguration : IEntityTypeConfiguration<Language>
{
    public void Configure(EntityTypeBuilder<Language> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("language");

        builder.HasKey(x => x.Code);

        builder.Property(x => x.Code)
            .HasColumnName("code")
            .HasMaxLength(LanguageCode.MaxLength)
            .IsRequired();

        builder.Property(x => x.NativeName)
            .HasColumnName("native_name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.EnglishName)
            .HasColumnName("english_name")
            .HasMaxLength(100)
            .IsRequired();

        // Postgres text search konfigürasyon adı ("german", "turkish"). null = yerleşik yok.
        builder.Property(x => x.SearchConfig)
            .HasColumnName("search_config")
            .HasMaxLength(50);

        builder.Property(x => x.IsRightToLeft)
            .HasColumnName("is_right_to_left")
            .HasDefaultValue(false);

        builder.Property(x => x.UiAvailable)
            .HasColumnName("ui_available")
            .HasDefaultValue(false);

        builder.Property(x => x.ContentAllowed)
            .HasColumnName("content_allowed")
            .HasDefaultValue(true);

        // Dil seçici her sayfada çiziliyor ve 49 satırın 2'sini istiyor —
        // kısmi index tam tarama yapmasın diye.
        builder.HasIndex(x => x.UiAvailable)
            .HasDatabaseName("ix_language_ui_available")
            .HasFilter("ui_available");

        builder.HasData(LanguageSeedData.Rows());
    }
}
