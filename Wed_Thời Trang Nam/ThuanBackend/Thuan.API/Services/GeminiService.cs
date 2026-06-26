using System.Net.Http.Json;
using System.Text.Json;

namespace Thuan.API.Services
{
    public class GeminiService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly ILogger<GeminiService> _logger;

        public GeminiService(HttpClient http, IConfiguration config, ILogger<GeminiService> logger)
        {
            _http = http;
            _config = config;
            _logger = logger;
        }

        public async Task<JsonDocument> GenerateAdStrategyAsync(object miningContext, CancellationToken ct = default)
        {
            var apiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new InvalidOperationException("Chưa cấu hình Gemini:ApiKey. Thêm vào appsettings.Development.json");

            var model = _config["Gemini:Model"] ?? "gemini-2.0-flash";
            var contextJson = JsonSerializer.Serialize(miningContext, new JsonSerializerOptions { WriteIndented = true });
            var prompt = BuildPrompt(contextJson);

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={Uri.EscapeDataString(apiKey)}";
            var body = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                },
                generationConfig = new
                {
                    responseMimeType = "application/json",
                    temperature = 0.6
                }
            };

            _logger.LogInformation("Gọi Gemini API model={Model}", model);
            var response = await _http.PostAsJsonAsync(url, body, ct);
            var raw = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
                throw new Exception($"Gemini API lỗi {(int)response.StatusCode}: {Truncate(raw, 500)}");

            using var doc = JsonDocument.Parse(raw);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(text))
                throw new Exception("Gemini trả về rỗng");

            return JsonDocument.Parse(text);
        }

        private static string BuildPrompt(string contextJson)
        {
            const string schema = """
{
  "summary": "tóm tắt 2-3 câu",
  "channels": [
    {
      "name": "Tên kênh",
      "priority": 1,
      "budgetPercent": 30,
      "contentType": "video|image|carousel",
      "targetClusters": ["High Engagement"],
      "reason": "lý do chọn kênh",
      "adFormat": "loại quảng cáo cụ thể"
    }
  ],
  "rotationPlan": [
    {
      "week": 1,
      "focus": "mục tiêu tuần",
      "primaryChannels": ["Facebook", "TikTok"],
      "promotedProducts": ["tên SP"],
      "promotedVideos": ["tên video"],
      "message": "thông điệp quảng cáo"
    }
  ],
  "clusterStrategies": [
    {
      "cluster": "High Engagement",
      "userCount": 0,
      "adMessage": "thông điệp",
      "offer": "ưu đãi gợi ý",
      "channels": ["kênh ưu tiên"],
      "rotationFrequency": "tần suất xoay"
    }
  ],
  "kpis": ["KPI cần theo dõi"],
  "tips": ["mẹo tối ưu"]
}
""";

            return $"""
Bạn là chuyên gia marketing thời trang nam tại Việt Nam.
Dựa trên dữ liệu Data Mining từ website bán hàng dưới đây, hãy đề xuất CHIẾN LƯỢC XOAY KÊNH QUẢNG CÁO (ad rotation) cụ thể, thực tế cho shop.

DỮ LIỆU:
{contextJson}

YÊU CẦU:
- Phân tích từng nhóm K-means (High/Medium/Low Engagement)
- Đề xuất xoay kênh quảng cáo: Facebook, Instagram, TikTok, Google Ads, Zalo OA, YouTube Shorts
- Gợi ý sản phẩm/video nên quảng cáo theo hành vi thực tế
- Lịch xoay kênh theo tuần (4 tuần)
- Phân bổ ngân sách % hợp lý
- Viết bằng tiếng Việt, ngắn gọn, actionable

Trả về ĐÚNG JSON (không markdown) theo schema:
{schema}
""";
        }

        private static string Truncate(string s, int max) =>
            s.Length <= max ? s : s[..max] + "...";
    }
}
