using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Thuan.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialSqlServer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Products",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    OriginalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Discount = table.Column<int>(type: "int", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Size = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Stock = table.Column<int>(type: "int", nullable: false),
                    Image = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PreviewImages = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Products", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Carts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Carts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Carts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    OrderDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    OrderStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ShippingAddress = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CartItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CartId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CartItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CartItems_Carts_CartId",
                        column: x => x.CartId,
                        principalTable: "Carts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CartItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrderId = table.Column<int>(type: "int", nullable: false),
                    ProductId = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrderItems_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Products",
                columns: new[] { "Id", "Category", "Color", "Description", "Discount", "Image", "Name", "OriginalPrice", "PreviewImages", "Price", "Size", "Stock" },
                values: new object[,]
                {
                    { 1, "áo khoác", "8 Màu", "Áo khoác gió 2 lớp mũ tháo rời từ GUYN, phong cách bomber.", 34, "images/product1.jpg", "Áo khoác gió 2 lớp mũ tháo rời EWCW001", 600000m, "", 399000m, "S,M,L,XL,XXL", 100 },
                    { 2, "áo khoác", "7 Màu", "Áo khoác gió 2 lớp cổ bomber từ GUYN, ấm áp mùa đông.", 31, "images/product2.jpg", "Áo khoác gió 2 lớp cổ bomber FWCW005", 650000m, "", 449000m, "M,L,XL", 100 },
                    { 3, "áo khoác", "6 Màu", "Áo khoác da lộn basic cổ cao từ GUYN, thời trang đường phố.", 24, "images/product3.jpg", "Áo khoác da lộn basic cổ cao FWCL002", 850000m, "", 649000m, "S,M,L,XL", 100 },
                    { 4, "áo khoác", "4 Màu", "Áo khoác nỉ vải hiệu ứng đáp logo Horse từ GUYN.", 27, "images/product4.jpg", "Áo khoác nỉ vải hiệu ứng đáp logo Horse FWCS004", 750000m, "", 549000m, "M,L,XL", 100 },
                    { 5, "áo nỉ", "4 Màu", "Áo nỉ bộ trơn basic từ GUYN, thoải mái hàng ngày.", 29, "images/product5.jpg", "Áo nỉ bộ trơn basic FWTW024", 420000m, "", 299000m, "S,M,L", 100 },
                    { 7, "áo nỉ", "5 Màu", "Áo nỉ bộ can phối tay từ GUYN, GWTW901 - GWBS901.", 33, "images/product7.jpg", "Áo nỉ bộ can phối tay GWTW901", 599000m, "", 399000m, "S,M,L,XL", 100 },
                    { 11, "áo khoác", "2 Màu", "Áo khoác gió 1 lớp logo ngực từ GUYN, đơn giản.", 34, "images/product11.jpg", "Áo khoác gió 1 lớp logo ngực EWCW010", 600000m, "", 399000m, "S,M,L,XL", 100 },
                    { 12, "áo polo", "8 Màu", "Áo polo trơn bo kẻ từ GUYN, thể thao.", 34, "images/product12.jpg", "Áo polo trơn bo kẻ FSTP003", 420000m, "", 279000m, "M,L,XL", 100 },
                    { 15, "quần jeans", "7 Màu", "Quần jeans basic slim từ GUYN, cổ điển.", 20, "images/product15.jpg", "Quần jeans basic slim EABJ012", 500000m, "", 399000m, "28,30,32,34,36", 100 },
                    { 16, "áo khoác", "5 Màu", "Áo khoác Puffer cổ cao từ GUYN, ấm áp.", 29, "images/product16.jpg", "Áo khoác Puffer cổ cao FWCF004", 990000m, "", 699000m, "M,L,XL", 100 },
                    { 17, "áo khoác", "5 Màu", "Áo khoác gió 1 lớp mũ liền từ GUYN, giá sốc.", 50, "images/product17.jpg", "Áo khoác gió 1 lớp mũ liền EWCW007", 500000m, "", 249000m, "S,M,L", 100 },
                    { 18, "áo khoác", "6 Màu", "Áo khoác 3 lớp cổ đứng khuy bấm từ GUYN, cao cấp.", 0, "images/product18.jpg", "Áo khoác 3 lớp cổ đứng khuy bấm EWCP001", 890000m, "", 890000m, "M,L,XL", 100 },
                    { 19, "áo khoác", "7 Màu", "Áo khoác gió 2 lớp lót lông cổ cao từ GUYN.", 20, "images/product19.jpg", "Áo khoác gió 2 lớp lót lông cổ cao EWCU001", 750000m, "", 599000m, "M,L,XL", 100 },
                    { 20, "áo khoác", "7 Màu", "Áo khoác gió 2 lớp lót lông cổ cao basic từ GUYN.", 20, "images/product20.jpg", "Áo khoác gió 2 lớp lót lông cổ cao basic EWCU001", 750000m, "", 599000m, "S,M,L,XL", 100 },
                    { 22, "áo blazer", "4 Màu", "Áo blazer basic cổ vuông từ GUYN.", 20, "images/product22.jpg", "Áo blazer basic cổ vuông FWBL001", 999000m, "", 799000m, "M,L,XL", 100 },
                    { 23, "áo len", "5 Màu", "Áo len cổ tròn trơn từ GUYN, ấm áp.", 27, "images/product23.jpg", "Áo len cổ tròn trơn FWLT001", 550000m, "", 399000m, "S,M,L", 100 },
                    { 24, "quan dai kaki", "6 Màu", "Quần dài kaki ống suông từ GUYN.", 22, "images/product24.jpg", "Quần dài kaki ống suông EWKK001", 450000m, "", 349000m, "30,32,34,36", 100 },
                    { 28, "phụ kiện", "4 Màu", "Giày da lười nam từ GUYN, thời trang.", 18, "images/product28.jpg", "Giày da lười nam GDL001", 850000m, "", 699000m, "39,40,41,42,43", 100 },
                    { 29, "phụ kiện", "3 Màu", "Thắt lưng da bò nam từ GUYN.", 17, "images/product29.jpg", "Thắt lưng da bò nam TLDB001", 600000m, "", 499000m, "One Size", 100 },
                    { 30, "phụ kiện", "4 Màu", "Túi xách da nam từ GUYN.", 18, "images/product30.jpg", "Túi xách da nam TXD001", 1100000m, "", 899000m, "One Size", 100 },
                    { 32, "áo blazer", "3 Màu", "Áo blazer kẻ sọc từ GUYN.", 19, "images/product32.jpg", "Áo blazer kẻ sọc FWBL002", 1050000m, "", 849000m, "M,L,XL", 100 },
                    { 33, "áo len", "4 Màu", "Áo len cổ lọ từ GUYN.", 25, "images/product33.jpg", "Áo len cổ lọ FWLT002", 600000m, "", 449000m, "S,M,L", 100 },
                    { 34, "quan dai kaki", "5 Màu", "Quần dài kaki ống bó từ GUYN.", 24, "images/product34.jpg", "Quần dài kaki ống bó EWKK002", 500000m, "", 379000m, "30,32,34,36", 100 },
                    { 38, "phụ kiện", "5 Màu", "Giày sneaker nam từ GUYN.", 17, "images/product38.jpg", "Giày sneaker nam GSN001", 900000m, "", 749000m, "39,40,41,42,43", 100 },
                    { 39, "phụ kiện", "2 Màu", "Thắt lưng da lộn từ GUYN.", 22, "images/product39.jpg", "Thắt lưng da lộn TLDN001", 550000m, "", 429000m, "One Size", 100 },
                    { 40, "phụ kiện", "3 Màu", "Túi đeo chéo nam từ GUYN.", 18, "images/product40.jpg", "Túi đeo chéo nam TDC001", 850000m, "", 699000m, "One Size", 100 },
                    { 42, "áo blazer", "3 Màu", "Áo blazer họa tiết từ GUYN.", 20, "images/product42.jpg", "Áo blazer họa tiết FWBL003", 1100000m, "", 879000m, "M,L,XL", 100 },
                    { 43, "áo len", "4 Màu", "Áo len cổ chữ V từ GUYN.", 27, "images/product43.jpg", "Áo len cổ chữ V FWLT003", 590000m, "", 429000m, "S,M,L", 100 },
                    { 44, "quan dai kaki", "5 Màu", "Quần dài kaki ống rộng từ GUYN.", 25, "images/product44.jpg", "Quần dài kaki ống rộng EWKK003", 490000m, "", 369000m, "30,32,34,36", 100 },
                    { 48, "phụ kiện", "3 Màu", "Giày boots nam từ GUYN.", 18, "images/product48.jpg", "Giày boots nam GBT001", 1100000m, "", 899000m, "39,40,41,42,43", 100 },
                    { 49, "phụ kiện", "2 Màu", "Thắt lưng vải từ GUYN.", 22, "images/product49.jpg", "Thắt lưng vải TLVI001", 450000m, "", 349000m, "One Size", 100 },
                    { 50, "phụ kiện", "4 Màu", "Túi tote nam từ GUYN.", 17, "images/product50.jpg", "Túi tote nam TTO001", 900000m, "", 749000m, "One Size", 100 },
                    { 51, "áo khoác", "4 Màu", "Áo khoác nam cao cấp từ GUYN, phong cách hiện đại cho mùa đông.", 0, "images/product01.jpg", "Áo Khoác Nam Cao Cấp", 1200000m, "", 1200000m, "M,L,XL", 100 },
                    { 52, "quần jeans", "5 Màu", "Quần jeans slim fit thoải mái, chất liệu bền bỉ từ GUYN.", 0, "images/product02.jpg", "Quần Jeans Nam Slim Fit", 800000m, "", 800000m, "30,32,34,36", 100 },
                    { 53, "áo polo", "3 Màu", "Áo polo xanh dương thoáng mát, phù hợp văn phòng và dạo phố.", 0, "images/product03.jpg", "Áo Polo Nam Xanh Dương", 450000m, "", 450000m, "S,M,L,XL", 100 },
                    { 54, "áo len", "4 Màu", "Áo len dày dặn ấm áp, thiết kế cổ tròn basic từ GUYN.", 0, "images/product04.jpg", "Áo Len Nam Dày Dặn", 700000m, "", 700000m, "S,M,L", 100 },
                    { 55, "quan dai kaki", "2 Màu", "Quần kaki đen ống suông, lịch lãm cho quý ông.", 0, "images/product05.jpg", "Quần Kaki Nam Đen", 650000m, "", 650000m, "30,32,34", 100 },
                    { 56, "phụ kiện", "3 Màu", "Giày da nam lịch lãm, chất liệu cao cấp từ GUYN.", 0, "images/product06.jpg", "Giày Da Nam Lịch Lãm", 1500000m, "", 1500000m, "39,40,41,42", 100 },
                    { 57, "áo nỉ", "4 Màu", "Áo hoodie nam xám thoải mái, phù hợp casual.", 0, "images/product003.jpg", "Áo Hoodie Nam Xám", 550000m, "", 550000m, "S,M,L,XL", 100 },
                    { 58, "quan dai kaki", "2 Màu", "Quần jogger đen năng động, chất liệu co giãn tốt.", 0, "images/product004.jpg", "Quần Jogger Nam Đen", 500000m, "", 500000m, "M,L,XL", 100 },
                    { 59, "áo blazer", "3 Màu", "Áo blazer xanh navy cổ vuông, phong cách lịch lãm.", 0, "images/product005.jpg", "Áo Blazer Nam Xanh Navy", 1300000m, "", 1300000m, "M,L,XL", 100 },
                    { 60, "phụ kiện", "2 Màu", "Thắt lưng da đen nam, thiết kế đơn giản tinh tế.", 0, "images/product006.jpg", "Thắt Lưng Da Nam Đen", 400000m, "", 400000m, "One Size", 100 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_CartId",
                table: "CartItems",
                column: "CartId");

            migrationBuilder.CreateIndex(
                name: "IX_CartItems_ProductId",
                table: "CartItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Carts_UserId",
                table: "Carts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId",
                table: "OrderItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_ProductId",
                table: "OrderItems",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId",
                table: "Orders",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CartItems");

            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "Carts");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Products");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
