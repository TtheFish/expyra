using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixSlotUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ux_availability_slot_experience_start HİÇ oluşmamıştı: yapılandırmada
            // aynı sütun çiftine iki adsız HasIndex çağrısı vardı ve EF ikisini tek
            // index nesnesine çöktürmüştü — ikincisi birincinin adını ezmiş, IsUnique
            // ona miras kalmıştı. Şemada yalnız "Open" filtreli, yanlışlıkla tekil
            // bir index duruyordu.
            //
            // Bu migration onu ikiye ayırıyor: filtreli olan TEKİL DEĞİL (o bir sorgu
            // index i), tekillik ise DURUMDAN BAĞIMSIZ olana geçiyor — kapatılmış bir
            // seansın tekrar üretimde dirilmesini engelleyen şey o.
            migrationBuilder.DropIndex(
                name: "ix_availability_slot_open",
                table: "availability_slot");

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_open",
                table: "availability_slot",
                columns: new[] { "experience_id", "starts_at_utc" },
                filter: "status = 'Open'");

            migrationBuilder.CreateIndex(
                name: "ux_availability_slot_experience_start",
                table: "availability_slot",
                columns: new[] { "experience_id", "starts_at_utc" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_availability_slot_open",
                table: "availability_slot");

            migrationBuilder.DropIndex(
                name: "ux_availability_slot_experience_start",
                table: "availability_slot");

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_open",
                table: "availability_slot",
                columns: new[] { "experience_id", "starts_at_utc" },
                unique: true,
                filter: "status = 'Open'");
        }
    }
}
