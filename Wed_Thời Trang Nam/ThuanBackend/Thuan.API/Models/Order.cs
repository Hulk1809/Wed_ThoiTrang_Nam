// Models/Order.cs
using System.ComponentModel.DataAnnotations.Schema;

namespace Thuan.API.Models

{
    public class Order
    {
        public int Id { get; set; }
        public int UserId { get; set; } // Người dùng đặt hàng
        public User User { get; set; } = null!; // Liên kết

        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public string OrderStatus { get; set; } = "Pending"; // Trạng thái: Pending, Completed, Cancelled
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; } // Tổng số tiền

        // Địa chỉ giao hàng
        public string ShippingAddress { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        
        // Danh sách các mặt hàng trong đơn
        public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    }
}