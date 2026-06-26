// Models/VideoTracking.cs
using System.ComponentModel.DataAnnotations;

namespace Thuan.API.Models
{
    public class VideoTracking
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [Required]
        public string VideoUrl { get; set; } = string.Empty;

        public string? VideoTitle { get; set; } // Tên video

        [Required]
        public int WatchedSeconds { get; set; } // Đoạn xem được (giây)

        [Required]
        public int TotalDuration { get; set; } // Tổng độ dài video (giây)

        public double WatchPercentage { get; set; } // % xem (0-100)

        public string? Interest { get; set; } // Quan tâm gì (JSON: {"color": "đỏ", "style": "casual"})

        public DateTime WatchedAt { get; set; } = DateTime.UtcNow;

        public DateTime? StartedAt { get; set; } // Lúc nào bắt đầu xem

        public DateTime? EndedAt { get; set; } // Lúc nào kết thúc xem
    }
}
