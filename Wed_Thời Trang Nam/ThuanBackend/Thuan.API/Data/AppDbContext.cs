using Microsoft.EntityFrameworkCore;
// Đảm bảo namespace này khớp với file Product.cs, User.cs...
using Thuan.API.Models; 

// Namespace cho thư mục Data
namespace Thuan.API.Data
{
    public class AppDbContext : DbContext
    {
        // === 1. Định nghĩa các Bảng (Tables) ===
        public DbSet<Product> Products { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<CartItem> CartItems { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderItem> OrderItems { get; set; }
        public DbSet<UserBehavior> UserBehaviors { get; set; }
        public DbSet<VideoTracking> VideoTrackings { get; set; }
        public DbSet<UploadedFile> UploadedFiles { get; set; }
        
        // === 2. Constructor (Khởi tạo kết nối) ===
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // === 3. (MỚI) Nạp dữ liệu sản phẩm (Seed Data) ===
        // Code này sẽ tự động chạy khi bạn dùng lệnh "dotnet ef database update"
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Bắt đầu thêm dữ liệu cho bảng Products
            modelBuilder.Entity<Product>().HasData(
                
                // === ÁO KHOÁC ===
               new Product {
            Id = 1, Name = "Áo khoác gió 2 lớp mũ tháo rời EWCW001", Price = 399000M, OriginalPrice = 600000M, Discount = 34,
            Category = "áo khoác", Size = "S,M,L,XL,XXL", Color = "8 Màu", Image = "images/product1.jpg",
            Description = "Áo khoác gió 2 lớp mũ tháo rời từ GUYN, phong cách bomber.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 2, Name = "Áo khoác gió 2 lớp cổ bomber FWCW005", Price = 449000M, OriginalPrice = 650000M, Discount = 31,
            Category = "áo khoác", Size = "M,L,XL", Color = "7 Màu", Image = "images/product2.jpg",
            Description = "Áo khoác gió 2 lớp cổ bomber từ GUYN, ấm áp mùa đông.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 3, Name = "Áo khoác da lộn basic cổ cao FWCL002", Price = 649000M, OriginalPrice = 850000M, Discount = 24,
            Category = "áo khoác", Size = "S,M,L,XL", Color = "6 Màu", Image = "images/product3.jpg",
            Description = "Áo khoác da lộn basic cổ cao từ GUYN, thời trang đường phố.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 4, Name = "Áo khoác nỉ vải hiệu ứng đáp logo Horse FWCS004", Price = 549000M, OriginalPrice = 750000M, Discount = 27,
            Category = "áo khoác", Size = "M,L,XL", Color = "4 Màu", Image = "images/product4.jpg",
            Description = "Áo khoác nỉ vải hiệu ứng đáp logo Horse từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 11, Name = "Áo khoác gió 1 lớp logo ngực EWCW010", Price = 399000M, OriginalPrice = 600000M, Discount = 34,
            Category = "áo khoác", Size = "S,M,L,XL", Color = "2 Màu", Image = "images/product11.jpg",
            Description = "Áo khoác gió 1 lớp logo ngực từ GUYN, đơn giản.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 16, Name = "Áo khoác Puffer cổ cao FWCF004", Price = 699000M, OriginalPrice = 990000M, Discount = 29,
            Category = "áo khoác", Size = "M,L,XL", Color = "5 Màu", Image = "images/product16.jpg",
            Description = "Áo khoác Puffer cổ cao từ GUYN, ấm áp.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 17, Name = "Áo khoác gió 1 lớp mũ liền EWCW007", Price = 249000M, OriginalPrice = 500000M, Discount = 50,
            Category = "áo khoác", Size = "S,M,L", Color = "5 Màu", Image = "images/product17.jpg",
            Description = "Áo khoác gió 1 lớp mũ liền từ GUYN, giá sốc.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 18, Name = "Áo khoác 3 lớp cổ đứng khuy bấm EWCP001", Price = 890000M, OriginalPrice = 890000M, Discount = 0,
            Category = "áo khoác", Size = "M,L,XL", Color = "6 Màu", Image = "images/product18.jpg",
            Description = "Áo khoác 3 lớp cổ đứng khuy bấm từ GUYN, cao cấp.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 19, Name = "Áo khoác gió 2 lớp lót lông cổ cao EWCU001", Price = 599000M, OriginalPrice = 750000M, Discount = 20,
            Category = "áo khoác", Size = "M,L,XL", Color = "7 Màu", Image = "images/product19.jpg",
            Description = "Áo khoác gió 2 lớp lót lông cổ cao từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 20, Name = "Áo khoác gió 2 lớp lót lông cổ cao basic EWCU001", Price = 599000M, OriginalPrice = 750000M, Discount = 20,
            Category = "áo khoác", Size = "S,M,L,XL", Color = "7 Màu", Image = "images/product20.jpg",
            Description = "Áo khoác gió 2 lớp lót lông cổ cao basic từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 51, Name = "Áo Khoác Nam Cao Cấp", Price = 1200000M, OriginalPrice = 1200000M, Discount = 0,
            Category = "áo khoác", Size = "M,L,XL", Color = "4 Màu", Image = "images/product01.jpg",
            Description = "Áo khoác nam cao cấp từ GUYN, phong cách hiện đại cho mùa đông.", Stock = 100 // Đã thêm Stock
        },

        // === ÁO NỈ & PHÔNG ===
        new Product {
            Id = 5, Name = "Áo nỉ bộ trơn basic FWTW024", Price = 299000M, OriginalPrice = 420000M, Discount = 29,
            Category = "áo nỉ", Size = "S,M,L", Color = "4 Màu", Image = "images/product5.jpg",
            Description = "Áo nỉ bộ trơn basic từ GUYN, thoải mái hàng ngày.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 7, Name = "Áo nỉ bộ can phối tay GWTW901", Price = 399000M, OriginalPrice = 599000M, Discount = 33,
            Category = "áo nỉ", Size = "S,M,L,XL", Color = "5 Màu", Image = "images/product7.jpg",
            Description = "Áo nỉ bộ can phối tay từ GUYN, GWTW901 - GWBS901.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 57, Name = "Áo Hoodie Nam Xám", Price = 550000M, OriginalPrice = 550000M, Discount = 0,
            Category = "áo nỉ", Size = "S,M,L,XL", Color = "4 Màu", Image = "images/product003.jpg",
            Description = "Áo hoodie nam xám thoải mái, phù hợp casual.", Stock = 100 // Đã thêm Stock
        },

        // === ÁO POLO ===
        new Product {
            Id = 12, Name = "Áo polo trơn bo kẻ FSTP003", Price = 279000M, OriginalPrice = 420000M, Discount = 34,
            Category = "áo polo", Size = "M,L,XL", Color = "8 Màu", Image = "images/product12.jpg",
            Description = "Áo polo trơn bo kẻ từ GUYN, thể thao.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 53, Name = "Áo Polo Nam Xanh Dương", Price = 450000M, OriginalPrice = 450000M, Discount = 0,
            Category = "áo polo", Size = "S,M,L,XL", Color = "3 Màu", Image = "images/product03.jpg",
            Description = "Áo polo xanh dương thoáng mát, phù hợp văn phòng và dạo phố.", Stock = 100 // Đã thêm Stock
        },

        // === ÁO LEN ===
        new Product {
            Id = 23, Name = "Áo len cổ tròn trơn FWLT001", Price = 399000M, OriginalPrice = 550000M, Discount = 27,
            Category = "áo len", Size = "S,M,L", Color = "5 Màu", Image = "images/product23.jpg",
            Description = "Áo len cổ tròn trơn từ GUYN, ấm áp.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 33, Name = "Áo len cổ lọ FWLT002", Price = 449000M, OriginalPrice = 600000M, Discount = 25,
            Category = "áo len", Size = "S,M,L", Color = "4 Màu", Image = "images/product33.jpg",
            Description = "Áo len cổ lọ từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 43, Name = "Áo len cổ chữ V FWLT003", Price = 429000M, OriginalPrice = 590000M, Discount = 27,
            Category = "áo len", Size = "S,M,L", Color = "4 Màu", Image = "images/product43.jpg",
            Description = "Áo len cổ chữ V từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 54, Name = "Áo Len Nam Dày Dặn", Price = 700000M, OriginalPrice = 700000M, Discount = 0,
            Category = "áo len", Size = "S,M,L", Color = "4 Màu", Image = "images/product04.jpg",
            Description = "Áo len dày dặn ấm áp, thiết kế cổ tròn basic từ GUYN.", Stock = 100 // Đã thêm Stock
        },

        // === ÁO BLAZER ===
        new Product {
            Id = 22, Name = "Áo blazer basic cổ vuông FWBL001", Price = 799000M, OriginalPrice = 999000M, Discount = 20,
            Category = "áo blazer", Size = "M,L,XL", Color = "4 Màu", Image = "images/product22.jpg",
            Description = "Áo blazer basic cổ vuông từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 32, Name = "Áo blazer kẻ sọc FWBL002", Price = 849000M, OriginalPrice = 1050000M, Discount = 19,
            Category = "áo blazer", Size = "M,L,XL", Color = "3 Màu", Image = "images/product32.jpg",
            Description = "Áo blazer kẻ sọc từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 42, Name = "Áo blazer họa tiết FWBL003", Price = 879000M, OriginalPrice = 1100000M, Discount = 20,
            Category = "áo blazer", Size = "M,L,XL", Color = "3 Màu", Image = "images/product42.jpg",
            Description = "Áo blazer họa tiết từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 59, Name = "Áo Blazer Nam Xanh Navy", Price = 1300000M, OriginalPrice = 1300000M, Discount = 0,
            Category = "áo blazer", Size = "M,L,XL", Color = "3 Màu", Image = "images/product005.jpg",
            Description = "Áo blazer xanh navy cổ vuông, phong cách lịch lãm.", Stock = 100 // Đã thêm Stock
        },

        // === QUẦN JEANS ===
        new Product {
            Id = 15, Name = "Quần jeans basic slim EABJ012", Price = 399000M, OriginalPrice = 500000M, Discount = 20,
            Category = "quần jeans", Size = "28,30,32,34,36", Color = "7 Màu", Image = "images/product15.jpg",
            Description = "Quần jeans basic slim từ GUYN, cổ điển.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 52, Name = "Quần Jeans Nam Slim Fit", Price = 800000M, OriginalPrice = 800000M, Discount = 0,
            Category = "quần jeans", Size = "30,32,34,36", Color = "5 Màu", Image = "images/product02.jpg",
            Description = "Quần jeans slim fit thoải mái, chất liệu bền bỉ từ GUYN.", Stock = 100 // Đã thêm Stock
        },

        // === QUẦN DÀI KAKI ===
        new Product {
            Id = 24, Name = "Quần dài kaki ống suông EWKK001", Price = 349000M, OriginalPrice = 450000M, Discount = 22,
            Category = "quan dai kaki", Size = "30,32,34,36", Color = "6 Màu", Image = "images/product24.jpg",
            Description = "Quần dài kaki ống suông từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 34, Name = "Quần dài kaki ống bó EWKK002", Price = 379000M, OriginalPrice = 500000M, Discount = 24,
            Category = "quan dai kaki", Size = "30,32,34,36", Color = "5 Màu", Image = "images/product34.jpg",
            Description = "Quần dài kaki ống bó từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 44, Name = "Quần dài kaki ống rộng EWKK003", Price = 369000M, OriginalPrice = 490000M, Discount = 25,
            Category = "quan dai kaki", Size = "30,32,34,36", Color = "5 Màu", Image = "images/product44.jpg",
            Description = "Quần dài kaki ống rộng từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 55, Name = "Quần Kaki Nam Đen", Price = 650000M, OriginalPrice = 650000M, Discount = 0,
            Category = "quan dai kaki", Size = "30,32,34", Color = "2 Màu", Image = "images/product05.jpg",
            Description = "Quần kaki đen ống suông, lịch lãm cho quý ông.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 58, Name = "Quần Jogger Nam Đen", Price = 500000M, OriginalPrice = 500000M, Discount = 0,
            Category = "quan dai kaki", Size = "M,L,XL", Color = "2 Màu", Image = "images/product004.jpg",
            Description = "Quần jogger đen năng động, chất liệu co giãn tốt.", Stock = 100 // Đã thêm Stock
        },

        // === PHỤ KIỆN ===
        new Product {
            Id = 28, Name = "Giày da lười nam GDL001", Price = 699000M, OriginalPrice = 850000M, Discount = 18,
            Category = "phụ kiện", Size = "39,40,41,42,43", Color = "4 Màu", Image = "images/product28.jpg",
            Description = "Giày da lười nam từ GUYN, thời trang.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 29, Name = "Thắt lưng da bò nam TLDB001", Price = 499000M, OriginalPrice = 600000M, Discount = 17,
            Category = "phụ kiện", Size = "One Size", Color = "3 Màu", Image = "images/product29.jpg",
            Description = "Thắt lưng da bò nam từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 30, Name = "Túi xách da nam TXD001", Price = 899000M, OriginalPrice = 1100000M, Discount = 18,
            Category = "phụ kiện", Size = "One Size", Color = "4 Màu", Image = "images/product30.jpg",
            Description = "Túi xách da nam từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 38, Name = "Giày sneaker nam GSN001", Price = 749000M, OriginalPrice = 900000M, Discount = 17,
            Category = "phụ kiện", Size = "39,40,41,42,43", Color = "5 Màu", Image = "images/product38.jpg",
            Description = "Giày sneaker nam từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 39, Name = "Thắt lưng da lộn TLDN001", Price = 429000M, OriginalPrice = 550000M, Discount = 22,
            Category = "phụ kiện", Size = "One Size", Color = "2 Màu", Image = "images/product39.jpg",
            Description = "Thắt lưng da lộn từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 40, Name = "Túi đeo chéo nam TDC001", Price = 699000M, OriginalPrice = 850000M, Discount = 18,
            Category = "phụ kiện", Size = "One Size", Color = "3 Màu", Image = "images/product40.jpg",
            Description = "Túi đeo chéo nam từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 48, Name = "Giày boots nam GBT001", Price = 899000M, OriginalPrice = 1100000M, Discount = 18,
            Category = "phụ kiện", Size = "39,40,41,42,43", Color = "3 Màu", Image = "images/product48.jpg",
            Description = "Giày boots nam từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 49, Name = "Thắt lưng vải TLVI001", Price = 349000M, OriginalPrice = 450000M, Discount = 22,
            Category = "phụ kiện", Size = "One Size", Color = "2 Màu", Image = "images/product49.jpg",
            Description = "Thắt lưng vải từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 50, Name = "Túi tote nam TTO001", Price = 749000M, OriginalPrice = 900000M, Discount = 17,
            Category = "phụ kiện", Size = "One Size", Color = "4 Màu", Image = "images/product50.jpg",
            Description = "Túi tote nam từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 56, Name = "Giày Da Nam Lịch Lãm", Price = 1500000M, OriginalPrice = 1500000M, Discount = 0,
            Category = "phụ kiện", Size = "39,40,41,42", Color = "3 Màu", Image = "images/product06.jpg",
            Description = "Giày da nam lịch lãm, chất liệu cao cấp từ GUYN.", Stock = 100 // Đã thêm Stock
        },
        new Product {
            Id = 60, Name = "Thắt Lưng Da Nam Đen", Price = 400000M, OriginalPrice = 400000M, Discount = 0,
            Category = "phụ kiện", Size = "One Size", Color = "2 Màu", Image = "images/product006.jpg",
            Description = "Thắt lưng da đen nam, thiết kế đơn giản tinh tế.", Stock = 100 // Đã thêm Stock
                }
            );
        }
    }
}