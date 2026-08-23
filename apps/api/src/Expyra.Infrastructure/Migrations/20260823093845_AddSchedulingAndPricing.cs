using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSchedulingAndPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "infant_counts_toward_capacity",
                table: "experience",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "availability_blackout",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    starts_on_local = table.Column<DateOnly>(type: "date", nullable: false),
                    ends_on_local = table.Column<DateOnly>(type: "date", nullable: false),
                    note = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_availability_blackout", x => x.id);
                    table.CheckConstraint("ck_availability_blackout_range", "ends_on_local >= starts_on_local");
                    table.ForeignKey(
                        name: "FK_availability_blackout_experience_experience_id",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "exchange_rate_snapshot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    pivot_currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    captured_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    source = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exchange_rate_snapshot", x => x.id);
                    table.ForeignKey(
                        name: "FK_exchange_rate_snapshot_currency_pivot_currency_code",
                        column: x => x.pivot_currency_code,
                        principalTable: "currency",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "experience_price",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_experience_price", x => x.id);
                    table.ForeignKey(
                        name: "FK_experience_price_currency_currency_code",
                        column: x => x.currency_code,
                        principalTable: "currency",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_experience_price_experience_experience_id",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "recurrence_template",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    day_of_week = table.Column<short>(type: "smallint", nullable: false),
                    start_time_local = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    starts_on_local = table.Column<DateOnly>(type: "date", nullable: false),
                    ends_on_local = table.Column<DateOnly>(type: "date", nullable: true),
                    dst_overlap = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "First"),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Active"),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_recurrence_template", x => x.id);
                    table.CheckConstraint("ck_recurrence_template_day_of_week", "day_of_week BETWEEN 0 AND 6");
                    table.CheckConstraint("ck_recurrence_template_range", "ends_on_local IS NULL OR ends_on_local >= starts_on_local");
                    table.ForeignKey(
                        name: "FK_recurrence_template_experience_experience_id",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "exchange_rate",
                columns: table => new
                {
                    snapshot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    rate_per_pivot = table.Column<decimal>(type: "numeric(24,12)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_exchange_rate", x => new { x.snapshot_id, x.currency_code });
                    table.CheckConstraint("ck_exchange_rate_positive", "rate_per_pivot > 0");
                    table.ForeignKey(
                        name: "FK_exchange_rate_currency_currency_code",
                        column: x => x.currency_code,
                        principalTable: "currency",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_exchange_rate_exchange_rate_snapshot_snapshot_id",
                        column: x => x.snapshot_id,
                        principalTable: "exchange_rate_snapshot",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "price_rule",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    experience_price_id = table.Column<Guid>(type: "uuid", nullable: false),
                    guest_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    unit_amount_minor = table.Column<long>(type: "bigint", nullable: false),
                    unit_currency_code = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_price_rule", x => x.id);
                    table.CheckConstraint("ck_price_rule_amount_range", "unit_amount_minor >= 0 AND unit_amount_minor <= 1000000000000");
                    table.ForeignKey(
                        name: "FK_price_rule_experience_price_experience_price_id",
                        column: x => x.experience_price_id,
                        principalTable: "experience_price",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_price_rule_currency",
                        column: x => x.unit_currency_code,
                        principalTable: "currency",
                        principalColumn: "code",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "availability_slot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    experience_id = table.Column<Guid>(type: "uuid", nullable: false),
                    recurrence_template_id = table.Column<Guid>(type: "uuid", nullable: true),
                    starts_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    starts_at_local = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    utc_offset_minutes = table.Column<short>(type: "smallint", nullable: false),
                    duration_minutes = table.Column<int>(type: "integer", nullable: false),
                    capacity = table.Column<int>(type: "integer", nullable: false),
                    remaining_capacity = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Open"),
                    closed_reason = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    closed_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_availability_slot", x => x.id);
                    table.CheckConstraint("ck_availability_slot_capacity", "capacity > 0 AND capacity <= 500");
                    table.CheckConstraint("ck_availability_slot_closed_fields", "(status = 'Closed') = (closed_reason IS NOT NULL) AND (status = 'Closed') = (closed_at_utc IS NOT NULL)");
                    table.CheckConstraint("ck_availability_slot_duration", "duration_minutes > 0 AND duration_minutes <= 10080");
                    table.CheckConstraint("ck_availability_slot_remaining", "remaining_capacity >= 0 AND remaining_capacity <= capacity");
                    table.ForeignKey(
                        name: "FK_availability_slot_experience_experience_id",
                        column: x => x.experience_id,
                        principalTable: "experience",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_availability_slot_recurrence_template_recurrence_template_id",
                        column: x => x.recurrence_template_id,
                        principalTable: "recurrence_template",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_availability_blackout_experience_start",
                table: "availability_blackout",
                columns: new[] { "experience_id", "starts_on_local" });

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_experience_local",
                table: "availability_slot",
                columns: new[] { "experience_id", "starts_at_local" });

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_open",
                table: "availability_slot",
                columns: new[] { "experience_id", "starts_at_utc" },
                unique: true,
                filter: "status = 'Open'");

            migrationBuilder.CreateIndex(
                name: "ix_availability_slot_template",
                table: "availability_slot",
                column: "recurrence_template_id",
                filter: "recurrence_template_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_exchange_rate_currency_code",
                table: "exchange_rate",
                column: "currency_code");

            migrationBuilder.CreateIndex(
                name: "ix_exchange_rate_snapshot_newest",
                table: "exchange_rate_snapshot",
                columns: new[] { "captured_at_utc", "id" },
                descending: new bool[0]);

            migrationBuilder.CreateIndex(
                name: "ux_exchange_rate_snapshot_pivot_captured",
                table: "exchange_rate_snapshot",
                columns: new[] { "pivot_currency_code", "captured_at_utc" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_experience_price_currency",
                table: "experience_price",
                column: "currency_code");

            migrationBuilder.CreateIndex(
                name: "ux_experience_price_experience",
                table: "experience_price",
                column: "experience_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_price_rule_currency",
                table: "price_rule",
                column: "unit_currency_code");

            migrationBuilder.CreateIndex(
                name: "ux_price_rule_tier",
                table: "price_rule",
                columns: new[] { "experience_price_id", "guest_type" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_recurrence_template_experience_status",
                table: "recurrence_template",
                columns: new[] { "experience_id", "status" });

            migrationBuilder.CreateIndex(
                name: "ux_recurrence_template_active",
                table: "recurrence_template",
                columns: new[] { "experience_id", "day_of_week", "start_time_local" },
                unique: true,
                filter: "status = 'Active'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "availability_blackout");

            migrationBuilder.DropTable(
                name: "availability_slot");

            migrationBuilder.DropTable(
                name: "exchange_rate");

            migrationBuilder.DropTable(
                name: "price_rule");

            migrationBuilder.DropTable(
                name: "recurrence_template");

            migrationBuilder.DropTable(
                name: "exchange_rate_snapshot");

            migrationBuilder.DropTable(
                name: "experience_price");

            migrationBuilder.DropColumn(
                name: "infant_counts_toward_capacity",
                table: "experience");
        }
    }
}
