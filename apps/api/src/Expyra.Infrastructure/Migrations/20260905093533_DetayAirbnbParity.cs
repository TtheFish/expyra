using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DetayAirbnbParity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "accessibility",
                table: "experience_translation",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "meeting_instructions",
                table: "experience_translation",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "not_included",
                table: "experience_translation",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "what_to_bring",
                table: "experience_translation",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "activity_level",
                table: "experience",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "meeting_address",
                table: "experience",
                type: "character varying(240)",
                maxLength: 240,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "meeting_latitude",
                table: "experience",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "meeting_longitude",
                table: "experience",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "minimum_age",
                table: "experience",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "experience_itinerary_step",
                columns: table => new
                {
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    body = table.Column<string>(type: "character varying(600)", maxLength: 600, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience_itinerary_step", x => new { x.experience_id, x.language, x.sort_order });
                    table.ForeignKey(
                        name: "fk_experience_itinerary_step_experience",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_experience_itinerary_step_language",
                        column: x => x.language,
                        principalTable: "language",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "host_profile",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    headline = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    bio = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_host_profile", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_host_profile_language",
                        column: x => x.language,
                        principalTable: "language",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_host_profile_user",
                        column: x => x.user_id,
                        principalTable: "app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_experience_itinerary_step_language",
                table: "experience_itinerary_step",
                column: "language");

            migrationBuilder.CreateIndex(
                name: "ix_host_profile_language",
                table: "host_profile",
                column: "language");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "experience_itinerary_step");

            migrationBuilder.DropTable(
                name: "host_profile");

            migrationBuilder.DropColumn(
                name: "accessibility",
                table: "experience_translation");

            migrationBuilder.DropColumn(
                name: "meeting_instructions",
                table: "experience_translation");

            migrationBuilder.DropColumn(
                name: "not_included",
                table: "experience_translation");

            migrationBuilder.DropColumn(
                name: "what_to_bring",
                table: "experience_translation");

            migrationBuilder.DropColumn(
                name: "activity_level",
                table: "experience");

            migrationBuilder.DropColumn(
                name: "meeting_address",
                table: "experience");

            migrationBuilder.DropColumn(
                name: "meeting_latitude",
                table: "experience");

            migrationBuilder.DropColumn(
                name: "meeting_longitude",
                table: "experience");

            migrationBuilder.DropColumn(
                name: "minimum_age",
                table: "experience");
        }
    }
}
