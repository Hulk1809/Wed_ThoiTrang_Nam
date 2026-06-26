# test-datamining.ps1 - Quick test script for data mining features (PowerShell)

$API_URL = "http://localhost:5281/api"
$USER_ID = 1

Write-Host "`n🧪 Testing Data Tracking + K-means Features...`n" -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Test 1: Log User Event
Write-Host "1️⃣ Testing: POST /api/userbehavior" -ForegroundColor Yellow
$body1 = @{
    userId = $USER_ID
    eventType = "view"
    productId = 5
    pageName = "chitietsp"
    durationSeconds = 45
    interest = '{"color": "đỏ", "size": "M"}'
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$API_URL/userbehavior" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body1
    Write-Host "✅ OK - Status: $($response.StatusCode)`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
}

# Test 2: Log Video View
Write-Host "`n2️⃣ Testing: POST /api/videotracking" -ForegroundColor Yellow
$body2 = @{
    userId = $USER_ID
    videoUrl = "https://example.com/video1.mp4"
    videoTitle = "Hướng dẫn mặc áo"
    watchedSeconds = 150
    totalDuration = 600
    interest = '{"color": "đỏ", "style": "casual"}'
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$API_URL/videotracking" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body2
    Write-Host "✅ OK - Status: $($response.StatusCode)`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
}

# Test 3: Get User Behaviors
Write-Host "`n3️⃣ Testing: GET /api/userbehavior?userId=$USER_ID" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/userbehavior?userId=$USER_ID" -Method GET
    Write-Host "✅ OK - Status: $($response.StatusCode)`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
}

# Test 4: Get Video Tracking Stats
Write-Host "`n4️⃣ Testing: GET /api/videotracking/stats/top-videos" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/videotracking/stats/top-videos?limit=10" -Method GET
    Write-Host "✅ OK - Status: $($response.StatusCode)`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
}

# Test 5: Run K-means
Write-Host "`n5️⃣ Testing: POST /api/datamining/kmeans" -ForegroundColor Yellow
Write-Host "⚠️  Note: Requires >= 3 users with logged behaviors`n" -ForegroundColor Yellow
$body5 = @{
    k = 3
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$API_URL/datamining/kmeans" `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $body5
    Write-Host "✅ OK - Status: $($response.StatusCode)`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
}

# Test 6: Get Analysis
Write-Host "`n6️⃣ Testing: GET /api/datamining/analysis" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/datamining/analysis" -Method GET
    Write-Host "✅ OK - Status: $($response.StatusCode)`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
}

# Test 7: Upload File
Write-Host "`n7️⃣ Testing: POST /api/upload" -ForegroundColor Yellow
try {
    # Create test file
    $testFile = "test-upload.txt"
    Set-Content -Path $testFile -Value "Test upload content"
    
    # Upload file
    $filePath = (Get-Item -Path $testFile).FullName
    $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $headers = @{"Content-Type" = "multipart/form-data; boundary=$boundary"}
    
    $body = @()
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="file"; filename="test-upload.txt"'
    $body += 'Content-Type: text/plain'
    $body += ""
    $body += (Get-Content $testFile)
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="userId"'
    $body += ""
    $body += "$USER_ID"
    $body += "--$boundary"
    $body += 'Content-Disposition: form-data; name="description"'
    $body += ""
    $body += "Test upload file"
    $body += "--$boundary--"
    
    $bodyStr = [System.String]::Join("`r`n", $body)
    
    $response = Invoke-WebRequest -Uri "$API_URL/upload" `
        -Method POST `
        -Headers $headers `
        -Body $bodyStr
    
    Write-Host "✅ OK - Status: $($response.StatusCode)`n" -ForegroundColor Green
    $response.Content | ConvertFrom-Json | Format-List
    
    # Cleanup
    Remove-Item $testFile -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "❌ Error: $_`n" -ForegroundColor Red
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "`n🎉 All tests completed!`n" -ForegroundColor Green
