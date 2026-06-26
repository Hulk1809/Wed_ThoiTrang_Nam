using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Thuan.API.Data;
using Thuan.API.Models;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserBehaviorController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UserBehaviorController(AppDbContext context)
        {
            _context = context;
        }

        // POST /api/userbehavior - Log một event
        [HttpPost]
        public async Task<IActionResult> LogEvent([FromBody] LogEventDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.EventType))
                return BadRequest(new { message = "EventType là bắt buộc" });

            var behavior = new UserBehavior
            {
                UserId = dto.UserId,
                EventType = dto.EventType,
                ProductId = dto.ProductId,
                EventData = dto.EventData ?? "",
                DurationSeconds = dto.DurationSeconds,
                PageName = dto.PageName,
                Interest = dto.Interest,
                StartedAt = dto.StartedAt ?? DateTime.UtcNow,
                EndedAt = dto.EndedAt ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserBehaviors.Add(behavior);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Event logged successfully", id = behavior.Id });
        }

        // GET /api/userbehavior?userId={id} - Lấy behavior của user (hoặc tất cả nếu không truyền userId)
        [HttpGet]
        public async Task<IActionResult> GetUserBehaviors([FromQuery] int? userId = null)
        {
            var query = _context.UserBehaviors.AsQueryable();
            if (userId.HasValue)
            {
                query = query.Where(b => b.UserId == userId.Value);
            }

            var behaviors = await query
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return Ok(new { data = behaviors, count = behaviors.Count });
        }

        // GET /api/userbehavior/event-stats - Thống kê events
        [HttpGet("event-stats")]
        public async Task<IActionResult> GetEventStats()
        {
            var stats = await _context.UserBehaviors
                .GroupBy(b => b.EventType)
                .Select(g => new { eventType = g.Key, count = g.Count() })
                .ToListAsync();

            return Ok(new { data = stats });
        }

        // GET /api/userbehavior/product-views/{productId} - Thống kê view sản phẩm
        [HttpGet("product-views/{productId}")]
        public async Task<IActionResult> GetProductViews(int productId)
        {
            var viewCount = await _context.UserBehaviors
                .Where(b => b.ProductId == productId && b.EventType == "view")
                .CountAsync();

            return Ok(new { productId, viewCount });
        }

        // GET /api/userbehavior/top-products - Top products được view
        [HttpGet("top-products")]
        public async Task<IActionResult> GetTopProducts(int limit = 10)
        {
            var topProducts = await _context.UserBehaviors
                .Where(b => b.EventType == "view" && b.ProductId.HasValue)
                .GroupBy(b => b.ProductId)
                .Select(g => new { productId = g.Key, viewCount = g.Count() })
                .OrderByDescending(x => x.viewCount)
                .Take(limit)
                .ToListAsync();

            return Ok(new { data = topProducts });
        }
    }

    // DTO
    public class LogEventDto
    {
        public int UserId { get; set; }
        public string EventType { get; set; } = string.Empty;
        public int? ProductId { get; set; }
        public string? EventData { get; set; }
        
        // === Thêm fields mới ===
        public int? DurationSeconds { get; set; } // Bao lâu xem (giây)
        public string? PageName { get; set; } // Trang nào
        public string? Interest { get; set; } // JSON: {"color": "đỏ", "style": "casual"}
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
    }
}
