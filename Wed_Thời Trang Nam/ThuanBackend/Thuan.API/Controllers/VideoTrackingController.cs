// Controllers/VideoTrackingController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Thuan.API.Data;
using Thuan.API.Models;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VideoTrackingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VideoTrackingController(AppDbContext context)
        {
            _context = context;
        }

        // POST /api/videotracking - Log xem video
        [HttpPost]
        public async Task<IActionResult> LogVideoView([FromBody] LogVideoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.VideoUrl))
                return BadRequest(new { message = "VideoUrl là bắt buộc" });

            // Tính % xem
            double watchPercentage = dto.TotalDuration > 0 ? (dto.WatchedSeconds / (double)dto.TotalDuration) * 100 : 0;

            var videoTracking = new VideoTracking
            {
                UserId = dto.UserId,
                VideoUrl = dto.VideoUrl,
                VideoTitle = dto.VideoTitle,
                WatchedSeconds = dto.WatchedSeconds,
                TotalDuration = dto.TotalDuration,
                WatchPercentage = watchPercentage,
                Interest = dto.Interest,
                StartedAt = dto.StartedAt ?? DateTime.UtcNow,
                EndedAt = dto.EndedAt ?? DateTime.UtcNow,
                WatchedAt = DateTime.UtcNow
            };

            _context.VideoTrackings.Add(videoTracking);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Video view logged successfully", id = videoTracking.Id });
        }

        // GET /api/videotracking/{userId} - Lấy video tracking của user
        [HttpGet("{userId}")]
        public async Task<IActionResult> GetUserVideoTracking(int userId)
        {
            var trackings = await _context.VideoTrackings
                .Where(v => v.UserId == userId)
                .OrderByDescending(v => v.WatchedAt)
                .ToListAsync();

            return Ok(new { data = trackings, count = trackings.Count });
        }

        // GET /api/videotracking/stats/top-videos - Video được xem nhiều nhất
        [HttpGet("stats/top-videos")]
        public async Task<IActionResult> GetTopVideos(int limit = 10)
        {
            var topVideos = await _context.VideoTrackings
                .GroupBy(v => v.VideoUrl)
                .Select(g => new
                {
                    videoUrl = g.Key,
                    viewCount = g.Count(),
                    averageWatchPercentage = g.Average(v => v.WatchPercentage),
                    totalWatchedSeconds = g.Sum(v => v.WatchedSeconds)
                })
                .OrderByDescending(x => x.viewCount)
                .Take(limit)
                .ToListAsync();

            return Ok(new { data = topVideos });
        }

        // GET /api/videotracking/stats/completion-rate - Tỷ lệ xem hoàn toàn
        [HttpGet("stats/completion-rate")]
        public async Task<IActionResult> GetCompletionRate(double completeThreshold = 90)
        {
            var totalViews = await _context.VideoTrackings.CountAsync();
            var completedViews = await _context.VideoTrackings
                .Where(v => v.WatchPercentage >= completeThreshold)
                .CountAsync();

            double completionRate = totalViews > 0 ? (completedViews / (double)totalViews) * 100 : 0;

            return Ok(new
            {
                totalViews,
                completedViews,
                completionRate = Math.Round(completionRate, 2),
                completeThreshold
            });
        }

        // GET /api/videotracking/stats/interest - Phân tích quan tâm
        [HttpGet("stats/interest")]
        public async Task<IActionResult> GetInterestAnalysis()
        {
            var allTrackings = await _context.VideoTrackings.ToListAsync();

            var interestMap = new Dictionary<string, int>();

            foreach (var tracking in allTrackings)
            {
                if (string.IsNullOrEmpty(tracking.Interest)) continue;

                try
                {
                    var interests = System.Text.Json.JsonDocument.Parse(tracking.Interest);
                    foreach (var prop in interests.RootElement.EnumerateObject())
                    {
                        string key = $"{prop.Name}: {prop.Value}";
                        if (!interestMap.ContainsKey(key))
                            interestMap[key] = 0;
                        interestMap[key]++;
                    }
                }
                catch { }
            }

            var result = interestMap
                .OrderByDescending(x => x.Value)
                .Take(20)
                .ToDictionary(x => x.Key, x => x.Value);

            return Ok(new { data = result });
        }
    }

    // DTO
    public class LogVideoDto
    {
        public int UserId { get; set; }
        public string VideoUrl { get; set; } = string.Empty;
        public string? VideoTitle { get; set; }
        public int WatchedSeconds { get; set; } // Đoạn xem được
        public int TotalDuration { get; set; } // Độ dài video
        public string? Interest { get; set; } // JSON: {"color": "đỏ", "style": "casual"}
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
    }
}
