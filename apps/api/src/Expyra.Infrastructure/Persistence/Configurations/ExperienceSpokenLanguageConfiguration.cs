using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class ExperienceSpokenLanguageConfiguration
    : IEntityTypeConfiguration<ExperienceSpokenLanguage>
{
    public void Configure(EntityTypeBuilder<ExperienceSpokenLanguage> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("experience_spoken_language");

        builder.HasKey(x => new { x.ExperienceId, x.Language });

        builder.Property(x => x.ExperienceId)
            .HasColumnName("experience_id");

        builder.Property(x => x.Language)
            .HasColumnName("language")
            .HasMaxLength(LanguageCode.MaxLength);

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .HasConstraintName("fk_experience_spoken_language_experience")
            .OnDelete(DeleteBehavior.Cascade);

        // BU FK, TABLONUN VAR OLMA SEBEBİ. Dizi sütunu (text[]) seçilseydi buraya kısıt
        // konamazdı ve "eng" gibi tipolu bir kod sessizce kabul edilirdi; Blok 8'in
        // "İngilizce konuşulan" filtresi o ilanı sonuçtan eler, hiçbir yerde hata
        // patlamaz, ilan yalnızca görünmez olurdu (PLAN Blok 5).
        builder.HasOne<Language>()
            .WithMany()
            .HasForeignKey(x => x.Language)
            .HasPrincipalKey(x => x.Code)
            .HasConstraintName("fk_experience_spoken_language_language")
            .OnDelete(DeleteBehavior.Restrict);

        // Blok 8'in "şu dili konuşan deneyimler" filtresi tam olarak bu index'i isteyecek.
        // Bugün onu yazan bir sorgu YOK — index yine de burada çünkü EF'in FK konvansiyonu
        // onu zaten üretiyor (language, bileşik anahtarın önekinde değil); elle yazmanın
        // tek kazancı snake_case adı.
        builder.HasIndex(x => x.Language)
            .HasDatabaseName("ix_experience_spoken_language_language");
    }
}
