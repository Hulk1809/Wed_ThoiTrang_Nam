// Models/OrderItem.cs
using System.ComponentModel.DataAnnotations.Schema;

namespace Thuan.API.Models
{
    public class OrderItem
    {
        public int Id { get; set; }
        
        public int OrderId { get; set; } // Thuộc đơn hàng nào
        public Order Order { get; set; } = null!; // Liên kết

        public int ProductId { get; set; } // Sản phẩm gì
        public Product Product { get; set; } = null!; // Liên kết
        
        public int Quantity { get; set; } // Số lượng
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; } // Giá tại thời điểm đặt (quan trọng)
    }
}