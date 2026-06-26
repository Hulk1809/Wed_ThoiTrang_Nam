// Services/DataMiningService.cs
using Thuan.API.Data;
using Thuan.API.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Thuan.API.Services
{
    public class DataMiningService
    {
        private readonly AppDbContext _context;

        public DataMiningService(AppDbContext context)
        {
            _context = context;
        }

        // === K-MEANS CLUSTERING ===
        /// <summary>
        /// Phân nhóm khách hàng dùng K-means clustering
        /// K = số nhóm (mặc định 3: High, Medium, Low engagement)
        /// </summary>
        public async Task<KMeansResult> ClusterCustomersAsync(int k = 3)
        {
            // 1. Thu thập dữ liệu hành vi từ database
            var behaviors = await _context.UserBehaviors.ToListAsync();
            var videoTrackings = await _context.VideoTrackings.ToListAsync();

            // 2. Tính features cho mỗi user
            var userFeatures = ExtractUserFeatures(behaviors, videoTrackings);

            if (userFeatures.Count < k)
                throw new Exception($"Số users ({userFeatures.Count}) phải >= k ({k})");

            // 3. Chuẩn hóa dữ liệu (Normalize)
            var normalizedFeatures = NormalizeFeatures(userFeatures);

            // 4. Khởi tạo centroids ngẫu nhiên
            var centroids = InitializeCentroids(normalizedFeatures, k);

            // 5. K-means algorithm
            var (clusters, finalCentroids) = KMeansAlgorithm(normalizedFeatures, centroids, maxIterations: 100);

            // 6. Phân tích kết quả
            return new KMeansResult
            {
                K = k,
                Clusters = clusters,
                Centroids = finalCentroids,
                UserProfiles = GenerateUserProfiles(clusters, userFeatures)
            };
        }

        // === HỖ TRỢ K-MEANS ===

        private Dictionary<int, double[]> ExtractUserFeatures(List<UserBehavior> behaviors, List<VideoTracking> videoTrackings)
        {
            var userFeatures = new Dictionary<int, double[]>();
            var userIds = behaviors.Select(b => b.UserId).Distinct().ToList();

            foreach (var userId in userIds)
            {
                // Features: [total_views, total_watch_time, product_diversity, video_watch_percentage, purchase_count]
                var userBehaviors = behaviors.Where(b => b.UserId == userId).ToList();
                var userVideos = videoTrackings.Where(v => v.UserId == userId).ToList();

                double viewCount = userBehaviors.Count(b => b.EventType == "view");
                double totalWatchTime = userBehaviors.Where(b => b.DurationSeconds.HasValue).Sum(b => b.DurationSeconds ?? 0);
                double productDiversity = userBehaviors.Where(b => b.ProductId.HasValue).Select(b => b.ProductId).Distinct().Count();
                double videoWatchPercentage = userVideos.Any() ? userVideos.Average(v => v.WatchPercentage) : 0;
                double purchaseCount = userBehaviors.Count(b => b.EventType == "purchase");

                userFeatures[userId] = new[] { viewCount, totalWatchTime, productDiversity, videoWatchPercentage, purchaseCount };
            }

            return userFeatures;
        }

        private Dictionary<int, double[]> NormalizeFeatures(Dictionary<int, double[]> userFeatures)
        {
            int featureCount = userFeatures.Values.First().Length;
            var normalized = new Dictionary<int, double[]>();

            for (int i = 0; i < featureCount; i++)
            {
                double min = userFeatures.Values.Min(f => f[i]);
                double max = userFeatures.Values.Max(f => f[i]);
                double range = max - min == 0 ? 1 : max - min;

                foreach (var userId in userFeatures.Keys)
                {
                    if (!normalized.ContainsKey(userId))
                        normalized[userId] = new double[featureCount];

                    normalized[userId][i] = (userFeatures[userId][i] - min) / range;
                }
            }

            return normalized;
        }

        private List<double[]> InitializeCentroids(Dictionary<int, double[]> features, int k)
        {
            var random = new Random();
            var allFeatures = features.Values.ToList();
            var centroids = new List<double[]>();

            for (int i = 0; i < k; i++)
            {
                var centroid = allFeatures[random.Next(allFeatures.Count)];
                centroids.Add((double[])centroid.Clone());
            }

            return centroids;
        }

        private (Dictionary<int, List<int>>, List<double[]>) KMeansAlgorithm(
            Dictionary<int, double[]> features,
            List<double[]> centroids,
            int maxIterations = 100)
        {
            var clusters = new Dictionary<int, List<int>>();
            List<double[]> newCentroids;
            int iterations = 0;

            while (iterations < maxIterations)
            {
                // Assign points to nearest centroid
                clusters.Clear();
                for (int i = 0; i < centroids.Count; i++)
                    clusters[i] = new List<int>();

                foreach (var userId in features.Keys)
                {
                    int nearestCluster = FindNearestCentroid(features[userId], centroids);
                    clusters[nearestCluster].Add(userId);
                }

                // Calculate new centroids
                newCentroids = new List<double[]>();
                foreach (var centroid in centroids)
                {
                    var clusterIndex = centroids.IndexOf(centroid);
                    var clusterPoints = clusters[clusterIndex];

                    if (clusterPoints.Count > 0)
                    {
                        var newCentroid = CalculateMean(clusterPoints.Select(id => features[id]).ToList());
                        newCentroids.Add(newCentroid);
                    }
                    else
                    {
                        newCentroids.Add((double[])centroid.Clone());
                    }
                }

                // Check convergence
                if (HasConverged(centroids, newCentroids))
                    break;

                centroids = newCentroids;
                iterations++;
            }

            return (clusters, centroids);
        }

        private int FindNearestCentroid(double[] point, List<double[]> centroids)
        {
            double minDistance = double.MaxValue;
            int nearestCluster = 0;

            for (int i = 0; i < centroids.Count; i++)
            {
                double distance = EuclideanDistance(point, centroids[i]);
                if (distance < minDistance)
                {
                    minDistance = distance;
                    nearestCluster = i;
                }
            }

            return nearestCluster;
        }

        private double EuclideanDistance(double[] point1, double[] point2)
        {
            return Math.Sqrt(point1.Select((p, i) => Math.Pow(p - point2[i], 2)).Sum());
        }

        private double[] CalculateMean(List<double[]> points)
        {
            int dimensions = points[0].Length;
            var mean = new double[dimensions];

            for (int i = 0; i < dimensions; i++)
            {
                mean[i] = points.Average(p => p[i]);
            }

            return mean;
        }

        private bool HasConverged(List<double[]> oldCentroids, List<double[]> newCentroids, double threshold = 0.0001)
        {
            for (int i = 0; i < oldCentroids.Count; i++)
            {
                if (EuclideanDistance(oldCentroids[i], newCentroids[i]) > threshold)
                    return false;
            }
            return true;
        }

        private List<UserProfile> GenerateUserProfiles(Dictionary<int, List<int>> clusters, Dictionary<int, double[]> userFeatures)
        {
            var profiles = new List<UserProfile>();

            foreach (var clusterKvp in clusters)
            {
                int clusterId = clusterKvp.Key;
                var userIds = clusterKvp.Value;

                string profileName = clusterId switch
                {
                    0 => "High Engagement",
                    1 => "Medium Engagement",
                    2 => "Low Engagement",
                    _ => $"Cluster {clusterId}"
                };

                var profile = new UserProfile
                {
                    ClusterId = clusterId,
                    ProfileName = profileName,
                    UserCount = userIds.Count,
                    UserIds = userIds,
                    AverageEngagement = userIds.Count > 0
                        ? userIds.Average(id => userFeatures[id][0]) // average view count
                        : 0,
                    AverageWatchTime = userIds.Count > 0
                        ? userIds.Average(id => userFeatures[id][1]) // average watch time
                        : 0
                };

                profiles.Add(profile);
            }

            return profiles.OrderByDescending(p => p.AverageEngagement).ToList();
        }
    }

    // === DTOs ===
    public class KMeansResult
    {
        public int K { get; set; }
        public Dictionary<int, List<int>> Clusters { get; set; } = new();
        public List<double[]> Centroids { get; set; } = new();
        public List<UserProfile> UserProfiles { get; set; } = new();
    }

    public class UserProfile
    {
        public int ClusterId { get; set; }
        public string ProfileName { get; set; } = string.Empty;
        public int UserCount { get; set; }
        public List<int> UserIds { get; set; } = new();
        public double AverageEngagement { get; set; }
        public double AverageWatchTime { get; set; }
    }
}
