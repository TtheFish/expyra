using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Experiences;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class ExperienceTagConfiguration : IEntityTypeConfiguration<ExperienceTag>
{
    public void Configure(EntityTypeBuilder<ExperienceTag> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("experience_tag");

        // Anahtar KATLANMIŞ hâl: "Vegan" ile "vegan" aynı satır ve tekrarı veritabanı
        // engelliyor, handler'da bir kontrolle değil.
        builder.HasKey(x => new { x.ExperienceId, x.NormalizedTag });

        builder.Property(x => x.ExperienceId)
            .HasColumnName("experience_id");

        builder.Property(x => x.NormalizedTag)
            .HasColumnName("normalized_tag")
            .HasMaxLength(ExperienceTag.MaxNormalizedLength)
            // "C" collation: metin zaten SearchText.Fold'dan geçmiş, dil bazlı sıralama
            // kurallarının uygulanacağı bir şey kalmadı — ve Blok 8 önek taraması yapacaksa
            // düz btree index'i ancak bu collation'da kullanabilir (CityAlias ile aynı karar).
            .UseCollation("C");

        builder.Property(x => x.DisplayTag)
            .HasColumnName("display_tag")
            .HasMaxLength(ExperienceTag.MaxDisplayLength)
            .IsRequired();

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .HasConstraintName("fk_experience_tag_experience")
            // Cascade: etiket deneyimin parçası (CityAlias kalıbı).
            .OnDelete(DeleteBehavior.Cascade);

        // normalized_tag üzerinde AYRI index YOK ve bu bilinçli: bugün etiketi yalnız
        // deneyime göre okuyoruz, o da birincil anahtarın öneki. "Bu etikete sahip
        // deneyimler" sorgusu Blok 8'in işi; index o sorguyla birlikte, ölçülerek atılır
        // (PLAN: sorgusu olmayan index yazma). EF'in FK konvansiyonu da burada ek index
        // üretmiyor — experience_id zaten anahtarın önekinde.
    }
}
