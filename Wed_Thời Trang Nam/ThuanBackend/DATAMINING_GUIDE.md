# 📊 HƯỚNG DẪN SETUP & SỬ DỤNG DATA TRACKING + K-MEANS

## ✅ CÀI ĐẶT NHANH

### 1️⃣ **Cập nhật Database** (TỰ ĐỘNG KÍCH HOẠT)
Khi chạy `dotnet run`, migrations sẽ tự động áp dụng:
```bash
cd ThuanBackend/Thuan.API
dotnet run
```

**Database sẽ tự động tạo 3 bảng mới:**
- `VideoTrackings` - Tracking xem video
- `UploadedFiles` - Lưu trữ file upload
- `UserBehaviors` - Mở rộng với fields: DurationSeconds, PageName, Interest, StartedAt, EndedAt

---

## 🎯 BACKEND ENDPOINTS

### 📹 VIDEO TRACKING
```http
# Log xem video
POST /api/videotracking
Content-Type: application/json

{
  "userId": 1,
  "videoUrl": "https://example.com/video.mp4",
  "videoTitle": "Hướng dẫn mặc áo",
  "watchedSeconds": 120,
  "totalDuration": 300,
  "interest": {"color": "đỏ", "style": "casual"},
  "startedAt": "2026-06-08T10:00:00Z",
  "endedAt": "2026-06-08T10:02:00Z"
}
```

```http
# Lấy top 10 video được xem nhiều
GET /api/videotracking/stats/top-videos?limit=10

# Tỷ lệ xem hoàn toàn (90%+)
GET /api/videotracking/stats/completion-rate

# Phân tích quan tâm khách hàng
GET /api/videotracking/stats/interest
```

---

### 📤 FILE UPLOAD
```http
# Upload file (video/image/document)
POST /api/upload
Content-Type: multipart/form-data

FormData:
- file: [binary file]
- userId: 1
- description: "Video giới thiệu sản phẩm"

# Response:
{
  "message": "Upload thành công",
  "id": 1,
  "fileUrl": "/uploads/abc123.mp4",
  "fileType": "video",
  "fileSizeBytes": 5242880
}
```

```http
# Download file
GET /api/upload/1/download

# Lấy danh sách file
GET /api/upload?userId=1&fileType=video

# Xóa file
DELETE /api/upload/1
```

---

### 📊 USER BEHAVIOR TRACKING (Mở rộng)
```http
# Log event chi tiết (với time tracking)
POST /api/userbehavior
Content-Type: application/json

{
  "userId": 1,
  "eventType": "view",
  "productId": 5,
  "pageName": "chitietsp",
  "durationSeconds": 45,
  "interest": {"color": "đỏ", "size": "M", "style": "formal"},
  "startedAt": "2026-06-08T10:00:00Z",
  "endedAt": "2026-06-08T10:00:45Z"
}
```

---

### 🤖 DATA MINING - K-MEANS CLUSTERING
```http
# Chạy K-means phân nhóm khách hàng (k=3)
POST /api/datamining/kmeans
Content-Type: application/json

{
  "k": 3
}

# Response:
{
  "message": "K-means clustering completed",
  "k": 3,
  "userProfiles": [
    {
      "clusterId": 0,
      "name": "High Engagement",
      "userCount": 15,
      "averageEngagement": 24.5,
      "averageWatchTime": 1250,
      "description": "Khách hàng rất quan tâm, thường xuyên xem video và sản phẩm"
    },
    {
      "clusterId": 1,
      "name": "Medium Engagement",
      "userCount": 32,
      "averageEngagement": 8.7,
      "averageWatchTime": 420,
      "description": "Khách hàng có quan tâm vừa phải, xem đôi khi"
    },
    {
      "clusterId": 2,
      "name": "Low Engagement",
      "userCount": 53,
      "averageEngagement": 1.2,
      "averageWatchTime": 45,
      "description": "Khách hàng ít quan tâm, hiếm khi tương tác"
    }
  ]
}
```

```http
# Lấy phân tích chi tiết
GET /api/datamining/analysis
```

---

## 🌐 FRONTEND USAGE

### Tracking Sự Kiện Cơ Bản
```javascript
// Tracking khi xem sản phẩm
trackUserEvent('view', productId, 'viewed on index page');

// Tracking khi thêm vào giỏ
trackUserEvent('add_to_cart', productId, 'quantity: 2');

// Tracking mua hàng
trackUserEvent('purchase', productId, 'order_id: 123');
```

### Tracking Video Chi Tiết
```javascript
// Khi khách xem video
trackVideoView(
  'https://example.com/video.mp4',
  'Hướng dẫn mặc áo',
  150,           // Đoạn xem được (giây)
  600,           // Tổng độ dài (giây)
  {              // Quan tâm gì
    color: 'đỏ',
    style: 'casual',
    occasion: 'hẹn hò'
  }
);
```

### Tracking Thời Gian Xem Sản Phẩm
```javascript
// Khi khách xem chi tiết sản phẩm lâu
trackProductViewDuration(
  productId,
  45,            // Thời gian xem (giây)
  {              // Quan tâm gì
    color: 'đỏ',
    size: 'M',
    material: 'cotton',
    price_range: '300k-500k'
  }
);
```

### Upload File
```javascript
// Tạo FormData
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('userId', 1);
formData.append('description', 'Video quảng cáo sản phẩm');

// Upload
const response = await fetch(`${API_BASE_URL}/upload`, {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('File URL:', result.fileUrl);
```

---

## 📈 CÔNG THỨC K-MEANS

**Features trích xuất từ hành vi:**
1. **View Count** - Số lần xem sản phẩm
2. **Total Watch Time** - Tổng thời gian xem (giây)
3. **Product Diversity** - Số loại sản phẩm khác nhau xem
4. **Video Watch Percentage** - % xem video (0-100)
5. **Purchase Count** - Số lần mua

**Clustering:**
- Chuẩn hóa dữ liệu (0-1)
- Khởi tạo 3 centroids ngẫu nhiên
- Lặp cho đến hội tụ (max 100 lần)
- Phân nhóm: High/Medium/Low Engagement

---

## 🚀 TEST NGAY

### 1. Bắt đầu Backend
```bash
cd ThuanBackend/Thuan.API
dotnet run
```

### 2. Test Upload File
```bash
curl -X POST http://localhost:5281/api/upload \
  -F "file=@video.mp4" \
  -F "userId=1" \
  -F "description=Test video"
```

### 3. Test K-means
```bash
curl -X POST http://localhost:5281/api/datamining/kmeans \
  -H "Content-Type: application/json" \
  -d '{"k": 3}'
```

### 4. Xem Analytics
```bash
curl http://localhost:5281/api/datamining/analysis
```

---

## 📝 GHI CHÚ QUAN TRỌNG

✅ **Đã có:**
- VideoTracking Model
- UploadedFile Model  
- DataMiningService (K-means)
- 3 Controllers mới
- Extended UserBehavior tracking
- Frontend tracking functions

⚠️ **Cần chú ý:**
1. Migrations sẽ tự chạy khi `dotnet run`
2. Folders `wwwroot/uploads` sẽ tự tạo khi upload
3. API chỉ track khi user đã đăng nhập (UserId > 0)
4. K-means cần >= k users để chạy

---

## 🔧 CÓ VẤN ĐỀ?

Nếu database không update:
```bash
cd ThuanBackend/Thuan.API
dotnet ef migrations add AddVideoTrackingAndUpload
dotnet ef database update
```

---

**Chúc bạn thành công! 🎉**
