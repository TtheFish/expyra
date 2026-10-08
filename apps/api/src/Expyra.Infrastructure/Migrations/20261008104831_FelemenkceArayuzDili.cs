using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FelemenkceArayuzDili : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "language",
                keyColumn: "code",
                keyValue: "nl",
                column: "ui_available",
                value: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "language",
                keyColumn: "code",
                keyValue: "nl",
                column: "ui_available",
                value: false);
        }
    }
}
