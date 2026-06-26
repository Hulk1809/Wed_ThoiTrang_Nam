using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Thuan.API.Data;
using Thuan.API.Models;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")] // Chỉ admin mới truy cập
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // === 1. GET /api/users (Lấy danh sách tất cả người dùng) ===
        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _context.Users
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.Role,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = users,
                count = users.Count
            });
        }

        // === 2. GET /api/users/{id} (Lấy chi tiết một người dùng) ===
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { success = false, message = "Người dùng không tồn tại." });
            }

            return Ok(new
            {
                success = true,
                data = new
                {
                    user.Id,
                    user.Name,
                    user.Email,
                    user.Role,
                    user.CreatedAt
                }
            });
        }

        // === 3. PUT /api/users/{id} (Cập nhật thông tin người dùng) ===
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { success = false, message = "Người dùng không tồn tại." });
            }

            // Cập nhật các trường được phép
            if (!string.IsNullOrWhiteSpace(dto.Name))
                user.Name = dto.Name;

            if (!string.IsNullOrWhiteSpace(dto.Email))
            {
                // Kiểm tra email đã tồn tại chưa
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email && u.Id != id);
                if (existingUser != null)
                    return BadRequest(new { success = false, message = "Email đã được sử dụng." });

                user.Email = dto.Email;
            }

            if (!string.IsNullOrWhiteSpace(dto.Role))
                user.Role = dto.Role;

            try
            {
                _context.Users.Update(user);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật thành công.",
                    data = new { user.Id, user.Name, user.Email, user.Role }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi cập nhật.", detail = ex.Message });
            }
        }

        // === 4. DELETE /api/users/{id} (Xóa người dùng) ===
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { success = false, message = "Người dùng không tồn tại." });
            }

            try
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Xóa người dùng thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi xóa người dùng.", detail = ex.Message });
            }
        }

        // === 5. GET /api/users/role/{role} (Lấy người dùng theo role) ===
        [HttpGet("role/{role}")]
        public async Task<IActionResult> GetUsersByRole(string role)
        {
            var users = await _context.Users
                .Where(u => u.Role == role)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.Role,
                    u.CreatedAt
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = users,
                count = users.Count
            });
        }

        // === 6. PUT /api/users/{id}/role (Thay đổi role người dùng) ===
        [HttpPut("{id}/role")]
        public async Task<IActionResult> ChangeUserRole(int id, [FromBody] ChangeRoleDto dto)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound(new { success = false, message = "Người dùng không tồn tại." });
            }

            if (string.IsNullOrWhiteSpace(dto.NewRole))
            {
                return BadRequest(new { success = false, message = "Role không được bỏ trống." });
            }

            user.Role = dto.NewRole;

            try
            {
                _context.Users.Update(user);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = $"Đã thay đổi role thành '{dto.NewRole}'.",
                    data = new { user.Id, user.Name, user.Email, user.Role }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi thay đổi role.", detail = ex.Message });
            }
        }
    }

    // === DTO CẬP NHẬT NGƯỜI DÙNG ===
    public class UpdateUserDto
    {
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Role { get; set; }
    }

    // === DTO THAY ĐỔI ROLE ===
    public class ChangeRoleDto
    {
        public string NewRole { get; set; } = string.Empty;
    }
}
