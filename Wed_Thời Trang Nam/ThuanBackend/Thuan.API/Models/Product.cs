// Models/Product.cs
using System.ComponentModel.DataAnnotations;
namespace Thuan.API.Models
{
    public class Product
    {
        public int Id { get; set; } 
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal? OriginalPrice { get; set; }
        public int? Discount { get; set; }
        public string Category { get; set; } = string.Empty;
        // ĐÃ SỬA LỖI CÚ PHÁP
        public string Size { get; set; } = string.Empty; 
        public string Color { get; set; } = string.Empty; 
        public int Stock { get; set; } 
        public string Image { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PreviewImages { get; set; } = string.Empty;
        public string VideoUrl { get; set; } = string.Empty;
    }
}