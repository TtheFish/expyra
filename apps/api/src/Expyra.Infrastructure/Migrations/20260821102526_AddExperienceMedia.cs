using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExperienceMedia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "avatar_key",
                table: "app_user",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "experience_media",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    storage_key = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    byte_size = table.Column<long>(type: "bigint", nullable: false),
                    width = table.Column<int>(type: "integer", nullable: false),
                    height = table.Column<int>(type: "integer", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_cover = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience_media", x => x.id);
                    table.CheckConstraint("ck_experience_media_active_has_size", "status <> 'Active' OR (width > 0 AND height > 0 AND byte_size > 0)");
                    table.ForeignKey(
                        name: "FK_experience_media_experience_experience_id",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_experience_media_experience_sort",
                table: "experience_media",
                columns: new[] { "experience_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "ix_experience_media_pending",
                table: "experience_media",
                column: "created_at_utc",
                filter: "status = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "ux_experience_media_cover",
                table: "experience_media",
                column: "experience_id",
                unique: true,
                filter: "is_cover");

            migrationBuilder.CreateIndex(
                name: "ux_experience_media_storage_key",
                table: "experience_media",
                column: "storage_key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "experience_media");

            migrationBuilder.DropColumn(
                name: "avatar_key",
                table: "app_user");
        }
    }
}
