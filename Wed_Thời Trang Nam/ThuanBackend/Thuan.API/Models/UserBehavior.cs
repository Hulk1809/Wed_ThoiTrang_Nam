// Models/UserBehavior.cs
using System.ComponentModel.DataAnnotations;

namespace Thuan.API.Models
{
    public class UserBehavior
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; } // ID người dùng (hoặc 0 nếu không login)

        [Required]
        public string EventType { get; set; } = string.Empty; // "view", "click", "add_to_cart", "search", "purchase"

        public int? ProductId { get; set; } // ID sản phẩm (nếu có liên quan)

        public string EventData { get; set; } = string.Empty; // JSON data bổ sung

        // === TIME TRACKING (MỚI) ===
        public int? DurationSeconds { get; set; } // Bao lâu xem (giây)

        public string? PageName { get; set; } // Trang nào: "index", "sanpham", "chitietsp", ...

        public string? Interest { get; set; } // Quan tâm gì: JSON {"color": "đỏ", "style": "casual", "size": "M"}

        public DateTime? StartedAt { get; set; } // Lúc nào bắt đầu

        public DateTime? EndedAt { get; set; } // Lúc nào kết thúc

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
