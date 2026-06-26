// Models/UploadedFile.cs
using System.ComponentModel.DataAnnotations;

namespace Thuan.API.Models
{
    public class UploadedFile
    {
        public int Id { get; set; }

        [Required]
        public string FileName { get; set; } = string.Empty;

        [Required]
        public string FileUrl { get; set; } = string.Empty; // Đường dẫn file đã lưu

        [Required]
        public string FileType { get; set; } = string.Empty; // "video", "image", "document"

        public long FileSizeBytes { get; set; }

        public int? UserId { get; set; } // Ai upload (null nếu anonymous)

        public string? Description { get; set; }

        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        public int DownloadCount { get; set; } = 0;
    }
}
