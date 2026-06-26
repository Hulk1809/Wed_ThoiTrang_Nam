using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Thuan.API.Data;
using Thuan.API.Models;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly AppDbContext _context;
        public CartController(AppDbContext context) => _context = context;

        // Resolve user id from token. If token contains an id that exists in DB, use it.
        // Otherwise try to find user by email claim, or create a minimal user record when possible.
        private async Task<int> ResolveOrCreateUserIdAsync()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(userIdString, out var id))
            {
                var exists = await _context.Users.AnyAsync(u => u.Id == id);
                if (exists) return id;
            }

            // Fallback: try to find by email claim
            var email = User.FindFirstValue(ClaimTypes.Email);
            if (!string.IsNullOrEmpty(email))
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user != null) return user.Id;

                // Create a minimal user record so cart operations work for tokens that carry email
                var name = User.Identity?.Name ?? email.Split('@')[0];
                var placeholderPassword = Guid.NewGuid().ToString();
                var userToCreate = new User
                {
                    Name = name,
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(placeholderPassword),
                    Role = "user"
                };
                _context.Users.Add(userToCreate);
                await _context.SaveChangesAsync();
                return userToCreate.Id;
            }

            return -1;
        }

        // DTOs
        public class AddToCartDto { public int ProductId { get; set; } public int Quantity { get; set; } = 1; }
        public class SyncCartDto { public List<AddToCartDto> Items { get; set; } = new(); }
        public class UpdateQuantityDto { public int Quantity { get; set; } }

        // GET /api/Cart
        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var userId = await ResolveOrCreateUserIdAsync();
            if (userId == -1) return Unauthorized("Token không hợp lệ.");
            var cart = await _context.Carts
                .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null)
            {
                // Nếu user không tồn tại trong DB thì không thể tạo Cart do ràng buộc FK
                var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
                if (!userExists) return NotFound("User không tồn tại trong hệ thống.");

                cart = new Cart { UserId = userId };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync();
            }
            return Ok(cart);
        }

        // POST /api/Cart/add
        [HttpPost("add")]
        public async Task<IActionResult> Add(AddToCartDto dto)
        {
            var userId = await ResolveOrCreateUserIdAsync();
            if (userId == -1) return Unauthorized("Token không hợp lệ.");
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId);
            if (product == null) return NotFound("Sản phẩm không tồn tại.");

            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            if (cart == null)
            {
                var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
                if (!userExists) return NotFound("User không tồn tại trong hệ thống.");

                cart = new Cart { UserId = userId, Items = new List<CartItem>() };
                _context.Carts.Add(cart);
            }

            var item = cart.Items.FirstOrDefault(i => i.ProductId == dto.ProductId);
            if (item != null) item.Quantity += dto.Quantity;
            else cart.Items.Add(new CartItem { ProductId = dto.ProductId, Quantity = dto.Quantity });

            await _context.SaveChangesAsync();
            return Ok(cart);
        }

        // POST /api/Cart/sync  (thay thế toàn bộ giỏ bằng dữ liệu gửi lên)
        [HttpPost("sync")]
        public async Task<IActionResult> Sync(SyncCartDto dto)
        {
            var userId = await ResolveOrCreateUserIdAsync();
            if (userId == -1) return Unauthorized("Token không hợp lệ.");
            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            if (cart == null)
            {
                cart = new Cart { UserId = userId, Items = new List<CartItem>() };
                _context.Carts.Add(cart);
            }

            // Xóa item cũ rồi thêm lại theo danh sách gửi lên
            if (cart.Items.Any()) _context.CartItems.RemoveRange(cart.Items);

            var newItems = new List<CartItem>();
            foreach (var incoming in dto.Items)
            {
                if (incoming.Quantity < 1) continue;
                var existsProduct = await _context.Products.AnyAsync(p => p.Id == incoming.ProductId);
                if (!existsProduct) continue;
                newItems.Add(new CartItem { ProductId = incoming.ProductId, Quantity = incoming.Quantity, Cart = cart });
            }
            cart.Items = newItems;
            await _context.SaveChangesAsync();
            return Ok(cart);
        }

        // PUT /api/Cart/item/{productId}  (cập nhật số lượng)
        [HttpPut("item/{productId}")]
        public async Task<IActionResult> UpdateQuantity(int productId, UpdateQuantityDto dto)
        {
            var userId = await ResolveOrCreateUserIdAsync();
            if (userId == -1) return Unauthorized("Token không hợp lệ.");
            if (dto.Quantity < 1) return BadRequest("Quantity phải >= 1.");
            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            if (cart == null) return NotFound("Chưa có giỏ.");
            var item = cart.Items.FirstOrDefault(i => i.ProductId == productId);
            if (item == null) return NotFound("Item không tồn tại.");
            item.Quantity = dto.Quantity;
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        // DELETE /api/Cart/remove/{itemId}
        [HttpDelete("remove/{itemId}")]
        public async Task<IActionResult> Remove(int itemId)
        {
            var userId = await ResolveOrCreateUserIdAsync();
            if (userId == -1) return Unauthorized("Token không hợp lệ.");
            var cartItem = await _context.CartItems.Include(ci => ci.Cart)
                .FirstOrDefaultAsync(ci => ci.Id == itemId && ci.Cart.UserId == userId);
            if (cartItem == null) return NotFound("Không tìm thấy item.");
            _context.CartItems.Remove(cartItem);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã xóa." });
        }

        // DELETE /api/Cart/clear
        [HttpDelete("clear")]
        public async Task<IActionResult> Clear()
        {
            var userId = await ResolveOrCreateUserIdAsync();
            if (userId == -1) return Unauthorized("Token không hợp lệ.");
            var cart = await _context.Carts.Include(c => c.Items).FirstOrDefaultAsync(c => c.UserId == userId);
            if (cart?.Items.Any() == true)
            {
                _context.CartItems.RemoveRange(cart.Items);
                await _context.SaveChangesAsync();
            }
            return Ok(new { message = "Đã dọn giỏ." });
        }
    }
}