using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims; // Thư viện quan trọng
using System.Text;
using Thuan.API.Data; 
using Thuan.API.Models; 
using BCrypt.Net; 

namespace Thuan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        // === (ĐÃ SỬA LỖI GÕ THIẾU Ở ĐÂY) ===
        private readonly AppDbContext _context; // <-- THÊM DÒNG NÀY
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context; // Dòng này sẽ hết lỗi
            _config = config; 
        }

        // === API ĐĂNG KÝ (KHỚP VỚI DTO CỦA BẠN) ===
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
                if (existingUser != null)
                {
                    return Conflict(new { error = "Email đã được đăng ký." });
                }

                string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

                var user = new User
                {
                    Name = dto.Name,
                    Email = dto.Email,
                    PasswordHash = passwordHash,
                    Role = "user"
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(Login), new { id = user.Id }, new { message = "Đăng ký thành công!" });
            }
            catch (Exception ex)
            {
                // Return minimal exception message for local debugging. Remove in production.
                return StatusCode(500, new { error = "Đã xảy ra lỗi khi tạo tài khoản.", detail = ex.Message });
            }
        }

        // === API ĐĂNG NHẬP ===
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized("Email hoặc mật khẩu không đúng.");
            }
            var token = CreateJwtToken(user);
            return Ok(new
            {
                message = "Đăng nhập thành công!",
                token = token,
                user = new { id = user.Id, name = user.Name, email = user.Email, role = user.Role }
            });
        }

        // === HÀM TẠO TOKEN (CHUẨN 100%) ===
        private string CreateJwtToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _config.GetSection("Jwt:Key").Value!));
            
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256); 
            
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = new JwtSecurityToken(
                issuer: _config.GetSection("Jwt:Issuer").Value,
                audience: _config.GetSection("Jwt:Audience").Value,
                claims: claims,
                expires: DateTime.Now.AddDays(7),
                signingCredentials: creds
            );
            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // === PROFILE ENDPOINT: Lấy thông tin người dùng hiện tại từ JWT ===
        [HttpGet("profile")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> Profile()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out var userId))
            {
                return Unauthorized(new { error = "Token không hợp lệ." });
            }
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
            {
                return NotFound(new { error = "Không tìm thấy người dùng." });
            }
            return Ok(new { id = user.Id, name = user.Name, email = user.Email, role = user.Role });
        }
    }
}