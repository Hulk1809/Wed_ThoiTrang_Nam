using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Thuan.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserBehavior : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bảng UserBehaviors đã được tạo trong migration AddVideoTrackingAndUpload
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: UserBehaviors managed by AddVideoTrackingAndUpload migration
        }
    }
}
