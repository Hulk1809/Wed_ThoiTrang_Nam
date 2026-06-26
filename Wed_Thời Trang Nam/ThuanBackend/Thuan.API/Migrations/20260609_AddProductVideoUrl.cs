using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Thuan.API.Migrations
{
    public partial class AddProductVideoUrl : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                table: "Products",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "VideoUrl", table: "Products");
        }
    }
}
