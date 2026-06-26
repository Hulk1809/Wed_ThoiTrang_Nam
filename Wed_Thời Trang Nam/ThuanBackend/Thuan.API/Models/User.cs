// Models/User.cs
using System.ComponentModel.DataAnnotations;
namespace Thuan.API.Models
{
    public class User
    {
        public int Id { get; set; } // ID Tự động tăng

        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress] // Bắt buộc phải là email
        public string Email { get; set; } = string.Empty;

        [Required]
        public string PasswordHash { get; set; } = string.Empty; // Sẽ lưu mật khẩu đã "băm"

        public string Role { get; set; } = "user"; // "user" hoặc "admin"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; // Ngày tạo
    }
}