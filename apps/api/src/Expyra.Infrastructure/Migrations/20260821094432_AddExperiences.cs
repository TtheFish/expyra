using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExperiences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "experience",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    host_id = table.Column<Guid>(type: "uuid", nullable: false),
                    city_id = table.Column<Guid>(type: "uuid", nullable: true),
                    category_slug = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    time_zone_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    capacity = table.Column<int>(type: "integer", nullable: false),
                    original_language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Draft"),
                    slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true, collation: "C"),
                    published_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience", x => x.id);
                    table.CheckConstraint("ck_experience_time_zone_requires_city", "(city_id IS NULL) = (time_zone_id IS NULL)");
                    table.ForeignKey(
                        name: "fk_experience_category",
                        column: x => x.category_slug,
                        principalTable: "category",
                        principalColumn: "slug",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_experience_city",
                        column: x => x.city_id,
                        principalTable: "city",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_experience_host",
                        column: x => x.host_id,
                        principalTable: "app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_experience_original_language",
                        column: x => x.original_language,
                        principalTable: "language",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "experience_spoken_language",
                columns: table => new
                {
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience_spoken_language", x => new { x.experience_id, x.language });
                    table.ForeignKey(
                        name: "fk_experience_spoken_language_experience",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_experience_spoken_language_language",
                        column: x => x.language,
                        principalTable: "language",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "experience_tag",
                columns: table => new
                {
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    normalized_tag = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false, collation: "C"),
                    display_tag = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience_tag", x => new { x.experience_id, x.normalized_tag });
                    table.ForeignKey(
                        name: "fk_experience_tag_experience",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "experience_translation",
                columns: table => new
                {
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "HostWritten"),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience_translation", x => new { x.experience_id, x.language });
                    table.ForeignKey(
                        name: "fk_experience_translation_experience",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_experience_translation_language",
                        column: x => x.language,
                        principalTable: "language",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_experience_category",
                table: "experience",
                column: "category_slug");

            migrationBuilder.CreateIndex(
                name: "ix_experience_city_status",
                table: "experience",
                columns: new[] { "city_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_experience_host_status",
                table: "experience",
                columns: new[] { "host_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_experience_original_language",
                table: "experience",
                column: "original_language");

            migrationBuilder.CreateIndex(
                name: "ux_experience_slug",
                table: "experience",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_experience_spoken_language_language",
                table: "experience_spoken_language",
                column: "language");

            migrationBuilder.CreateIndex(
                name: "ix_experience_translation_language",
                table: "experience_translation",
                column: "language");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "experience_spoken_language");

            migrationBuilder.DropTable(
                name: "experience_tag");

            migrationBuilder.DropTable(
                name: "experience_translation");

            migrationBuilder.DropTable(
                name: "experience");
        }
    }
}
