# seed-demo.ps1 - Tạo tài khoản demo + dữ liệu hành vi cho K-means
$API = "http://localhost:5281/api"

Write-Host "`n=== TAO DU LIEU DEMO DATA MINING ===`n" -ForegroundColor Cyan

try {
    $res = Invoke-RestMethod -Uri "$API/seed/demo" -Method POST
    Write-Host "Thanh cong!" -ForegroundColor Green
    Write-Host "Users tao moi: $($res.usersCreated)"
    Write-Host "Users da seed: $($res.usersSeeded)"
    Write-Host "Tong users co hanh vi: $($res.totalUsersWithBehavior)"
    Write-Host "`nMat khau chung: demo123`n" -ForegroundColor Yellow
    Write-Host "TAI KHOAN DEMO:" -ForegroundColor Cyan
    $res.accounts | ForEach-Object {
        Write-Host "  - $($_.email) | $($_.name) | $($_.profile)"
    }

    Write-Host "`nChay K-means..." -ForegroundColor Yellow
    $kmeans = Invoke-RestMethod -Uri "$API/datamining/kmeans" -Method POST -ContentType "application/json" -Body '{"k":3}'
    Write-Host "K-means OK! Nhom:" -ForegroundColor Green
    $kmeans.userProfiles | ForEach-Object {
        Write-Host "  [$($_.profileName)] $($_.userCount) khach - Engagement: $([math]::Round($_.averageEngagement,1))"
    }
} catch {
    Write-Host "Loi: $_" -ForegroundColor Red
    Write-Host "Hay chay backend: cd ThuanBackend/Thuan.API && dotnet run" -ForegroundColor Yellow
}
