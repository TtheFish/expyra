using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Catalog;
using Expyra.Domain.Experiences;
using Expyra.Domain.Languages;
using Expyra.Domain.Places;
using Expyra.Domain.Users;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class ExperienceConfiguration : IEntityTypeConfiguration<Experience>
{
    public void Configure(EntityTypeBuilder<Experience> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable(
            "experience",
            table => table.HasCheckConstraint(
                "ck_experience_time_zone_requires_city",
                // Saat dilimi ŞEHİRDEN türüyor: ikisinin birlikte dolu ya da birlikte boş
                // olması bir kod disiplini değil, veritabanı değişmezi olmalı. Aksi halde
                // şehri temizleyen bir hata, geride ait olduğu yeri bilinmeyen bir saat
                // dilimi bırakır ve Blok 7 onun üzerinden seans üretir.
                "(city_id IS NULL) = (time_zone_id IS NULL)"));

        builder.HasKey(x => x.Id);

        // Id'yi BaseEntity üretiyor (Guid v7). ValueGeneratedNever olmazsa EF anahtarı
        // "store generated" sayar; handler'lar SaveChanges'ten ÖNCE Id'yi okuyup çeviri,
        // konuşulan dil ve etiket satırlarına yazıyor (UserConfiguration aynı gerekçe).
        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.HostId)
            .HasColumnName("host_id")
            .IsRequired();

        builder.Property(x => x.CityId)
            .HasColumnName("city_id");

        builder.Property(x => x.CategorySlug)
            .HasColumnName("category_slug")
            .HasMaxLength(Category.MaxSlugLength);

        builder.Property(x => x.TimeZoneId)
            .HasColumnName("time_zone_id")
            .HasMaxLength(City.MaxTimeZoneIdLength);

        builder.Property(x => x.DurationMinutes)
            .HasColumnName("duration_minutes")
            .IsRequired();

        builder.Property(x => x.Capacity)
            .HasColumnName("capacity")
            .IsRequired();

        // Varsayılan true — güvenli taraf. Yanlış false bir teknede kapasitenin
        // üstünde yolcu demek; yanlış true yalnız birkaç boş koltuk.
        builder.Property(x => x.InfantCountsTowardCapacity)
            .HasColumnName("infant_counts_toward_capacity")
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(x => x.OriginalLanguage)
            .HasColumnName("original_language")
            .HasMaxLength(LanguageCode.MaxLength)
            .IsRequired();

        // Enum METİN olarak (app_user.status ile aynı tercih): psql'de okunur ve enum
        // yeniden sıralanırsa eski satırlar sessizce başka anlama gelmez.
        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(ExperienceStatus.Draft)
            .IsRequired();

        builder.Property(x => x.Slug)
            .HasColumnName("slug")
            .HasMaxLength(Experience.MaxSlugLength)
            // Slug katlanmış ASCII: "C" collation hem doğru karşılaştırma hem de
            // byte sırası demek (city.slug ile aynı karar, bkz. SearchText).
            .UseCollation("C");

        builder.Property(x => x.PublishedAtUtc)
            .HasColumnName("published_at_utc");

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        // BENZERSİZLİĞİN GERÇEK GARANTİSİ BU INDEX. ExperienceSlug'ın rastgele soneki ve
        // yazma yolundaki advisory lock, buraya hiç çarpmamak için var — ama son söz
        // veritabanınındır: iki farklı süreç aynı slug'ı yazamaz.
        //
        // Sütun nullable ve bu sorun değil: Postgres tekil index'te birden çok NULL'a
        // izin veriyor, yani başlığı henüz yazılmamış taslaklar birbirini engellemiyor.
        builder.HasIndex(x => x.Slug)
            .IsUnique()
            .HasDatabaseName("ux_experience_slug");

        // Misafir listesi: WHERE city_id = ? AND status = 'Published' (Blok 5b).
        // city_id önekte olduğu için EF'in FK konvansiyonu ayrıca bir index üretmiyor.
        builder.HasIndex(x => new { x.CityId, x.Status })
            .HasDatabaseName("ix_experience_city_status");

        // Host listesi: WHERE host_id = ? AND status = ? (GET /api/host/experiences).
        builder.HasIndex(x => new { x.HostId, x.Status })
            .HasDatabaseName("ix_experience_host_status");

        // Aşağıdaki iki index'i EF'in yabancı anahtar konvansiyonu ZATEN üretiyor
        // (category_slug ve original_language hiçbir index'in önekinde değil). Elle
        // yazılmalarının tek sebebi ADLANDIRMA: aksi halde şemaya EF'in kendi
        // "IX_experience_category_slug" biçimi girer ve snake_case düzeni bozulur.
        // Kategoriye göre filtreleme Blok 8'de gelecek; index o güne kadar boşuna
        // duruyor ama onu kaldırmanın yolu FK'yi kaldırmaktan geçerdi.
        builder.HasIndex(x => x.CategorySlug)
            .HasDatabaseName("ix_experience_category");

        builder.HasIndex(x => x.OriginalLanguage)
            .HasDatabaseName("ix_experience_original_language");

        // Navigation property YOK (UserConfiguration kararı) — ilişkiler yalnız FK
        // kısıtı olarak var, sorgular açık join yazıyor.
        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.HostId)
            .HasConstraintName("fk_experience_host")
            // Restrict, Cascade DEĞİL: hesap silmek ilanları da götürseydi, o ilanlara
            // bağlı rezervasyonlar (Blok 7) ve gezginlerin biletleri sessizce yok olurdu.
            // Hesap kapatma akışı geldiğinde ilanların ne olacağı AYRI bir ürün kararı.
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<City>()
            .WithMany()
            .HasForeignKey(x => x.CityId)
            .HasConstraintName("fk_experience_city")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Category>()
            .WithMany()
            .HasForeignKey(x => x.CategorySlug)
            .HasPrincipalKey(x => x.Slug)
            .HasConstraintName("fk_experience_category")
            .OnDelete(DeleteBehavior.Restrict);

        // Orijinal dil de kayıt defterine bağlı: docs/I18N.md'nin "dil listesi kodda
        // enum değil, veri" kararı ancak FK ile gerçekten uygulanıyor.
        builder.HasOne<Language>()
            .WithMany()
            .HasForeignKey(x => x.OriginalLanguage)
            .HasPrincipalKey(x => x.Code)
            .HasConstraintName("fk_experience_original_language")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
