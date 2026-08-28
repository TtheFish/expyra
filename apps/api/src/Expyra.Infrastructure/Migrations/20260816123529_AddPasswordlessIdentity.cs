using System;
using System.Net;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPasswordlessIdentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "app_user",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    normalized_email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    email_verified_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    display_name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    preferred_language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    last_login_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_app_user", x => x.id);
                    table.ForeignKey(
                        name: "fk_app_user_preferred_language",
                        column: x => x.preferred_language,
                        principalTable: "language",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "login_code",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    normalized_email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    email_display = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    code_hash = table.Column<byte[]>(type: "bytea", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    closed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    language = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    request_ip = table.Column<IPAddress>(type: "inet", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_login_code", x => x.id);
                    table.ForeignKey(
                        name: "fk_login_code_language",
                        column: x => x.language,
                        principalTable: "language",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "external_login",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    provider_key = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    provider_email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_external_login", x => x.id);
                    table.ForeignKey(
                        name: "fk_external_login_user",
                        column: x => x.user_id,
                        principalTable: "app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "refresh_token",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token_hash = table.Column<byte[]>(type: "bytea", nullable: false),
                    family_id = table.Column<Guid>(type: "uuid", nullable: false),
                    previous_token_id = table.Column<Guid>(type: "uuid", nullable: true),
                    expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    absolute_expires_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    revoked_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    revocation_reason = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    created_by_ip = table.Column<IPAddress>(type: "inet", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_token", x => x.id);
                    table.ForeignKey(
                        name: "fk_refresh_token_user",
                        column: x => x.user_id,
                        principalTable: "app_user",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_app_user_preferred_language",
                table: "app_user",
                column: "preferred_language");

            migrationBuilder.CreateIndex(
                name: "ux_app_user_normalized_email",
                table: "app_user",
                column: "normalized_email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_external_login_user",
                table: "external_login",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_external_login_provider_key",
                table: "external_login",
                columns: new[] { "provider", "provider_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_login_code_email_created",
                table: "login_code",
                columns: new[] { "normalized_email", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_login_code_expires_at",
                table: "login_code",
                column: "expires_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_login_code_ip_created",
                table: "login_code",
                columns: new[] { "request_ip", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "IX_login_code_language",
                table: "login_code",
                column: "language");

            migrationBuilder.CreateIndex(
                name: "ux_login_code_pending",
                table: "login_code",
                column: "normalized_email",
                unique: true,
                filter: "status = 'Pending'");

            migrationBuilder.CreateIndex(
                name: "ix_refresh_token_expires_at",
                table: "refresh_token",
                column: "expires_at_utc");

            migrationBuilder.CreateIndex(
                name: "ix_refresh_token_family",
                table: "refresh_token",
                column: "family_id",
                filter: "revoked_at_utc IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_refresh_token_user",
                table: "refresh_token",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_refresh_token_hash",
                table: "refresh_token",
                column: "token_hash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "external_login");

            migrationBuilder.DropTable(
                name: "login_code");

            migrationBuilder.DropTable(
                name: "refresh_token");

            migrationBuilder.DropTable(
                name: "app_user");
        }
    }
}
