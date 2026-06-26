using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq; // Thư viện cần thiết cho .Any()

using Thuan.API.Data; 
using Thuan.API.Models; 


// === DTO DÙNG CHO CẬP NHẬT SẢN PHẨM (Đã sửa lỗi Price/Stock) ===
// (Chúng ta không cần DTO ProductQuery nữa vì frontend tự lọc)
public class ProductUpdateDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public decimal? OriginalPrice { get; set; }
    public int? Discount { get; set; }
    public string? Category { get; set; }
    public string? Size { get; set; }
    public string? Color { get; set; }
    public int? Stock { get; set; }
    public string? Image { get; set; }
    public string? PreviewImages { get; set; }
    public string? VideoUrl { get; set; }
}

// === DTO CHO SEARCH/FILTER ===
public class ProductSearchDto
{
    public string? Name { get; set; }
    public string? Category { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string? Color { get; set; }
    public string? Size { get; set; }
}


// === ĐỊNH NGHĨA CONTROLLER ===
namespace Thuan.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    // [Authorize] // TẠM THỜI COMMENT DÒNG NÀY ĐỂ TEST CHO DỄ
    public class ProductsController : ControllerBase
    {
        private readonly AppDbContext _context; 
        
        // Constructor: Dùng để Inject AppDbContext
        public ProductsController(AppDbContext context)
        {
            _context = context;
        }


        // === 1. GET /api/products (ĐÃ SỬA LỖI PHÂN TRANG) ===
        // Hàm này được gọi bởi sanpham.html
        [HttpGet]
        [AllowAnonymous] // Cho phép truy cập công khai
        public async Task<IActionResult> GetAll()
        {
            // Chỉ cần 1 dòng này để lấy TẤT CẢ sản phẩm
            var products = await _context.Products.ToListAsync();
            
            // Trả về tất cả sản phẩm
            return Ok(products);
        }

        // === 1B. GET /api/products/search (TÌM KIẾM & LỌC) ===
        [HttpGet("search")]
        [AllowAnonymous]
        public async Task<IActionResult> Search(
            [FromQuery] string? name,
            [FromQuery] string? category,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] string? color,
            [FromQuery] string? size)
        {
            var query = _context.Products.AsQueryable();

            // Lọc theo tên
            if (!string.IsNullOrWhiteSpace(name))
            {
                query = query.Where(p => p.Name.ToLower().Contains(name.ToLower()));
            }

            // Lọc theo danh mục
            if (!string.IsNullOrWhiteSpace(category))
            {
                query = query.Where(p => p.Category.ToLower() == category.ToLower());
            }

            // Lọc theo giá tối thiểu
            if (minPrice.HasValue)
            {
                query = query.Where(p => p.Price >= minPrice.Value);
            }

            // Lọc theo giá tối đa
            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= maxPrice.Value);
            }

            // Lọc theo màu (nếu có trường Color trong Product)
            if (!string.IsNullOrWhiteSpace(color))
            {
                query = query.Where(p => (p.Color ?? "").ToLower().Contains(color.ToLower()));
            }

            // Lọc theo kích thước (nếu có trường Size trong Product)
            if (!string.IsNullOrWhiteSpace(size))
            {
                query = query.Where(p => (p.Size ?? "").ToLower().Contains(size.ToLower()));
            }

            var results = await query.ToListAsync();
            return Ok(results);
        }

        // === 2. GET /api/products/{id} (Lấy chi tiết Sản phẩm) ===
        [HttpGet("{id}")]
        [AllowAnonymous] // Cho phép truy cập công khai
        public async Task<IActionResult> GetById(int id)
        {
            var product = await _context.Products.FindAsync(id);

            if (product == null)
            {
                return NotFound($"Không tìm thấy sản phẩm ID: {id}");
            }

            return Ok(product);
        }

        // === 3. POST /api/products (Thêm Sản phẩm mới) ===
        [HttpPost]
        [Authorize(Roles = "admin")] // Chỉ Admin mới được thêm
        public async Task<IActionResult> Create([FromBody] Product product)
        {
            if (product == null)
            {
                return BadRequest("Dữ liệu sản phẩm không hợp lệ.");
            }

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
        }
        
        // === 4. PUT /api/products/{id} (CẬP NHẬT Sản phẩm) ===
        [HttpPut("{id}")]
        [Authorize(Roles = "admin")] // Chỉ Admin mới được cập nhật
        public async Task<IActionResult> Update(int id, [FromBody] ProductUpdateDto updatedProductDto)
        {
            var product = await _context.Products.FindAsync(id);

            if (product == null)
            {
                return NotFound($"Không tìm thấy sản phẩm ID: {id}");
            }
            
            product.Name = updatedProductDto.Name ?? product.Name;
            product.Description = updatedProductDto.Description ?? product.Description;
            product.Price = updatedProductDto.Price ?? product.Price;
            product.OriginalPrice = updatedProductDto.OriginalPrice ?? product.OriginalPrice;
            product.Discount = updatedProductDto.Discount ?? product.Discount;
            product.Category = updatedProductDto.Category ?? product.Category;
            product.Size = updatedProductDto.Size ?? product.Size;
            product.Color = updatedProductDto.Color ?? product.Color;
            product.Stock = updatedProductDto.Stock ?? product.Stock;
            product.Image = updatedProductDto.Image ?? product.Image;
            product.PreviewImages = updatedProductDto.PreviewImages ?? product.PreviewImages;
            product.VideoUrl = updatedProductDto.VideoUrl ?? product.VideoUrl;

            try
            {
                _context.Products.Update(product);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return Ok(new { message = $"Đã cập nhật sản phẩm ID: {id}" });
        }

        // === 5. DELETE /api/products/{id} (Xóa Sản phẩm) ===
        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")] // Chỉ Admin mới được xóa
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _context.Products.FindAsync(id);

            if (product == null)
            {
                return NotFound($"Không tìm thấy sản phẩm ID: {id}");
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã xóa sản phẩm ID: {id}" });
        }
        
        // Hàm kiểm tra sự tồn tại của Sản phẩm
        private bool ProductExists(int id)
        {
            return _context.Products.Any(e => e.Id == id);
        }
    }
}