// Controllers/DataMiningController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Thuan.API.Data;
using Thuan.API.Services;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DataMiningController : ControllerBase
    {
        private readonly DataMiningService _dataMiningService;
        private readonly AdStrategyService _adStrategyService;
        private readonly AppDbContext _context;

        public DataMiningController(
            DataMiningService dataMiningService,
            AdStrategyService adStrategyService,
            AppDbContext context)
        {
            _dataMiningService = dataMiningService;
            _adStrategyService = adStrategyService;
            _context = context;
        }

        // POST /api/datamining/kmeans - Chạy K-means clustering
        [HttpPost("kmeans")]
        public async Task<IActionResult> RunKMeans([FromBody] KMeansRequestDto dto)
        {
            try
            {
                int k = dto.K > 0 ? dto.K : 3; // Mặc định 3 clusters

                var result = await _dataMiningService.ClusterCustomersAsync(k);

                return Ok(new
                {
                    message = "K-means clustering completed",
                    k = result.K,
                    clusterCount = result.Clusters.Count,
                    userProfiles = result.UserProfiles,
                    clusters = result.Clusters.ToDictionary(
                        kvp => kvp.Key.ToString(),
                        kvp => new { userCount = kvp.Value.Count, userIds = kvp.Value }
                    )
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Lỗi: {ex.Message}" });
            }
        }

        // GET /api/datamining/analysis - Phân tích chi tiết hành vi
        [HttpGet("analysis")]
        public async Task<IActionResult> GetBehaviorAnalysis()
        {
            try
            {
                var result = await _dataMiningService.ClusterCustomersAsync(3);

                var analysis = new
                {
                    timestamp = DateTime.UtcNow,
                    totalClusters = result.K,
                    userProfiles = result.UserProfiles.Select(p => new
                    {
                        clusterId = p.ClusterId,
                        name = p.ProfileName,
                        userCount = p.UserCount,
                        averageEngagement = Math.Round(p.AverageEngagement, 2),
                        averageWatchTime = Math.Round(p.AverageWatchTime, 2),
                        description = p.ProfileName switch
                        {
                            "High Engagement" => "Khách hàng rất quan tâm, thường xuyên xem video và sản phẩm",
                            "Medium Engagement" => "Khách hàng có quan tâm vừa phải, xem đôi khi",
                            "Low Engagement" => "Khách hàng ít quan tâm, hiếm khi tương tác",
                            _ => ""
                        }
                    }).ToList()
                };

                return Ok(analysis);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Lỗi: {ex.Message}" });
            }
        }

        // GET /api/datamining/users-behavior - Hành vi chi tiết từng tài khoản (admin dashboard)
        [HttpGet("users-behavior")]
        public async Task<IActionResult> GetUsersBehaviorDetail([FromQuery] int? userId = null)
        {
            try
            {
                var behaviorUserIds = await _context.UserBehaviors.Select(b => b.UserId).ToListAsync();
                var videoUserIds = await _context.VideoTrackings.Select(v => v.UserId).ToListAsync();
                var uploadUserIds = await _context.UploadedFiles
                    .Where(f => f.UserId.HasValue)
                    .Select(f => f.UserId!.Value)
                    .ToListAsync();

                var allUserIds = behaviorUserIds
                    .Concat(videoUserIds)
                    .Concat(uploadUserIds)
                    .Distinct()
                    .ToList();

                if (userId.HasValue)
                    allUserIds = allUserIds.Where(id => id == userId.Value).ToList();

                var users = await _context.Users
                    .Where(u => allUserIds.Contains(u.Id))
                    .OrderBy(u => u.Name)
                    .ToListAsync();

                var productNames = await _context.Products.ToDictionaryAsync(p => p.Id, p => p.Name);

                var result = new List<object>();
                foreach (var user in users)
                {
                    var videos = await _context.VideoTrackings
                        .Where(v => v.UserId == user.Id)
                        .OrderByDescending(v => v.WatchedAt)
                        .Select(v => new
                        {
                            v.Id,
                            v.VideoTitle,
                            v.VideoUrl,
                            watchedSeconds = v.WatchedSeconds,
                            totalDuration = v.TotalDuration,
                            watchPercentage = Math.Round(v.WatchPercentage, 1),
                            interest = v.Interest,
                            v.WatchedAt
                        })
                        .ToListAsync();

                    var productViews = await _context.UserBehaviors
                        .Where(b => b.UserId == user.Id
                            && b.EventType == "view"
                            && b.DurationSeconds != null
                            && b.DurationSeconds > 0)
                        .OrderByDescending(b => b.CreatedAt)
                        .Select(b => new
                        {
                            b.Id,
                            b.ProductId,
                            durationSeconds = b.DurationSeconds,
                            interest = b.Interest,
                            b.PageName,
                            b.CreatedAt
                        })
                        .ToListAsync();

                    var productViewsWithName = productViews.Select(pv => new
                    {
                        pv.Id,
                        pv.ProductId,
                        productName = pv.ProductId.HasValue && productNames.ContainsKey(pv.ProductId.Value)
                            ? productNames[pv.ProductId.Value]
                            : null,
                        pv.durationSeconds,
                        pv.interest,
                        pv.PageName,
                        pv.CreatedAt
                    }).ToList();

                    var uploads = await _context.UploadedFiles
                        .Where(f => f.UserId == user.Id)
                        .OrderByDescending(f => f.UploadedAt)
                        .Select(f => new
                        {
                            f.Id,
                            f.FileName,
                            f.FileUrl,
                            f.FileType,
                            fileSizeBytes = f.FileSizeBytes,
                            f.Description,
                            f.UploadedAt,
                            f.DownloadCount
                        })
                        .ToListAsync();

                    var eventSummary = await _context.UserBehaviors
                        .Where(b => b.UserId == user.Id)
                        .GroupBy(b => b.EventType)
                        .Select(g => new { eventType = g.Key, count = g.Count() })
                        .ToListAsync();

                    result.Add(new
                    {
                        userId = user.Id,
                        name = user.Name,
                        email = user.Email,
                        role = user.Role,
                        summary = new
                        {
                            totalEvents = eventSummary.Sum(e => e.count),
                            videoCount = videos.Count,
                            productViewCount = productViewsWithName.Count,
                            uploadCount = uploads.Count
                        },
                        eventSummary,
                        videos,
                        productViews = productViewsWithName,
                        uploads
                    });
                }

                return Ok(new { data = result, count = result.Count });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Lỗi: {ex.Message}" });
            }
        }

        // POST /api/datamining/ad-strategy - AI Gemini đề xuất chiến lược xoay kênh quảng cáo
        [HttpPost("ad-strategy")]
        public async Task<IActionResult> GenerateAdStrategy(CancellationToken cancellationToken)
        {
            try
            {
                var (strategy, source) = await _adStrategyService.GenerateStrategyAsync(cancellationToken);
                return Ok(new
                {
                    message = source == "gemini"
                        ? "Gemini AI đã phân tích và đề xuất chiến lược quảng cáo"
                        : "Đề xuất chiến lược (phân tích local — Gemini không khả dụng)",
                    source,
                    generatedAt = DateTime.UtcNow,
                    strategy
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Lỗi AI: {ex.Message}" });
            }
        }
    }

    // DTO
    public class KMeansRequestDto
    {
        public int K { get; set; } = 3; // Số nhóm (mặc định 3)
    }
}
