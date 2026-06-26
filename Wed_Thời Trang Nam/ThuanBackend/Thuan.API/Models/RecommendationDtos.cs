namespace Thuan.API.Models
{
    // DTO cho request gợi ý sản phẩm
    public class RecommendationRequestDto
    {
        public int UserId { get; set; }
        public int Limit { get; set; } = 5;
    }

    // DTO cho response gợi ý
    public class RecommendationResponseDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public string Image { get; set; }
        public string Category { get; set; }
        public double Confidence { get; set; } // 0-100: độ chắc chắn gợi ý
        public string Reason { get; set; } // Lý do gợi ý (ví dụ: "Cùng danh mục", "Người mua giống bạn cũng thích")
    }

    // DTO cho phân khúc khách hàng (cluster)
    public class UserSegmentDto
    {
        public int UserId { get; set; }
        public int SegmentId { get; set; } // 0, 1, 2 (3 clusters)
        public string SegmentName { get; set; } // "VIP", "Thường xuyên", "Mới"
        public int TotalViews { get; set; }
        public int TotalPurchases { get; set; }
        public double AvgSpent { get; set; }
    }
}
