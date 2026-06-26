// Controllers/UploadController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Thuan.API.Data;
using Thuan.API.Models;
using System.IO;

namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UploadController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _webHostEnvironment;

        // Đường dẫn upload (tùy chỉnh)
        private readonly string _uploadPath = "uploads";

        public UploadController(AppDbContext context, IWebHostEnvironment webHostEnvironment)
        {
            _context = context;
            _webHostEnvironment = webHostEnvironment;
        }

        private string GetUploadsDirectory()
        {
            var webRoot = _webHostEnvironment.WebRootPath;
            if (string.IsNullOrEmpty(webRoot))
                webRoot = Path.Combine(_webHostEnvironment.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, _uploadPath);
            if (!Directory.Exists(dir))
                Directory.CreateDirectory(dir);
            return dir;
        }

        private string ToPublicUrl(string relativePath)
        {
            var req = HttpContext.Request;
            return $"{req.Scheme}://{req.Host}{relativePath}";
        }

        // POST /api/upload/multiple - Upload nhiều file (ảnh/video sản phẩm)
        [HttpPost("multiple")]
        [AllowAnonymous]
        public async Task<IActionResult> UploadMultiple([FromForm] List<IFormFile> files, [FromForm] string? description)
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { message = "Chưa chọn file" });

            var results = new List<object>();
            foreach (var file in files)
            {
                var single = await SaveUploadedFile(file, null, description);
                if (single.Error != null)
                    return BadRequest(new { message = single.Error });
                results.Add(single.Result!);
            }
            return Ok(new { message = $"Upload {results.Count} file thành công", data = results });
        }

        // POST /api/upload - Upload file
        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> UploadFile([FromForm] IFormFile file, [FromForm] int? userId, [FromForm] string? description)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "File không được để trống" });

            // Validate file size (max 100MB)
            const long maxFileSize = 100 * 1024 * 1024;
            if (file.Length > maxFileSize)
                return BadRequest(new { message = "File quá lớn (max 100MB)" });

            // Validate file type
            string[] allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".mp4", ".webm", ".avi", ".mov", ".pdf", ".doc", ".docx" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();

            if (!allowedExtensions.Contains(fileExtension))
                return BadRequest(new { message = "Định dạng file không được phép" });

            var saved = await SaveUploadedFile(file, userId, description);
            if (saved.Error != null)
                return StatusCode(500, new { message = saved.Error });
            return Ok(saved.Result);
        }

        private async Task<(object? Result, string? Error)> SaveUploadedFile(IFormFile file, int? userId, string? description)
        {
            if (file == null || file.Length == 0)
                return (null, "File không được để trống");

            const long maxFileSize = 100 * 1024 * 1024;
            if (file.Length > maxFileSize)
                return (null, "File quá lớn (max 100MB)");

            string[] allowedExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".avi", ".mov", ".pdf", ".doc", ".docx" };
            var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(fileExtension))
                return (null, "Định dạng file không được phép");

            try
            {
                var uploadsDirectory = GetUploadsDirectory();
                string uniqueFileName = Guid.NewGuid().ToString() + fileExtension;
                var filePath = Path.Combine(uploadsDirectory, uniqueFileName);

                using (var fileStream = new FileStream(filePath, FileMode.Create))
                    await file.CopyToAsync(fileStream);

                string fileType = GetFileType(fileExtension);
                var relativeUrl = $"/{_uploadPath}/{uniqueFileName}";

                var uploadedFile = new UploadedFile
                {
                    FileName = file.FileName,
                    FileUrl = relativeUrl,
                    FileType = fileType,
                    FileSizeBytes = file.Length,
                    UserId = userId,
                    Description = description,
                    UploadedAt = DateTime.UtcNow
                };

                _context.UploadedFiles.Add(uploadedFile);
                await _context.SaveChangesAsync();

                return (new
                {
                    message = "Upload thành công",
                    id = uploadedFile.Id,
                    fileName = uploadedFile.FileName,
                    fileUrl = relativeUrl,
                    publicUrl = ToPublicUrl(relativeUrl),
                    fileType = uploadedFile.FileType,
                    fileSizeBytes = uploadedFile.FileSizeBytes
                }, null);
            }
            catch (Exception ex)
            {
                return (null, $"Lỗi upload: {ex.Message}");
            }
        }

        // GET /api/upload/{id}/download - Download file
        [HttpGet("{id}/download")]
        public async Task<IActionResult> DownloadFile(int id)
        {
            var uploadedFile = await _context.UploadedFiles.FindAsync(id);
            if (uploadedFile == null)
                return NotFound(new { message = "File không tìm thấy" });

            var filePath = Path.Combine(_webHostEnvironment.WebRootPath, uploadedFile.FileUrl.TrimStart('/'));
            if (!System.IO.File.Exists(filePath))
                return NotFound(new { message = "File không tồn tại trên server" });

            // Tăng download count
            uploadedFile.DownloadCount++;
            _context.UploadedFiles.Update(uploadedFile);
            await _context.SaveChangesAsync();

            var fileBytes = System.IO.File.ReadAllBytes(filePath);
            return File(fileBytes, GetContentType(Path.GetExtension(filePath)), uploadedFile.FileName);
        }

        // GET /api/upload - Lấy danh sách file
        [HttpGet]
        public async Task<IActionResult> GetUploadedFiles(int? userId = null, string? fileType = null)
        {
            IQueryable<UploadedFile> query = _context.UploadedFiles;

            if (userId.HasValue)
                query = query.Where(f => f.UserId == userId);

            if (!string.IsNullOrEmpty(fileType))
                query = query.Where(f => f.FileType == fileType);

            var files = await query
                .OrderByDescending(f => f.UploadedAt)
                .Select(f => new
                {
                    f.Id,
                    f.FileName,
                    f.FileUrl,
                    f.FileType,
                    f.FileSizeBytes,
                    f.UserId,
                    f.Description,
                    f.UploadedAt,
                    f.DownloadCount
                })
                .ToListAsync();

            return Ok(new { data = files, count = files.Count });
        }

        // DELETE /api/upload/{id} - Xóa file
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteFile(int id)
        {
            var uploadedFile = await _context.UploadedFiles.FindAsync(id);
            if (uploadedFile == null)
                return NotFound(new { message = "File không tìm thấy" });

            try
            {
                // Xóa file từ disk
                var filePath = Path.Combine(_webHostEnvironment.WebRootPath, uploadedFile.FileUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);

                // Xóa khỏi database
                _context.UploadedFiles.Remove(uploadedFile);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa file thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi xóa: {ex.Message}" });
            }
        }

        // === HỖ TRỢ ===
        private string GetFileType(string extension)
        {
            return extension.ToLowerInvariant() switch
            {
                ".mp4" or ".webm" or ".avi" or ".mov" => "video",
                ".jpg" or ".jpeg" or ".png" or ".gif" => "image",
                ".pdf" or ".doc" or ".docx" => "document",
                _ => "other"
            };
        }

        private string GetContentType(string extension)
        {
            return extension.ToLowerInvariant() switch
            {
                ".mp4" => "video/mp4",
                ".webm" => "video/webm",
                ".avi" => "video/avi",
                ".mov" => "video/quicktime",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                _ => "application/octet-stream"
            };
        }
    }
}
