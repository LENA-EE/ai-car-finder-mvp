#!/bin/bash
# AI Car Finder MVP - Smoke Tests
# Согласно architecture.txt section 11.10

set -e

API_URL="${API_URL:-http://localhost:3002}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3003}"

echo "🧪 AI Car Finder MVP - Smoke Tests"
echo "=================================="
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# 1. Backend Health Check
echo "1️⃣ Testing backend health..."
HEALTH=$(curl -sf "$API_URL/health" || echo "FAILED")
if [[ "$HEALTH" == *"healthy"* ]]; then
    echo "   ✅ Backend healthy"
else
    echo "   ❌ Backend health check failed"
    exit 1
fi

# 2. Parse Endpoint
echo "2️⃣ Testing parse endpoint..."
PARSE=$(curl -sf -X POST "$API_URL/api/v1/parse" \
    -H "Content-Type: application/json" \
    -d '{"query": "bmw x5 diesel"}' || echo "FAILED")
if [[ "$PARSE" == *"filters"* ]]; then
    echo "   ✅ Parse endpoint working"
else
    echo "   ❌ Parse endpoint failed"
    exit 1
fi

# 3. Cars Endpoint
echo "3️⃣ Testing cars endpoint..."
CAR=$(curl -sf "$API_URL/api/v1/cars/1" || echo "FAILED")
if [[ "$CAR" == *"mark_name"* ]]; then
    echo "   ✅ Cars endpoint working"
else
    echo "   ❌ Cars endpoint failed"
    exit 1
fi

# 4. Admin Analytics
echo "4️⃣ Testing admin analytics..."
ANALYTICS=$(curl -sf "$API_URL/api/v1/admin/analytics" || echo "FAILED")
if [[ "$ANALYTICS" == *"today"* ]]; then
    echo "   ✅ Admin analytics working"
else
    echo "   ❌ Admin analytics failed"
    exit 1
fi

# 5. Admin Prompts
echo "5️⃣ Testing admin prompts..."
PROMPTS=$(curl -sf "$API_URL/api/v1/admin/prompts" || echo "FAILED")
if [[ "$PROMPTS" == *"system_prompt"* ]]; then
    echo "   ✅ Admin prompts working"
else
    echo "   ❌ Admin prompts failed"
    exit 1
fi

# 6. Frontend (optional)
echo "6️⃣ Testing frontend..."
FRONTEND=$(curl -sf "$FRONTEND_URL" || echo "FAILED")
if [[ "$FRONTEND" == *"html"* ]] || [[ "$FRONTEND" == *"DOCTYPE"* ]]; then
    echo "   ✅ Frontend serving"
else
    echo "   ⚠️ Frontend not accessible (may be expected)"
fi

echo ""
echo "=================================="
echo "✅ All smoke tests passed!"
echo "🚀 MVP is ready for production!"
