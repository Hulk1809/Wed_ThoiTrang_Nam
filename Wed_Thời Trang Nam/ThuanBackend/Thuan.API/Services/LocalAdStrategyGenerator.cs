using System.Text.Json;

namespace Thuan.API.Services
{
    public static class LocalAdStrategyGenerator
    {
        public static object Generate(JsonElement context, string? note = null)
        {
            var stats = context.TryGetProperty("stats", out var s) ? s : default;
            var totalUsers = stats.TryGetProperty("totalUsers", out var tu) ? tu.GetInt32() : 0;
            var completionRate = stats.TryGetProperty("videoCompletionRate", out var cr) ? cr.GetDouble() : 0;

            var profiles = new List<(string name, int count, double engagement)>();
            if (context.TryGetProperty("kmeans", out var km)
                && km.TryGetProperty("profiles", out var profs)
                && profs.ValueKind == JsonValueKind.Array)
            {
                foreach (var p in profs.EnumerateArray())
                {
                    profiles.Add((
                        p.TryGetProperty("ProfileName", out var pn) ? pn.GetString() ?? "Cluster"
                            : p.TryGetProperty("profileName", out var pn2) ? pn2.GetString() ?? "Cluster" : "Cluster",
                        p.TryGetProperty("UserCount", out var uc) ? uc.GetInt32()
                            : p.TryGetProperty("userCount", out var uc2) ? uc2.GetInt32() : 0,
                        p.TryGetProperty("averageEngagement", out var ae) ? ae.GetDouble() : 0
                    ));
                }
            }

            var topProducts = new List<string>();
            if (context.TryGetProperty("topProducts", out var tp) && tp.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in tp.EnumerateArray().Take(3))
                {
                    if (item.TryGetProperty("productName", out var n))
                        topProducts.Add(n.GetString() ?? "");
                }
            }

            var topVideos = new List<string>();
            if (context.TryGetProperty("topVideos", out var tv) && tv.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in tv.EnumerateArray().Take(3))
                {
                    var title = item.TryGetProperty("VideoTitle", out var vt) ? vt.GetString()
                        : item.TryGetProperty("videoTitle", out var vt2) ? vt2.GetString() : null;
                    topVideos.Add(title ?? "Video 360° Try-On");
                }
            }

            var videoHeavy = completionRate >= 50;
            var channels = new List<object>
            {
                new { name = "TikTok", priority = 1, budgetPercent = videoHeavy ? 35 : 25, contentType = "video", targetClusters = new[] { "High Engagement", "Medium Engagement" }, reason = "Phù hợp thời trang nam trẻ, video ngắn thu hút", adFormat = "In-Feed Video Ads" },
                new { name = "Facebook", priority = 2, budgetPercent = 30, contentType = "carousel", targetClusters = new[] { "High Engagement", "Medium Engagement" }, reason = "Retargeting khách đã xem SP trên web", adFormat = "Dynamic Product Ads" },
                new { name = "Instagram", priority = 3, budgetPercent = 20, contentType = "image", targetClusters = new[] { "High Engagement" }, reason = "Lookbook & outfit styling", adFormat = "Story + Reels" },
                new { name = "Google Ads", priority = 4, budgetPercent = 10, contentType = "image", targetClusters = new[] { "Medium Engagement", "Low Engagement" }, reason = "Thu hút khách tìm kiếm áo khoác, áo thun", adFormat = "Search + Shopping" },
                new { name = "Zalo OA", priority = 5, budgetPercent = 5, contentType = "image", targetClusters = new[] { "Low Engagement" }, reason = "Chăm sóc & kích hoạt khách ít tương tác", adFormat = "ZNS + Banner" }
            };

            var rotationPlan = new List<object>
            {
                new { week = 1, focus = "Awareness — giới thiệu SP hot", primaryChannels = new[] { "TikTok", "Instagram" }, promotedProducts = topProducts, promotedVideos = topVideos, message = "Phong cách HT HOUSE — Thử ngay bộ sưu tập mới" },
                new { week = 2, focus = "Consideration — video 360° & review", primaryChannels = new[] { "Facebook", "TikTok" }, promotedProducts = topProducts, promotedVideos = topVideos, message = "Xem thử trước khi mua — Video 360° có sẵn" },
                new { week = 3, focus = "Conversion — retargeting giỏ hàng", primaryChannels = new[] { "Facebook", "Google Ads" }, promotedProducts = topProducts, promotedVideos = Array.Empty<string>(), message = "Giảm 10% cho khách quay lại trong 48h" },
                new { week = 4, focus = "Retention — kích hoạt Low Engagement", primaryChannels = new[] { "Zalo OA", "Facebook" }, promotedProducts = topProducts.Take(1).ToArray(), promotedVideos = Array.Empty<string>(), message = "Ưu đãi độc quyền dành riêng cho bạn" }
            };

            var clusterStrategies = new List<object>();
            if (profiles.Any())
            {
                foreach (var p in profiles)
                {
                    clusterStrategies.Add(new
                    {
                        cluster = p.name,
                        userCount = p.count,
                        adMessage = p.name switch
                        {
                            "High Engagement" => "Khách VIP — ưu đãi early access & combo giảm giá",
                            "Medium Engagement" => "Gợi ý SP phù hợp sở thích đã xem + free ship",
                            _ => "Kích hoạt bằng voucher 50K cho đơn đầu"
                        },
                        offer = p.name switch
                        {
                            "High Engagement" => "Giảm 15% + tặng phụ kiện",
                            "Medium Engagement" => "Freeship đơn từ 499K",
                            _ => "Voucher 50.000đ"
                        },
                        channels = p.name switch
                        {
                            "High Engagement" => new[] { "TikTok", "Instagram", "Facebook" },
                            "Medium Engagement" => new[] { "Facebook", "Google Ads" },
                            _ => new[] { "Zalo OA", "Facebook" }
                        },
                        rotationFrequency = p.name switch
                        {
                            "High Engagement" => "3 lần/tuần",
                            "Medium Engagement" => "2 lần/tuần",
                            _ => "1 lần/tuần"
                        }
                    });
                }
            }
            else
            {
                clusterStrategies.AddRange(new object[]
                {
                    new { cluster = "High Engagement", userCount = 0, adMessage = "Ưu đãi VIP", offer = "Giảm 15%", channels = new[] { "TikTok", "Facebook" }, rotationFrequency = "3 lần/tuần" },
                    new { cluster = "Medium Engagement", userCount = 0, adMessage = "Freeship", offer = "Freeship 499K", channels = new[] { "Facebook" }, rotationFrequency = "2 lần/tuần" },
                    new { cluster = "Low Engagement", userCount = 0, adMessage = "Voucher kích hoạt", offer = "50K", channels = new[] { "Zalo OA" }, rotationFrequency = "1 lần/tuần" }
                });
            }

            return new
            {
                source = "local",
                aiNote = note ?? "Phân tích rule-based từ dữ liệu K-means (Gemini không khả dụng)",
                summary = $"Dựa trên {totalUsers} users và tỷ lệ xem hết video {completionRate}%, nên xoay kênh ưu tiên TikTok + Facebook, retargeting theo nhóm K-means.",
                channels,
                rotationPlan,
                clusterStrategies,
                kpis = new[] { "CTR theo kênh", "ROAS", "Tỷ lệ xem hết video QC", "CPA theo nhóm K-means", "Tần suất mua lại" },
                tips = new[] { "Xoay creative mỗi 5-7 ngày trên TikTok", "Dùng video 360° làm nội dung QC chính", "Retarget khách High Engagement trong 7 ngày", "A/B test thông điệp theo từng cluster" }
            };
        }
    }
}
