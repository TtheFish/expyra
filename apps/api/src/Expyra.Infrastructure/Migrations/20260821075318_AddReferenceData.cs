using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReferenceData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "category",
                columns: table => new
                {
                    slug = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_category", x => x.slug);
                });

            migrationBuilder.CreateTable(
                name: "country",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    english_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_country", x => x.code);
                });

            migrationBuilder.CreateTable(
                name: "currency",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    english_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    minor_units = table.Column<int>(type: "integer", nullable: false),
                    symbol = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_currency", x => x.code);
                    table.CheckConstraint("ck_currency_minor_units", "minor_units >= 0 AND minor_units <= 4");
                });

            migrationBuilder.CreateTable(
                name: "city",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false, collation: "C"),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    english_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    time_zone_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    latitude = table.Column<double>(type: "double precision", nullable: false),
                    longitude = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_city", x => x.id);
                    table.ForeignKey(
                        name: "fk_city_country",
                        column: x => x.country_code,
                        principalTable: "country",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "city_alias",
                columns: table => new
                {
                    city_id = table.Column<Guid>(type: "uuid", nullable: false),
                    normalized_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false, collation: "C"),
                    display_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_city_alias", x => new { x.city_id, x.normalized_name });
                    table.ForeignKey(
                        name: "fk_city_alias_city",
                        column: x => x.city_id,
                        principalTable: "city",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ux_city_country_slug",
                table: "city",
                columns: new[] { "country_code", "slug" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_city_alias_normalized",
                table: "city_alias",
                column: "normalized_name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "category");

            migrationBuilder.DropTable(
                name: "city_alias");

            migrationBuilder.DropTable(
                name: "currency");

            migrationBuilder.DropTable(
                name: "city");

            migrationBuilder.DropTable(
                name: "country");
        }
    }
}
