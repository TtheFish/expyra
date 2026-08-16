using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Expyra.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddLanguageRegistry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "language",
                columns: table => new
                {
                    code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    native_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    english_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    search_config = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    is_right_to_left = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    ui_available = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    content_allowed = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_language", x => x.code);
                });

            migrationBuilder.InsertData(
                table: "language",
                columns: new[] { "code", "content_allowed", "english_name", "native_name", "search_config" },
                values: new object[,]
                {
                    { "az", true, "Azerbaijani", "Azərbaycanca", null },
                    { "be", true, "Belarusian", "Беларуская", null },
                    { "bg", true, "Bulgarian", "Български", null },
                    { "bs", true, "Bosnian", "Bosanski", null },
                    { "ca", true, "Catalan", "Català", "catalan" },
                    { "cs", true, "Czech", "Čeština", null },
                    { "cy", true, "Welsh", "Cymraeg", null },
                    { "da", true, "Danish", "Dansk", "danish" },
                    { "de", true, "German", "Deutsch", "german" },
                    { "el", true, "Greek", "Ελληνικά", "greek" }
                });

            migrationBuilder.InsertData(
                table: "language",
                columns: new[] { "code", "content_allowed", "english_name", "native_name", "search_config", "ui_available" },
                values: new object[] { "en", true, "English", "English", "english", true });

            migrationBuilder.InsertData(
                table: "language",
                columns: new[] { "code", "content_allowed", "english_name", "native_name", "search_config" },
                values: new object[,]
                {
                    { "es", true, "Spanish", "Español", "spanish" },
                    { "et", true, "Estonian", "Eesti", "estonian" },
                    { "eu", true, "Basque", "Euskara", "basque" },
                    { "fi", true, "Finnish", "Suomi", "finnish" },
                    { "fo", true, "Faroese", "Føroyskt", null },
                    { "fr", true, "French", "Français", "french" },
                    { "ga", true, "Irish", "Gaeilge", "irish" },
                    { "gd", true, "Scottish Gaelic", "Gàidhlig", null },
                    { "gl", true, "Galician", "Galego", null },
                    { "hr", true, "Croatian", "Hrvatski", null },
                    { "hu", true, "Hungarian", "Magyar", "hungarian" },
                    { "hy", true, "Armenian", "Հայերեն", "armenian" },
                    { "is", true, "Icelandic", "Íslenska", null },
                    { "it", true, "Italian", "Italiano", "italian" },
                    { "ja", true, "Japanese", "日本語", null },
                    { "ka", true, "Georgian", "ქართული", null },
                    { "ko", true, "Korean", "한국어", null },
                    { "lb", true, "Luxembourgish", "Lëtzebuergesch", null },
                    { "lt", true, "Lithuanian", "Lietuvių", "lithuanian" },
                    { "lv", true, "Latvian", "Latviešu", null },
                    { "mk", true, "Macedonian", "Македонски", null },
                    { "mt", true, "Maltese", "Malti", null },
                    { "nb", true, "Norwegian Bokmål", "Norsk bokmål", "norwegian" },
                    { "nl", true, "Dutch", "Nederlands", "dutch" },
                    { "nn", true, "Norwegian Nynorsk", "Nynorsk", "norwegian" },
                    { "pl", true, "Polish", "Polski", "polish" },
                    { "pt", true, "Portuguese", "Português", "portuguese" },
                    { "rm", true, "Romansh", "Rumantsch", null },
                    { "ro", true, "Romanian", "Română", "romanian" },
                    { "ru", true, "Russian", "Русский", "russian" },
                    { "se", true, "Northern Sami", "Davvisámegiella", null },
                    { "sk", true, "Slovak", "Slovenčina", null },
                    { "sl", true, "Slovenian", "Slovenščina", null },
                    { "sq", true, "Albanian", "Shqip", null },
                    { "sr", true, "Serbian", "Српски", "serbian" },
                    { "sv", true, "Swedish", "Svenska", "swedish" }
                });

            migrationBuilder.InsertData(
                table: "language",
                columns: new[] { "code", "content_allowed", "english_name", "native_name", "search_config", "ui_available" },
                values: new object[] { "tr", true, "Turkish", "Türkçe", "turkish", true });

            migrationBuilder.InsertData(
                table: "language",
                columns: new[] { "code", "content_allowed", "english_name", "native_name", "search_config" },
                values: new object[] { "uk", true, "Ukrainian", "Українська", null });

            migrationBuilder.CreateIndex(
                name: "ix_language_ui_available",
                table: "language",
                column: "ui_available",
                filter: "ui_available");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "language");
        }
    }
}
