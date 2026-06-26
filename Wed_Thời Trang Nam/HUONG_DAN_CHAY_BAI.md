# Hướng dẫn chạy bài – Website Thời Trang Nam

Tài liệu hướng dẫn cài đặt và chạy toàn bộ dự án (Backend API + Frontend web).

---

## 1. Tổng quan dự án

| Thành phần | Công nghệ | Thư mục |
|------------|-----------|---------|
| **Backend API** | ASP.NET Core 8, Entity Framework, SQL Server | `ThuanBackend/Thuan.API/` |
| **Frontend** | HTML, CSS (Tailwind), JavaScript | `Wed_ThoiTrang/` |

**Luồng hoạt động:** Frontend gọi API tại `http://localhost:5281` → Backend xử lý và lưu dữ liệu vào SQL Server.

---

## 2. Yêu cầu hệ thống

Cài đặt các phần mềm sau trước khi chạy:

1. **[.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)** – chạy backend  
   Kiểm tra: `dotnet --version` (kết quả ≥ 8.0)

2. **SQL Server** (LocalDB, Express hoặc Developer Edition) – lưu database  
   Mặc định dùng instance local: `Server=.` (SQL Server trên máy)

3. **Trình duyệt** – Chrome, Edge, Firefox...

4. **VS Code** (khuyến nghị) – mở và chạy frontend bằng Live Server

---

## 3. Cấu hình Database

Database mặc định: **`GuynDb`**

File cấu hình: `ThuanBackend/Thuan.API/appsettings.json`

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=GuynDb;Trusted_Connection=True;TrustServerCertificate=True;"
}
```

- `Server=.` → SQL Server trên máy local  
- Nếu dùng SQL Server Express: đổi thành `Server=.\\SQLEXPRESS;...`  
- Nếu dùng tài khoản SQL: thay `Trusted_Connection=True` bằng `User Id=...;Password=...;`

> **Lưu ý:** Backend tự chạy migration khi khởi động — không cần tạo database thủ công.

---

## 4. Chạy Backend (API)

### Bước 1: Mở terminal

Mở PowerShell hoặc CMD, di chuyển vào thư mục API:

```powershell
cd "D:\DNTN\Wed_Thời Trang Nam\ThuanBackend\Thuan.API"
```

### Bước 2: Khởi động server

```powershell
dotnet run
```

Hoặc chạy từ thư mục gốc dự án:

```powershell
dotnet run --project "ThuanBackend\Thuan.API\Thuan.API.csproj"
```

### Bước 3: Kiểm tra

Khi thấy dòng sau là backend đã chạy thành công:

```
Now listening on: http://localhost:5281
Application started. Press Ctrl+C to shut down.
```

| Địa chỉ | Mô tả |
|---------|-------|
| http://localhost:5281/swagger | Giao diện Swagger – xem và test API |
| http://localhost:5281/api/products | Danh sách sản phẩm |
| http://localhost:5281/api/auth/login | Đăng nhập |

**Dừng backend:** Nhấn `Ctrl + C` trong terminal.

---

## 5. Chạy Frontend (Website)

Frontend là các file HTML tĩnh, cần mở qua **Live Server** (không mở trực tiếp bằng `file://` vì sẽ lỗi CORS).

### Cách 1: VS Code + Live Server (khuyến nghị)

1. Mở thư mục `Wed_ThoiTrang` trong VS Code  
2. Cài extension **Live Server** (Ritwick Dey)  
3. Chuột phải vào `index.html` → **Open with Live Server**  
4. Trình duyệt mở tại: `http://127.0.0.1:5500` hoặc `http://localhost:5500`

### Cách 2: Python (nếu không có Live Server)

```powershell
cd "D:\DNTN\Wed_Thời Trang Nam\Wed_ThoiTrang"
python -m http.server 5500
```

Truy cập: http://localhost:5500/index.html

> **Quan trọng:** Phải chạy **Backend trước**, sau đó mới mở Frontend.

---

## 6. Trang web chính

| Trang | File | Chức năng |
|-------|------|-----------|
| Trang chủ | `index.html` | Banner, sản phẩm nổi bật |
| Sản phẩm | `sanpham.html` | Danh sách, lọc, tìm kiếm |
| Chi tiết SP | `chitietsp.html` | Xem SP, thêm giỏ hàng |
| Giỏ hàng | `giohang.html` | Quản lý giỏ hàng |
| Thanh toán | `thanhtoan.html` | Đặt hàng |
| Đăng nhập | `dang-nhap.html` | Đăng nhập tài khoản |
| Đăng ký | `dang-ky.html` | Tạo tài khoản mới |
| Tài khoản | `tai-khoan.html` | Thông tin cá nhân |
| Lịch sử | `lichsu.html` | Lịch sử đơn hàng |
| **Admin** | `admin.html` | Quản trị SP, đơn hàng, AI |

