#!/bin/bash
# test-datamining.sh - Quick test script for data mining features

API_URL="http://localhost:5281/api"
USER_ID=1

echo "🧪 Testing Data Tracking + K-means Features..."
echo "================================================"
echo ""

# Test 1: Log User Event
echo "1️⃣ Testing: POST /api/userbehavior"
curl -X POST "$API_URL/userbehavior" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": '$USER_ID',
    "eventType": "view",
    "productId": 5,
    "pageName": "chitietsp",
    "durationSeconds": 45,
    "interest": "{\"color\": \"đỏ\", \"size\": \"M\"}"
  }' && echo -e "\n✅ OK\n"

# Test 2: Log Video View
echo "2️⃣ Testing: POST /api/videotracking"
curl -X POST "$API_URL/videotracking" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": '$USER_ID',
    "videoUrl": "https://example.com/video1.mp4",
    "videoTitle": "Hướng dẫn mặc áo",
    "watchedSeconds": 150,
    "totalDuration": 600,
    "interest": "{\"color\": \"đỏ\", \"style\": \"casual\"}"
  }' && echo -e "\n✅ OK\n"

# Test 3: Get User Behaviors
echo "3️⃣ Testing: GET /api/userbehavior?userId=$USER_ID"
curl -X GET "$API_URL/userbehavior?userId=$USER_ID" && echo -e "\n✅ OK\n"

# Test 4: Get Video Tracking Stats
echo "4️⃣ Testing: GET /api/videotracking/stats/top-videos"
curl -X GET "$API_URL/videotracking/stats/top-videos?limit=10" && echo -e "\n✅ OK\n"

# Test 5: Run K-means (Requires >= 3 users with behavior)
echo "5️⃣ Testing: POST /api/datamining/kmeans"
echo "⚠️ Note: Requires >= 3 users with logged behaviors"
curl -X POST "$API_URL/datamining/kmeans" \
  -H "Content-Type: application/json" \
  -d '{"k": 3}' && echo -e "\n✅ OK\n"

# Test 6: Get Analysis
echo "6️⃣ Testing: GET /api/datamining/analysis"
curl -X GET "$API_URL/datamining/analysis" && echo -e "\n✅ OK\n"

# Test 7: Upload File (Create test.txt first)
echo "7️⃣ Testing: POST /api/upload"
echo "Test upload content" > test.txt
curl -X POST "$API_URL/upload" \
  -F "file=@test.txt" \
  -F "userId=$USER_ID" \
  -F "description=Test upload file" && echo -e "\n✅ OK\n"
rm -f test.txt

echo "================================================"
echo "🎉 All tests completed!"
