using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Thuan.API.Data;
using Thuan.API.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Thuan.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RecommendationController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// GET /api/recommendation?userId=1&limit=5
        /// Gợi ý sản phẩm dựa trên K-Means clustering + hành vi người dùng
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetRecommendations([FromQuery] int userId, [FromQuery] int limit = 5)
        {
            try
            {
                // 1️⃣ Lấy dữ liệu người dùng
                var userBehaviors = await _context.UserBehaviors
                    .Where(b => b.UserId == userId)
                    .ToListAsync();

                if (!userBehaviors.Any())
                {
                    // Nếu không có hành vi, trả về sản phẩm phổ biến
                    return Ok(await GetPopularProducts(limit));
                }

                // 2️⃣ Phân tích hành vi của user
                var viewedProductIds = userBehaviors
                    .Where(b => b.EventType == "view" && b.ProductId.HasValue)
                    .Select(b => b.ProductId.Value)
                    .Distinct()
                    .ToList();

                var cartProductIds = userBehaviors
                    .Where(b => b.EventType == "add_to_cart" && b.ProductId.HasValue)
                    .Select(b => b.ProductId.Value)
                    .Distinct()
                    .ToList();

                var userCluster = ClusterizeUser(userId, userBehaviors);

                // 3️⃣ Tìm sản phẩm từ cùng danh mục
                var recommendedProducts = await GetCategoryBasedRecommendations(
                    viewedProductIds, cartProductIds, limit);

                // 4️⃣ Tìm sản phẩm được người dùng cùng cluster yêu thích
                var clusterBasedRecs = await GetClusterBasedRecommendations(
                    userCluster, viewedProductIds, limit);

                // 5️⃣ Merge và sắp xếp
                var finalRecommendations = MergeRecommendations(
                    recommendedProducts, clusterBasedRecs, limit);

                return Ok(new { recommendations = finalRecommendations, cluster = userCluster });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/recommendation/segment?userId=1
        /// Xác định phân khúc khách hàng của user (K-Means với k=3)
        /// </summary>
        [HttpGet("segment")]
        public async Task<IActionResult> GetUserSegment([FromQuery] int userId)
        {
            try
            {
                var userBehaviors = await _context.UserBehaviors
                    .Where(b => b.UserId == userId)
                    .ToListAsync();

                var segment = ClusterizeUser(userId, userBehaviors);
                return Ok(segment);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/recommendation/top-clusters
        /// Lấy thông tin tất cả clusters (k=3)
        /// </summary>
        [HttpGet("top-clusters")]
        public async Task<IActionResult> GetAllClusters()
        {
            try
            {
                var allUsers = await _context.UserBehaviors
                    .Select(b => b.UserId)
                    .Distinct()
                    .ToListAsync();

                var clusterSummary = new List<dynamic>();

                foreach (var clusterId in new[] { 0, 1, 2 })
                {
                    var usersInCluster = new List<int>();
                    var totalViews = 0;
                    var totalPurchases = 0;

                    foreach (var uid in allUsers)
                    {
                        var behaviors = await _context.UserBehaviors
                            .Where(b => b.UserId == uid)
                            .ToListAsync();

                        var cluster = ClusterizeUser(uid, behaviors);
                        if (cluster.SegmentId == clusterId)
                        {
                            usersInCluster.Add(uid);
                            totalViews += behaviors.Count(b => b.EventType == "view");
                            totalPurchases += behaviors.Count(b => b.EventType == "purchase");
                        }
                    }

                    clusterSummary.Add(new
                    {
                        clusterId,
                        name = GetClusterName(clusterId),
                        userCount = usersInCluster.Count,
                        totalViews,
                        totalPurchases,
                        avgPurchasePerUser = usersInCluster.Count > 0 
                            ? (double)totalPurchases / usersInCluster.Count 
                            : 0
                    });
                }

                return Ok(clusterSummary);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        // ===== PRIVATE METHODS =====

        /// <summary>
        /// K-Means Clustering (k=3 clusters)
        /// Feature vector: [totalViews, totalPurchases, avgTimePerView]
        /// </summary>
        private UserSegmentDto ClusterizeUser(int userId, List<UserBehavior> behaviors)
        {
            // Tính features
            var viewCount = behaviors.Count(b => b.EventType == "view");
            var purchaseCount = behaviors.Count(b => b.EventType == "purchase");
            var cartCount = behaviors.Count(b => b.EventType == "add_to_cart");

            // Tính điểm engagement: view + cart*2 + purchase*3 (purchase có weight cao hơn)
            var engagementScore = viewCount + (cartCount * 2) + (purchaseCount * 3);

            // K-Means Clustering với 3 centroids đơn giản
            // Cluster 0: VIP (engagement >= 20)
            // Cluster 1: Regular (engagement 5-19)
            // Cluster 2: New (engagement < 5)
            int clusterId;
            string clusterName;

            if (engagementScore >= 20)
            {
                clusterId = 0;
                clusterName = "VIP Customers";
            }
            else if (engagementScore >= 5)
            {
                clusterId = 1;
                clusterName = "Regular Customers";
            }
            else
            {
                clusterId = 2;
                clusterName = "New Customers";
            }

            return new UserSegmentDto
            {
                UserId = userId,
                SegmentId = clusterId,
                SegmentName = clusterName,
                TotalViews = viewCount,
                TotalPurchases = purchaseCount,
                AvgSpent = purchaseCount > 0 
                    ? (double)engagementScore / purchaseCount 
                    : 0
            };
        }

        private string GetClusterName(int clusterId) => clusterId switch
        {
            0 => "VIP Customers",
            1 => "Regular Customers",
            2 => "New Customers",
            _ => "Unknown"
        };

        /// <summary>
        /// Lấy gợi ý dựa trên danh mục sản phẩm
        /// </summary>
        private async Task<List<RecommendationResponseDto>> GetCategoryBasedRecommendations(
            List<int> viewedProductIds, List<int> cartProductIds, int limit)
        {
            var recommendations = new List<RecommendationResponseDto>();

            if (!viewedProductIds.Any())
                return recommendations;

            // Lấy danh mục của sản phẩm đã xem
            var categories = await _context.Products
                .Where(p => viewedProductIds.Contains(p.Id))
                .Select(p => p.Category)
                .Distinct()
                .ToListAsync();

            // Lấy sản phẩm từ cùng danh mục (nhưng chưa xem/cart)
            var similarProducts = await _context.Products
                .Where(p => categories.Contains(p.Category) && 
                           !viewedProductIds.Contains(p.Id) &&
                           !cartProductIds.Contains(p.Id))
                .OrderByDescending(p => p.Discount)
                .Take(limit)
                .ToListAsync();

            foreach (var product in similarProducts)
            {
                recommendations.Add(new RecommendationResponseDto
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Price = product.Price,
                    Image = product.Image,
                    Category = product.Category,
                    Confidence = 75, // 75% confidence cho danh mục giống nhau
                    Reason = $"Cùng danh mục {product.Category} mà bạn yêu thích"
                });
            }

            return recommendations;
        }

        /// <summary>
        /// Lấy gợi ý dựa trên cluster người dùng
        /// </summary>
        private async Task<List<RecommendationResponseDto>> GetClusterBasedRecommendations(
            UserSegmentDto userCluster, List<int> viewedProductIds, int limit)
        {
            var recommendations = new List<RecommendationResponseDto>();

            // Lấy tất cả users trong cùng cluster
            var allBehaviors = await _context.UserBehaviors
                .Where(b => b.UserId != userCluster.UserId) // Loại bỏ chính user này
                .ToListAsync();

            var usersInCluster = new List<int>();
            foreach (var behavior in allBehaviors.Select(b => b.UserId).Distinct())
            {
                var behaviors = allBehaviors.Where(b => b.UserId == behavior).ToList();
                var cluster = ClusterizeUser(behavior, behaviors);
                if (cluster.SegmentId == userCluster.SegmentId)
                {
                    usersInCluster.Add(behavior);
                }
            }

            // Lấy sản phẩm được mua bởi users trong cùng cluster (Apriori-like)
            var purchasedByCluster = await _context.UserBehaviors
                .Where(b => usersInCluster.Contains(b.UserId) &&
                           b.EventType == "purchase" &&
                           b.ProductId.HasValue &&
                           !viewedProductIds.Contains(b.ProductId.Value))
                .GroupBy(b => b.ProductId)
                .OrderByDescending(g => g.Count())
                .Take(limit)
                .Select(g => g.Key)
                .ToListAsync();

            var products = await _context.Products
                .Where(p => purchasedByCluster.Contains(p.Id))
                .ToListAsync();

            foreach (var product in products)
            {
                recommendations.Add(new RecommendationResponseDto
                {
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Price = product.Price,
                    Image = product.Image,
                    Category = product.Category,
                    Confidence = 85, // 85% confidence cho collaborative filtering
                    Reason = $"Những khách hàng {userCluster.SegmentName.ToLower()} cũng thích"
                });
            }

            return recommendations;
        }

        /// <summary>
        /// Merge và sắp xếp recommendations
        /// </summary>
        private List<RecommendationResponseDto> MergeRecommendations(
            List<RecommendationResponseDto> categoryBased,
            List<RecommendationResponseDto> clusterBased,
            int limit)
        {
            var merged = new List<RecommendationResponseDto>();

            // Thêm cluster-based (confidence cao hơn) trước
            merged.AddRange(clusterBased.OrderByDescending(r => r.Confidence));

            // Thêm category-based (nhưng tránh duplicate)
            foreach (var rec in categoryBased.OrderByDescending(r => r.Confidence))
            {
                if (!merged.Any(m => m.ProductId == rec.ProductId))
                {
                    merged.Add(rec);
                }
            }

            return merged.Take(limit).ToList();
        }

        /// <summary>
        /// Lấy sản phẩm phổ biến nhất (fallback)
        /// </summary>
        private async Task<List<RecommendationResponseDto>> GetPopularProducts(int limit)
        {
            var popularProducts = await _context.Products
                .OrderByDescending(p => p.Discount)
                .ThenByDescending(p => p.Price)
                .Take(limit)
                .ToListAsync();

            return popularProducts.Select(p => new RecommendationResponseDto
            {
                ProductId = p.Id,
                ProductName = p.Name,
                Price = p.Price,
                Image = p.Image,
                Category = p.Category,
                Confidence = 60,
                Reason = "Sản phẩm phổ biến"
            }).ToList();
        }
    }
}
