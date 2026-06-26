// Models/CartItem.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Thuan.API.Models
{
    public class CartItem
    {
        public int Id { get; set; }
        
        // Liên kết với Cart (Khóa ngoại)
        public int CartId { get; set; }
        // public Cart Cart { get; set; } // Bạn có thể thêm nếu muốn
        public Cart Cart { get; set; } = null!;
        // Liên kết với Product (Khóa ngoại)
        public int ProductId { get; set; }
        // public Product Product { get; set; } // Bạn có thể thêm nếu muốn
        public Product Product { get; set; } = null!;
        [Range(1, int.MaxValue)]
        public int Quantity { get; set; } // Số lượng sản phẩm
    }
}