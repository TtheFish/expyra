using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Experiences;

namespace Expyra.Infrastructure.Persistence.Configurations;

internal sealed class ExperienceMediaConfiguration : IEntityTypeConfiguration<ExperienceMedia>
{
    public void Configure(EntityTypeBuilder<ExperienceMedia> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable(
            "experience_media",
            table => table.HasCheckConstraint(
                "ck_experience_media_active_has_size",
                // Active bir satırın ölçüsü DOLU olmak zorunda: next/image genişlik ve
                // yükseklik olmadan çizemiyor, sıfır ölçülü bir "aktif" satır misafir
                // sayfasını çalışma anında kırardı. Pending'de ölçü henüz bilinmiyor.
                "status <> 'Active' OR (width > 0 AND height > 0 AND byte_size > 0)"));

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .HasColumnName("id")
            .ValueGeneratedNever();

        builder.Property(x => x.ExperienceId)
            .HasColumnName("experience_id")
            .IsRequired();

        builder.Property(x => x.StorageKey)
            .HasColumnName("storage_key")
            .HasMaxLength(ExperienceMedia.MaxStorageKeyLength)
            .IsRequired();

        builder.Property(x => x.ContentType)
            .HasColumnName("content_type")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.ByteSize)
            .HasColumnName("byte_size")
            .IsRequired();

        builder.Property(x => x.Width)
            .HasColumnName("width")
            .IsRequired();

        builder.Property(x => x.Height)
            .HasColumnName("height")
            .IsRequired();

        builder.Property(x => x.SortOrder)
            .HasColumnName("sort_order")
            .IsRequired();

        builder.Property(x => x.IsCover)
            .HasColumnName("is_cover")
            .IsRequired();

        // Enum METİN olarak — experience.status ile aynı gerekçe.
        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(MediaStatus.Pending)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc)
            .HasColumnName("created_at_utc")
            .IsRequired();

        builder.Property(x => x.UpdatedAtUtc)
            .HasColumnName("updated_at_utc");

        // Deneyim silinirse görselleri de gider. Satırların ait olduğu ilan yokken
        // ayakta kalması, temizlik komutunun asla bulamayacağı yetimler demek.
        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Depo anahtarı TEKİL: aynı nesneyi iki satırın işaret etmesi, birini silmenin
        // diğerinin görselini de öldürmesi demek.
        builder.HasIndex(x => x.StorageKey)
            .HasDatabaseName("ux_experience_media_storage_key")
            .IsUnique();

        // Galeri sorgusunun tam kapsadığı index: WHERE experience_id = ? ORDER BY sort_order.
        builder.HasIndex(x => new { x.ExperienceId, x.SortOrder })
            .HasDatabaseName("ix_experience_media_experience_sort");

        // Deneyim başına EN FAZLA BİR kapak — kısmi tekil index. Kod disiplinine
        // bırakılsaydı iki eşzamanlı "kapak yap" isteği iki kapak bırakabilirdi ve
        // listede hangisinin çıkacağı sorgunun sıralamasına kalırdı.
        builder.HasIndex(x => x.ExperienceId)
            .HasDatabaseName("ux_experience_media_cover")
            .IsUnique()
            .HasFilter("is_cover");

        // Yetim temizliği: "N saatten eski Pending satırlar". Filtreli index, tablonun
        // büyük çoğunluğu Active olduğunda taramayı Pending satırlarla sınırlıyor.
        builder.HasIndex(x => x.CreatedAtUtc)
            .HasDatabaseName("ix_experience_media_pending")
            .HasFilter("status = 'Pending'");
    }
}
