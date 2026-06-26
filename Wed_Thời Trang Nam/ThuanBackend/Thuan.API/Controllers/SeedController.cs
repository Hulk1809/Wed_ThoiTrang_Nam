using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Thuan.API.Data;
using Thuan.API.Models;
using BCrypt.Net;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SeedController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SeedController(AppDbContext context)
        {
            _context = context;
        }

        // POST /api/seed/admin - Tạo tài khoản admin (admin@shop.com / admin123)
        [HttpPost("admin")]
        public async Task<IActionResult> EnsureAdminUser()
        {
            const string email = "admin@shop.com";
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                user = new User
                {
                    Name = "Shop Admin",
                    Email = email,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                    Role = "admin",
                    CreatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã tạo tài khoản admin", email, password = "admin123", userId = user.Id });
            }

            if (user.Role != "admin")
            {
                user.Role = "admin";
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123");
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã cập nhật quyền admin", email, password = "admin123", userId = user.Id });
            }

            return Ok(new { message = "Tài khoản admin đã tồn tại", email, password = "admin123", userId = user.Id });
        }

        // GET /api/seed/demo-accounts - Danh sách tài khoản demo
        [HttpGet("demo-accounts")]
        public IActionResult GetDemoAccounts()
        {
            return Ok(new
            {
                password = "demo123",
                message = "Đăng nhập bằng các tài khoản dưới để thu thập dữ liệu hành vi",
                accounts = DemoUserDefinitions.All.Select(u => new
                {
                    u.Email,
                    u.Name,
                    u.Profile,
                    password = "demo123"
                })
            });
        }

        // POST /api/seed/demo - Tạo users demo + dữ liệu hành vi mẫu cho K-means
        [HttpPost("demo")]
        public async Task<IActionResult> SeedDemoData([FromQuery] bool reset = false)
        {
            if (reset)
            {
                var demoEmails = DemoUserDefinitions.All.Select(u => u.Email).ToList();
                var demoUsers = await _context.Users.Where(u => demoEmails.Contains(u.Email)).ToListAsync();
                var demoIds = demoUsers.Select(u => u.Id).ToList();

                if (demoIds.Count > 0)
                {
                    _context.UserBehaviors.RemoveRange(
                        await _context.UserBehaviors.Where(b => demoIds.Contains(b.UserId)).ToListAsync());
                    _context.VideoTrackings.RemoveRange(
                        await _context.VideoTrackings.Where(v => demoIds.Contains(v.UserId)).ToListAsync());
                }
                await _context.SaveChangesAsync();
            }

            var created = new List<object>();
            var seeded = new List<object>();

            foreach (var def in DemoUserDefinitions.All)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == def.Email);
                if (user == null)
                {
                    user = new User
                    {
                        Name = def.Name,
                        Email = def.Email,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("demo123"),
                        Role = "user",
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                    created.Add(new { user.Id, user.Email, user.Name, def.Profile });
                }

                var existingBehaviors = await _context.UserBehaviors.CountAsync(b => b.UserId == user.Id);
                if (existingBehaviors == 0)
                {
                    var behaviors = GenerateBehaviors(user.Id, def);
                    var videos = GenerateVideoTrackings(user.Id, def);
                    _context.UserBehaviors.AddRange(behaviors);
                    _context.VideoTrackings.AddRange(videos);
                    await _context.SaveChangesAsync();
                    seeded.Add(new
                    {
                        userId = user.Id,
                        email = user.Email,
                        profile = def.Profile,
                        behaviorCount = behaviors.Count,
                        videoCount = videos.Count
                    });
                }
            }

            var totalUsers = await _context.UserBehaviors.Select(b => b.UserId).Distinct().CountAsync();

            return Ok(new
            {
                message = "Tạo dữ liệu demo thành công! Có thể chạy K-means ngay.",
                password = "demo123",
                usersCreated = created.Count,
                usersSeeded = seeded.Count,
                totalUsersWithBehavior = totalUsers,
                created,
                seeded,
                accounts = DemoUserDefinitions.All.Select(u => new { u.Email, u.Name, u.Profile })
            });
        }

        private static List<UserBehavior> GenerateBehaviors(int userId, DemoUserDef def)
        {
            var list = new List<UserBehavior>();
            var now = DateTime.UtcNow;
            var rnd = new Random(userId * 1000);

            foreach (var ev in def.Events)
            {
                for (int i = 0; i < ev.Count; i++)
                {
                    var started = now.AddDays(-rnd.Next(1, 30)).AddMinutes(-rnd.Next(0, 1440));
                    list.Add(new UserBehavior
                    {
                        UserId = userId,
                        EventType = ev.Type,
                        ProductId = ev.ProductIds.Length > 0 ? ev.ProductIds[rnd.Next(ev.ProductIds.Length)] : null,
                        EventData = ev.Data ?? "",
                        PageName = ev.PageName,
                        DurationSeconds = ev.DurationSeconds > 0 ? rnd.Next(ev.DurationSeconds / 2, ev.DurationSeconds) : null,
                        Interest = ev.Interest,
                        StartedAt = started,
                        EndedAt = started.AddSeconds(ev.DurationSeconds > 0 ? ev.DurationSeconds : 5),
                        CreatedAt = started
                    });
                }
            }
            return list;
        }

        private static List<VideoTracking> GenerateVideoTrackings(int userId, DemoUserDef def)
        {
            var list = new List<VideoTracking>();
            var rnd = new Random(userId * 2000);
            var now = DateTime.UtcNow;

            for (int i = 0; i < def.VideoCount; i++)
            {
                int total = rnd.Next(120, 600);
                int watched = (int)(total * def.VideoWatchRatio);
                var started = now.AddDays(-rnd.Next(1, 20));
                list.Add(new VideoTracking
                {
                    UserId = userId,
                    VideoUrl = "images/preview/tryon-demo.mp4",
                    VideoTitle = "Video 360° Try-On",
                    WatchedSeconds = watched,
                    TotalDuration = total,
                    WatchPercentage = total > 0 ? (double)watched / total * 100 : 0,
                    Interest = def.VideoInterest,
                    StartedAt = started,
                    EndedAt = started.AddSeconds(watched),
                    WatchedAt = started
                });
            }
            return list;
        }
    }

    internal class DemoUserDef
    {
        public string Email { get; set; } = "";
        public string Name { get; set; } = "";
        public string Profile { get; set; } = "";
        public int VideoCount { get; set; }
        public double VideoWatchRatio { get; set; }
        public string? VideoInterest { get; set; }
        public List<DemoEventDef> Events { get; set; } = new();
    }

    internal class DemoEventDef
    {
        public string Type { get; set; } = "";
        public int Count { get; set; }
        public int[] ProductIds { get; set; } = Array.Empty<int>();
        public string? PageName { get; set; }
        public int DurationSeconds { get; set; }
        public string? Data { get; set; }
        public string? Interest { get; set; }
    }

    internal static class DemoUserDefinitions
    {
        public static readonly List<DemoUserDef> All = new()
        {
            // High Engagement - xem nhiều, lâu, mua hàng
            new DemoUserDef
            {
                Email = "khachvip1@test.com", Name = "Minh VIP", Profile = "High Engagement",
                VideoCount = 8, VideoWatchRatio = 0.92,
                VideoInterest = """{"style":"casual","color":"đen"}""",
                Events = new List<DemoEventDef>
                {
                    new() { Type = "view", Count = 25, ProductIds = new[]{1,2,3,5,11,16}, PageName = "chitietsp", DurationSeconds = 120, Interest = """{"color":"đen","size":"L"}""" },
                    new() { Type = "click", Count = 12, ProductIds = new[]{1,2,3}, PageName = "sanpham" },
                    new() { Type = "add_to_cart", Count = 8, ProductIds = new[]{1,3,11}, Data = "quantity: 1" },
                    new() { Type = "purchase", Count = 5, ProductIds = new[]{1,11}, Data = "order completed" },
                    new() { Type = "search", Count = 6, Data = "query: áo khoác", PageName = "sanpham" }
                }
            },
            new DemoUserDef
            {
                Email = "khachvip2@test.com", Name = "Hùng VIP", Profile = "High Engagement",
                VideoCount = 6, VideoWatchRatio = 0.88,
                VideoInterest = """{"style":"formal","color":"xanh navy"}""",
                Events = new List<DemoEventDef>
                {
                    new() { Type = "view", Count = 20, ProductIds = new[]{22,32,42,59}, PageName = "chitietsp", DurationSeconds = 90, Interest = """{"style":"office"}""" },
                    new() { Type = "click", Count = 10, ProductIds = new[]{22,32}, PageName = "sanpham" },
                    new() { Type = "add_to_cart", Count = 6, ProductIds = new[]{22,59}, Data = "quantity: 2" },
                    new() { Type = "purchase", Count = 4, ProductIds = new[]{22}, Data = "order completed" },
                    new() { Type = "page_view", Count = 15, PageName = "index", Data = "page: index" }
                }
            },
            // Medium Engagement
            new DemoUserDef
            {
                Email = "khachthuong1@test.com", Name = "Lan Thường", Profile = "Medium Engagement",
                VideoCount = 3, VideoWatchRatio = 0.55,
                VideoInterest = """{"style":"casual","color":"xám"}""",
                Events = new List<DemoEventDef>
                {
                    new() { Type = "view", Count = 10, ProductIds = new[]{5,7,12,15}, PageName = "chitietsp", DurationSeconds = 45 },
                    new() { Type = "click", Count = 5, ProductIds = new[]{5,12}, PageName = "sanpham" },
                    new() { Type = "add_to_cart", Count = 2, ProductIds = new[]{5}, Data = "quantity: 1" },
                    new() { Type = "search", Count = 3, Data = "query: áo polo", PageName = "sanpham" }
                }
            },
            new DemoUserDef
            {
                Email = "khachthuong2@test.com", Name = "Mai Thường", Profile = "Medium Engagement",
                VideoCount = 2, VideoWatchRatio = 0.48,
                VideoInterest = """{"color":"trắng"}""",
                Events = new List<DemoEventDef>
                {
                    new() { Type = "view", Count = 8, ProductIds = new[]{23,33,43,15}, PageName = "chitietsp", DurationSeconds = 35 },
                    new() { Type = "click", Count = 4, ProductIds = new[]{15,23}, PageName = "sanpham" },
                    new() { Type = "add_to_cart", Count = 1, ProductIds = new[]{15}, Data = "quantity: 1" },
                    new() { Type = "page_view", Count = 6, PageName = "index" }
                }
            },
            // Low Engagement
            new DemoUserDef
            {
                Email = "khachmoi1@test.com", Name = "Tú Mới", Profile = "Low Engagement",
                VideoCount = 1, VideoWatchRatio = 0.15,
                VideoInterest = """{"style":"basic"}""",
                Events = new List<DemoEventDef>
                {
                    new() { Type = "view", Count = 2, ProductIds = new[]{1}, PageName = "chitietsp", DurationSeconds = 10 },
                    new() { Type = "page_view", Count = 3, PageName = "index" }
                }
            },
            new DemoUserDef
            {
                Email = "khachmoi2@test.com", Name = "Nam Mới", Profile = "Low Engagement",
                VideoCount = 0, VideoWatchRatio = 0,
                Events = new List<DemoEventDef>
                {
                    new() { Type = "view", Count = 1, ProductIds = new[]{12}, PageName = "chitietsp", DurationSeconds = 5 },
                    new() { Type = "page_view", Count = 2, PageName = "sanpham" }
                }
            }
        };
    }
}
