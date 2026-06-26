using Thuan.API.Data;
using Microsoft.EntityFrameworkCore;

namespace Thuan.API.Services
{
    public class AdStrategyService
    {
        private readonly AppDbContext _context;
        private readonly DataMiningService _dataMining;
        private readonly GeminiService _gemini;

        public AdStrategyService(AppDbContext context, DataMiningService dataMining, GeminiService gemini)
        {
            _context = context;
            _dataMining = dataMining;
            _gemini = gemini;
        }

        public async Task<object> BuildMiningContextAsync()
        {
            var eventStats = await _context.UserBehaviors
                .GroupBy(b => b.EventType)
                .Select(g => new { eventType = g.Key, count = g.Count() })
                .ToListAsync();

            var topProducts = await _context.UserBehaviors
                .Where(b => b.ProductId.HasValue && b.EventType == "view")
                .GroupBy(b => b.ProductId)
                .Select(g => new { productId = g.Key, viewCount = g.Count() })
                .OrderByDescending(x => x.viewCount)
                .Take(8)
                .ToListAsync();

            var productNames = await _context.Products.ToDictionaryAsync(p => p.Id, p => p.Name);
            var topProductsNamed = topProducts.Select(p => new
            {
                p.productId,
                productName = p.productId.HasValue && productNames.ContainsKey(p.productId.Value)
                    ? productNames[p.productId.Value]
                    : $"SP #{p.productId}",
                p.viewCount
            }).ToList();

            var topVideos = await _context.VideoTrackings
                .GroupBy(v => new { v.VideoUrl, v.VideoTitle })
                .Select(g => new
                {
                    g.Key.VideoTitle,
                    g.Key.VideoUrl,
                    viewCount = g.Count(),
                    avgWatchPercent = g.Average(v => v.WatchPercentage)
                })
                .OrderByDescending(x => x.viewCount)
                .Take(8)
                .ToListAsync();

            var totalViews = await _context.VideoTrackings.CountAsync();
            var completedViews = await _context.VideoTrackings.CountAsync(v => v.WatchPercentage >= 80);
            var completionRate = totalViews > 0 ? Math.Round((double)completedViews / totalViews * 100, 1) : 0;

            var interestRaw = await _context.VideoTrackings
                .Where(v => v.Interest != null)
                .Select(v => v.Interest!)
                .Take(200)
                .ToListAsync();

            var interestCounts = new Dictionary<string, int>();
            foreach (var raw in interestRaw)
            {
                try
                {
                    var doc = System.Text.Json.JsonDocument.Parse(raw);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                    {
                        var key = prop.Name;
                        interestCounts[key] = interestCounts.GetValueOrDefault(key) + 1;
                    }
                }
                catch { /* skip invalid json */ }
            }

            object? kmeans = null;
            try
            {
                var result = await _dataMining.ClusterCustomersAsync(3);
                kmeans = new
                {
                    k = result.K,
                    profiles = result.UserProfiles.Select(p => new
                    {
                        p.ClusterId,
                        p.ProfileName,
                        p.UserCount,
                        averageEngagement = Math.Round(p.AverageEngagement, 2),
                        averageWatchTime = Math.Round(p.AverageWatchTime, 2)
                    })
                };
            }
            catch (Exception ex)
            {
                kmeans = new { error = ex.Message };
            }

            var userCount = await _context.UserBehaviors.Select(b => b.UserId).Distinct().CountAsync();
            var totalEvents = eventStats.Sum(e => e.count);

            if (userCount < 2 || totalEvents < 5)
                throw new InvalidOperationException(
                    "Chưa đủ dữ liệu người dùng. Hãy nhấn 'Tạo dữ liệu demo' hoặc thu thập hành vi trên web trước.");

            return new
            {
                generatedAt = DateTime.UtcNow,
                stats = new
                {
                    totalUsers = userCount,
                    totalEvents,
                    totalVideoViews = totalViews,
                    videoCompletionRate = completionRate
                },
                eventStats,
                topProducts = topProductsNamed,
                topVideos,
                interestAnalysis = interestCounts.OrderByDescending(x => x.Value).Take(10)
                    .ToDictionary(x => x.Key, x => x.Value),
                kmeans
            };
        }

        public async Task<(object Strategy, string Source)> GenerateStrategyAsync(CancellationToken ct = default)
        {
            var context = await BuildMiningContextAsync();
            var contextJson = System.Text.Json.JsonSerializer.Serialize(context);
            using var contextDoc = System.Text.Json.JsonDocument.Parse(contextJson);

            try
            {
                using var geminiDoc = await _gemini.GenerateAdStrategyAsync(context, ct);
                var strategy = System.Text.Json.JsonSerializer.Deserialize<object>(geminiDoc.RootElement.GetRawText())!;
                return (strategy, "gemini");
            }
            catch (Exception ex)
            {
                var note = ex.Message.Contains("429") || ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase)
                    ? "Gemini hết quota — dùng phân tích local"
                    : $"Gemini lỗi — dùng phân tích local: {ex.Message}";
                var local = LocalAdStrategyGenerator.Generate(contextDoc.RootElement, note);
                return (local, "local");
            }
        }
    }
}
