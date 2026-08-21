using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class ExperienceTranslationConfiguration : IEntityTypeConfiguration<ExperienceTranslation>
{
    public void Configure(EntityTypeBuilder<ExperienceTranslation> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("experience_translation");

        // Bileşik doğal anahtar (docs/I18N.md §2): aynı deneyim + aynı dil iki kez giremez.
        // Surrogate Id verilseydi tekrarı ayrıca bir unique index ile engellemek gerekirdi —
        // aynı garantiyi bir sütun daha ödeyerek almak (CityAlias ile aynı karar).
        //
        // BEDELİ: AppDbContext.FindForUpdateAsync bu tiple ÇALIŞMAZ (tek sütunlu PK şartı).
        // Çeviri satırında oku-değiştir-yaz gerektiğinde kilit experience satırında alınır.
        builder.HasKey(x => new { x.ExperienceId, x.Language });

        builder.Property(x => x.ExperienceId)
            .HasColumnName("experience_id");

        builder.Property(x => x.Language)
            .HasColumnName("language")
            .HasMaxLength(LanguageCode.MaxLength);

        builder.Property(x => x.Title)
            .HasColumnName("title")
            .HasMaxLength(ExperienceTranslation.MaxTitleLength)
            .IsRequired();

        builder.Property(x => x.Description)
            .HasColumnName("description")
            .HasMaxLength(ExperienceTranslation.MaxDescriptionLength);

        builder.Property(x => x.Source)
            .HasColumnName("source")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(TranslationSource.HostWritten)
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc")
            .IsRequired();

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .HasConstraintName("fk_experience_translation_experience")
            // Cascade: çeviri deneyimin parçası, tek başına anlamı yok (CityAlias kalıbı).
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Language>()
            .WithMany()
            .HasForeignKey(x => x.Language)
            .HasPrincipalKey(x => x.Code)
            .HasConstraintName("fk_experience_translation_language")
            // Restrict: bir dili kayıt defterinden silmek, o dildeki tüm ilan metinlerini
            // götürürdü. Dil kapatmanın yolu silmek değil, ContentAllowed = false.
            .OnDelete(DeleteBehavior.Restrict);

        // language sütunundaki index'i EF'in FK konvansiyonu üretiyor: birincil anahtar
        // (experience_id, language) sırasında language ÖNEKTE değil, dolayısıyla
        // konvansiyon kendi index'ini ekliyor. Adı burada veriliyor ki şemada EF biçimi
        // ("IX_experience_translation_language") görünmesin.
        //
        // Deneyime göre okuma (fallback zinciri, Blok 5b) birincil anahtarın önekini
        // kullanıyor; ek bir index gerekmiyor. Dil bazlı full-text index'ler (I18N §4)
        // arama bloğunun işi — sorgusu yokken atılan index yalnız yazmayı pahalılaştırır.
        builder.HasIndex(x => x.Language)
            .HasDatabaseName("ix_experience_translation_language");
    }
}
