using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Expyra.Domain.Experiences;
using Expyra.Domain.Scheduling;

namespace Expyra.Infrastructure.Persistence.Configurations;

/// <summary>
/// Seans satırı. <b>Tek sütunlu Guid birincil anahtar ZORUNLU</b>: Blok 9 bu satırı
/// <c>FindForUpdateAsync</c> ile kilitleyecek ve o metot bileşik anahtarda
/// <c>InvalidOperationException</c> atıyor (<c>AppDbContext.BuildRowLock</c>).
/// </summary>
internal sealed class AvailabilitySlotConfiguration : IEntityTypeConfiguration<AvailabilitySlot>
{
    public void Configure(EntityTypeBuilder<AvailabilitySlot> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("availability_slot", table =>
        {
            // Tavanlar sabitten üretiliyor, metne elle yazılmıyor: sabit değişince
            // kısıt geride kalırsa doğrulama 400 yerine 500 üretmeye başlar.
            table.HasCheckConstraint(
                "ck_availability_slot_capacity",
                string.Create(CultureInfo.InvariantCulture,
                    $"capacity > 0 AND capacity <= {Experience.MaxCapacity}"));

            // Kalan kapasite Blok 9'da düşecek; korkuluk kodda değil VERİTABANINDA,
            // çünkü aşırı satış sessiz olamaz.
            table.HasCheckConstraint(
                "ck_availability_slot_remaining",
                "remaining_capacity >= 0 AND remaining_capacity <= capacity");

            table.HasCheckConstraint(
                "ck_availability_slot_duration",
                string.Create(CultureInfo.InvariantCulture,
                    $"duration_minutes > 0 AND duration_minutes <= {Experience.MaxDurationMinutes}"));

            // Kapatma alanları birlikte dolar ya da birlikte boş kalır. Ayrışırsa
            // "kapalı ama sebebi yok" gibi yorumlanamayan satırlar doğar.
            table.HasCheckConstraint(
                "ck_availability_slot_closed_fields",
                "(status = 'Closed') = (closed_reason IS NOT NULL) "
                + "AND (status = 'Closed') = (closed_at_utc IS NOT NULL)");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(x => x.ExperienceId).HasColumnName("experience_id").IsRequired();

        builder.Property(x => x.RecurrenceTemplateId).HasColumnName("recurrence_template_id");

        builder.Property(x => x.StartsAtUtc).HasColumnName("starts_at_utc").IsRequired();

        // `timestamp without time zone` AÇIKÇA: varsayılan eşleme timestamptz olurdu
        // ve Npgsql yerel saati UTC sanıp kaydırırdı. Bu sütun bilerek "saat dilimi
        // olmayan duvar saati" — anlamı yanındaki starts_at_utc ile birlikte tam.
        builder.Property(x => x.StartsAtLocal)
            .HasColumnName("starts_at_local")
            .HasColumnType("timestamp without time zone")
            .IsRequired();

        builder.Property(x => x.UtcOffsetMinutes).HasColumnName("utc_offset_minutes").IsRequired();

        builder.Property(x => x.DurationMinutes).HasColumnName("duration_minutes").IsRequired();

        builder.Property(x => x.Capacity).HasColumnName("capacity").IsRequired();

        builder.Property(x => x.RemainingCapacity).HasColumnName("remaining_capacity").IsRequired();

        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(SlotStatus.Open)
            .IsRequired();

        builder.Property(x => x.ClosedReason)
            .HasColumnName("closed_reason")
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(x => x.ClosedAtUtc).HasColumnName("closed_at_utc");

        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Restrict: şablon SİLİNMİYOR (durduruluyor), ama silinmeye kalkılırsa
        // ürettiği seansların provenance'ını sessizce koparmasın.
        builder.HasOne<RecurrenceTemplate>()
            .WithMany()
            .HasForeignKey(x => x.RecurrenceTemplateId)
            .OnDelete(DeleteBehavior.Restrict);

        // DURUMDAN BAĞIMSIZ tekillik: kapatılmış seans da bir mezar taşı ve tekrar
        // üretim onu diriltemez. Kısmi index (yalnız Open) yazılsaydı, host'un
        // kapattığı gün bir sonraki üretimde geri gelirdi.
        builder.HasIndex(x => new { x.ExperienceId, x.StartsAtUtc })
            .HasDatabaseName("ux_availability_slot_experience_start")
            .IsUnique();

        // Host takvimi yerel aya göre çiziyor.
        builder.HasIndex(x => new { x.ExperienceId, x.StartsAtLocal })
            .HasDatabaseName("ix_availability_slot_experience_local");

        // Misafirin tek sorgusu: bu ilanın açık ve gelecekteki seansları.
        builder.HasIndex(x => new { x.ExperienceId, x.StartsAtUtc })
            .HasDatabaseName("ix_availability_slot_open")
            .HasFilter("status = 'Open'");

        builder.HasIndex(x => x.RecurrenceTemplateId)
            .HasDatabaseName("ix_availability_slot_template")
            .HasFilter("recurrence_template_id IS NOT NULL");
    }
}

internal sealed class RecurrenceTemplateConfiguration : IEntityTypeConfiguration<RecurrenceTemplate>
{
    public void Configure(EntityTypeBuilder<RecurrenceTemplate> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("recurrence_template", table =>
        {
            table.HasCheckConstraint(
                "ck_recurrence_template_day_of_week",
                "day_of_week BETWEEN 0 AND 6");

            table.HasCheckConstraint(
                "ck_recurrence_template_range",
                "ends_on_local IS NULL OR ends_on_local >= starts_on_local");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(x => x.ExperienceId).HasColumnName("experience_id").IsRequired();

        // .NET DayOfWeek numaralandırması (0 = Pazar). SAYI olarak: metin alfabetik
        // sıralanır ve platform enum'u donmuş durumda. Tel üzerinde metin gidiyor.
        builder.Property(x => x.DayOfWeek)
            .HasColumnName("day_of_week")
            .HasConversion<short>()
            .IsRequired();

        builder.Property(x => x.StartTimeLocal).HasColumnName("start_time_local").IsRequired();

        builder.Property(x => x.StartsOnLocal).HasColumnName("starts_on_local").IsRequired();

        builder.Property(x => x.EndsOnLocal).HasColumnName("ends_on_local");

        builder.Property(x => x.DstOverlap)
            .HasColumnName("dst_overlap")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(DstOverlap.First)
            .IsRequired();

        builder.Property(x => x.Status)
            .HasColumnName("status")
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(RecurrenceStatus.Active)
            .IsRequired();

        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Aynı gün ve saatte İKİ AKTİF şablon olamaz — ikisi de aynı seansı üretmeye
        // çalışır ve biri ux_availability_slot_experience_start'a çarpardı. Kısmi:
        // durdurulmuş şablonlar saklanıyor ve aynı saati bir daha kullanılabilir
        // yapmaları gerekiyor.
        builder.HasIndex(x => new { x.ExperienceId, x.DayOfWeek, x.StartTimeLocal })
            .HasDatabaseName("ux_recurrence_template_active")
            .IsUnique()
            .HasFilter("status = 'Active'");

        builder.HasIndex(x => new { x.ExperienceId, x.Status })
            .HasDatabaseName("ix_recurrence_template_experience_status");
    }
}

internal sealed class AvailabilityBlackoutConfiguration : IEntityTypeConfiguration<AvailabilityBlackout>
{
    public void Configure(EntityTypeBuilder<AvailabilityBlackout> builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.ToTable("availability_blackout", table => table.HasCheckConstraint(
            "ck_availability_blackout_range",
            "ends_on_local >= starts_on_local"));

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id).HasColumnName("id").ValueGeneratedNever();

        builder.Property(x => x.ExperienceId).HasColumnName("experience_id").IsRequired();

        builder.Property(x => x.StartsOnLocal).HasColumnName("starts_on_local").IsRequired();

        builder.Property(x => x.EndsOnLocal).HasColumnName("ends_on_local").IsRequired();

        builder.Property(x => x.Note)
            .HasColumnName("note")
            .HasMaxLength(AvailabilityBlackout.MaxNoteLength);

        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasOne<Experience>()
            .WithMany()
            .HasForeignKey(x => x.ExperienceId)
            .OnDelete(DeleteBehavior.Cascade);

        // Çakışan aralıklara İZİN VAR (birleşim semantiği) — engellemek btree_gist
        // isterdi ve repoda hiç eklenti yok. İki kez "yokum" demek zararsız.
        builder.HasIndex(x => new { x.ExperienceId, x.StartsOnLocal })
            .HasDatabaseName("ix_availability_blackout_experience_start");
    }
}
