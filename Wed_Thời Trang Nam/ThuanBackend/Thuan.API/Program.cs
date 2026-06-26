using Thuan.API.Data;
using Thuan.API.Models;
using Thuan.API.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Text.Json.Serialization; 


var builder = WebApplication.CreateBuilder(args);

// 1. Thêm dịch vụ
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Thêm DataMiningService
builder.Services.AddScoped<DataMiningService>();
builder.Services.AddScoped<AdStrategyService>();
builder.Services.AddHttpClient<GeminiService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowMyFrontend",
        policy =>
        {
            if (builder.Environment.IsDevelopment())
            {
                // In development allow any origin to simplify local testing (change in production)
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            }
            else
            {
                policy.WithOrigins("http://127.0.0.1:5500", "http://localhost:5500")
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .WithExposedHeaders("X-Pagination-Total-Count", "X-Pagination-Total-Pages", "X-Pagination-Current-Page", "X-Pagination-Page-Size");
            }
        });
});

// KÍCH HOẠT BẢO MẬT JWT
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
            )
        };
    });


// Thêm Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme {
        Name = "Authorization", In = ParameterLocation.Header, Type = SecuritySchemeType.ApiKey, 
        Scheme = "Bearer", BearerFormat = "JWT", Description = "Điền Token JWT: 'Bearer {token}'"
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement {
        { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }}, new string[] {} }
    });
});

// --- Xây dựng ứng dụng ---
var app = builder.Build();

// Áp dụng migrations tự động khi khởi động (giúp tránh phải cài dotnet-ef trên máy dev)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.Migrate();
        // Đảm bảo cột VideoUrl tồn tại (migration bổ sung)
        db.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Products') AND name = 'VideoUrl')
                ALTER TABLE Products ADD VideoUrl nvarchar(max) NOT NULL DEFAULT '';
        ");
    }
    catch (Exception ex)
    {
        // In lỗi lên console nhưng không ngăn app khởi động
        Console.WriteLine($"Không thể áp dụng migrations: {ex.Message}");
    }
}

// --- Cấu hình pipeline ---
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowMyFrontend");
app.UseStaticFiles();
app.UseHttpsRedirection();
app.UseAuthentication(); // Phải đứng trước
app.UseAuthorization();  // Phải đứng sau
app.MapControllers();
app.Run();