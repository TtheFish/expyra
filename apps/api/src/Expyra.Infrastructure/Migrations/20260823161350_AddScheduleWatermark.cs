using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddScheduleWatermark : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "schedule_generated_through_local",
                table: "experience",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "schedule_generated_through_local",
                table: "experience");
        }
    }
}
