// Models/Cart.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Thuan.API.Models
{
    public class Cart
    {
        public int Id { get; set; }
        
        // Liên kết với User (Khóa ngoại)
        public int UserId { get; set; }
        // public User User { get; set; } // Bạn có thể thêm nếu muốn
        public User User { get; set; } = null!;
        // Danh sách các mặt hàng trong giỏ
        public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
    }
}