---

## 7. Tài khoản mặc định

### Trang Admin (`admin.html`)

- **Mật khẩu vào trang admin:** `admin123`

### Tài khoản Admin API (đăng nhập web)

Tạo tài khoản admin bằng API:

```powershell
curl -X POST http://localhost:5281/api/seed/admin
```

| Email | Mật khẩu | Vai trò |
|-------|-----------|---------|
| admin@shop.com | admin123 | Admin |

### Tài khoản Demo (Data Mining / K-means)

Tạo 6 tài khoản demo + dữ liệu hành vi mẫu:

- Trong **Admin** → tab **Data Mining** → nhấn **"Tạo dữ liệu demo"**  
- Hoặc gọi API:

```powershell
curl -X POST http://localhost:5281/api/seed/demo
```

| Mật khẩu tất cả tài khoản demo | `demo123` |
|--------------------------------|-----------|

Xem danh sách tài khoản demo:

```
GET http://localhost:5281/api/seed/demo-accounts
```

---

## 8. Quy trình chạy đầy đủ (Checklist)

```
[ ] 1. Bật SQL Server trên máy
[ ] 2. Mở terminal → cd ThuanBackend/Thuan.API → dotnet run
[ ] 3. Đợi thấy "Now listening on: http://localhost:5281"
[ ] 4. Mở VS Code → Wed_ThoiTrang → Live Server (index.html)
[ ] 5. Truy cập http://localhost:5500
[ ] 6. (Tuỳ chọn) Tạo dữ liệu demo qua admin.html
```

---

## 9. Xử lý lỗi thường gặp

### Lỗi: `address already in use` (port 5281)

Port 5281 đang bị chiếm — backend đã chạy hoặc process cũ chưa tắt.

```powershell
# Tìm process đang dùng port 5281
netstat -ano | findstr :5281

# Dừng process (thay <PID> bằng số PID tìm được)
taskkill /PID <PID> /F
```

### Lỗi: Không kết nối được database

- Kiểm tra SQL Server đã bật chưa (Services → SQL Server)  
- Kiểm tra chuỗi kết nối trong `appsettings.json`  
- Thử đổi `Server=.` thành `Server=.\\SQLEXPRESS`

### Lỗi: Frontend không load sản phẩm / CORS

- Đảm bảo backend đang chạy tại `http://localhost:5281`  
- Mở frontend qua Live Server (`http://localhost:5500`), **không** mở file HTML trực tiếp

### Lỗi: `dotnet` không được nhận diện

Cài [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0), khởi động lại terminal.

### Lỗi migration / database

Xóa database `GuynDb` trong SQL Server Management Studio rồi chạy lại `dotnet run` — backend sẽ tạo lại database tự động.

---

## 10. Cấu trúc thư mục

```
Wed_Thời Trang Nam/
├── HUONG_DAN_CHAY_BAI.md      ← File này
├── ThuanBackend/
│   ├── ThuanBackend.sln
│   └── Thuan.API/
│       ├── Controllers/        ← API endpoints
│       ├── Models/             ← Models dữ liệu
│       ├── Services/           ← Data Mining, AI Gemini
│       ├── Migrations/         ← Database migrations
│       ├── appsettings.json    ← Cấu hình DB, JWT
│       └── Program.cs
└── Wed_ThoiTrang/
    ├── index.html              ← Trang chủ
    ├── admin.html              ← Trang quản trị
    ├── sanpham.html
    ├── css/
    ├── js/
    └── images/
```

---

## 11. Tài liệu bổ sung

| File | Nội dung |
|------|----------|
| `ThuanBackend/CHECKLIST.md` | Checklist chức năng đã triển khai |
| `ThuanBackend/DATAMINING_GUIDE.md` | Hướng dẫn Data Mining (K-means) |
| `ThuanBackend/IMPLEMENTATION_SUMMARY.md` | Tóm tắt kiến trúc hệ thống |

---

## 12. Liên hệ / Ghi chú

- API chạy cổng **5281** (HTTP) và **7070** (HTTPS – nếu dùng profile https)  
- Frontend mặc định kết nối: `http://localhost:5281/api`  
- Tính năng **AI đề xuất quảng cáo** cần cấu hình Gemini API Key trong `appsettings.Development.json` (tuỳ chọn)
