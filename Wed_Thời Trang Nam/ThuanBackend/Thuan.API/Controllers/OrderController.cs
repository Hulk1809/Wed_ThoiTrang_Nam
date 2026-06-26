// Controllers/OrderController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims; // Thư viện quan trọng
using Thuan.API.Data;
using Thuan.API.Models;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Bắt buộc người dùng phải đăng nhập
    public class OrderController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrderController(AppDbContext context)
        {
            _context = context;
        }

        // === (ĐÃ SỬA LỖI GetUserId CŨ) ===
        private int GetUserId()
        {
            // Đọc chuẩn .NET: ClaimTypes.NameIdentifier
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier); 
            
            if (int.TryParse(userIdString, out int userId))
            {
                return userId; // Trả về ID (ví dụ: 1)
            }
            return -1; // Lỗi: Trả về -1 (TRÁNH LỖI FOREIGN KEY)
        }
        
        // DTO này lấy từ file OrderController.cs cũ của bạn
        public class CreateOrderDto
        {
            public string ShippingAddress { get; set; } = string.Empty;
            public string PhoneNumber { get; set; } = string.Empty;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            int userId = GetUserId();
            if (userId == -1) return Unauthorized("Token không hợp lệ hoặc thiếu Claim ID.");

            var cart = await _context.Carts
                .Include(c => c.Items) // Dùng "Items" (khớp với Cart.cs)
                .FirstOrDefaultAsync(c => c.UserId == userId);

            if (cart == null || !cart.Items.Any())
            {
                return BadRequest("Giỏ hàng của bạn đang trống.");
            }

            var order = new Order
            {
                UserId = userId,
                OrderDate = DateTime.UtcNow,
                OrderStatus = "Pending", 
                ShippingAddress = dto.ShippingAddress,
                PhoneNumber = dto.PhoneNumber,
                TotalAmount = 0, 
                Items = new List<OrderItem>() // Dùng "Items" (khớp với Order.cs)
            };

            foreach (var cartItem in cart.Items)
            {
                var product = await _context.Products.FindAsync(cartItem.ProductId);

                if (product == null)
                {
                    return BadRequest($"Sản phẩm ID {cartItem.ProductId} không còn tồn tại.");
                }
                if (product.Stock < cartItem.Quantity)
                {
                    return BadRequest($"Không đủ hàng cho sản phẩm '{product.Name}'. Chỉ còn {product.Stock} sản phẩm.");
                }

                var orderItem = new OrderItem
                {
                    ProductId = cartItem.ProductId,
                    Quantity = cartItem.Quantity,
                    Price = product.Price 
                };
                
                order.TotalAmount += (orderItem.Price * orderItem.Quantity); 
                order.Items.Add(orderItem); 
                
                product.Stock -= cartItem.Quantity;
                _context.Products.Update(product);
            }

            _context.Orders.Add(order);
            _context.CartItems.RemoveRange(cart.Items);
            await _context.SaveChangesAsync();

            return Ok(order); 
        }
        
        [HttpGet]
        public async Task<IActionResult> GetOrders()
        {
            int userId = GetUserId();
            if (userId == -1) return Unauthorized("Token không hợp lệ hoặc thiếu Claim ID.");

            var orders = await _context.Orders
                .Include(o => o.Items) // Dùng "Items" (khớp với Order.cs)
                .ThenInclude(oi => oi.Product) 
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.OrderDate) 
                .ToListAsync();

            return Ok(orders);
        }

        // === ADMIN ENDPOINTS ===

        // === GET /api/order/all (ADMIN - Lấy tất cả đơn hàng) ===
        [HttpGet("all")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAllOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = orders,
                count = orders.Count
            });
        }

        // === GET /api/order/{id} (ADMIN/USER - Lấy chi tiết đơn hàng) ===
        [HttpGet("{id}")]
        public async Task<IActionResult> GetOrderById(int id)
        {
            int userId = GetUserId();
            if (userId == -1) return Unauthorized("Token không hợp lệ.");

            var order = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound(new { success = false, message = "Đơn hàng không tồn tại." });

            // User chỉ được xem đơn hàng của mình, admin thì được xem tất cả
            var isAdmin = User.IsInRole("admin");
            if (!isAdmin && order.UserId != userId)
                return Forbid();

            return Ok(new { success = true, data = order });
        }

        // === PUT /api/order/{id}/status (ADMIN - Cập nhật trạng thái đơn hàng) ===
        [HttpPut("{id}/status")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusDto dto)
        {
            var order = await _context.Orders.FindAsync(id);

            if (order == null)
                return NotFound(new { success = false, message = "Đơn hàng không tồn tại." });

            if (string.IsNullOrWhiteSpace(dto.NewStatus))
                return BadRequest(new { success = false, message = "Trạng thái không được bỏ trống." });

            order.OrderStatus = dto.NewStatus;

            try
            {
                _context.Orders.Update(order);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Cập nhật trạng thái thành công.",
                    data = order
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi cập nhật.", detail = ex.Message });
            }
        }

        // === DELETE /api/order/{id} (ADMIN - Xóa đơn hàng) ===
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Items)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound(new { success = false, message = "Đơn hàng không tồn tại." });

            try
            {
                // Trả lại số lượng sản phẩm vào kho
                foreach (var item in order.Items)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product != null)
                    {
                        product.Stock += item.Quantity;
                        _context.Products.Update(product);
                    }
                }

                // Xóa các order items trước
                _context.OrderItems.RemoveRange(order.Items);
                _context.Orders.Remove(order);
                await _context.SaveChangesAsync();

                return Ok(new { success = true, message = "Xóa đơn hàng thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Lỗi xóa.", detail = ex.Message });
            }
        }

        // === GET /api/order/status/{status} (ADMIN - Lấy đơn hàng theo trạng thái) ===
        [HttpGet("status/{status}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetOrdersByStatus(string status)
        {
            var orders = await _context.Orders
                .Include(o => o.Items)
                .ThenInclude(oi => oi.Product)
                .Where(o => o.OrderStatus == status)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();

            return Ok(new
            {
                success = true,
                data = orders,
                count = orders.Count
            });
        }
    }

    // === DTO CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG ===
    public class UpdateOrderStatusDto
    {
        public string NewStatus { get; set; } = string.Empty;
    }
}