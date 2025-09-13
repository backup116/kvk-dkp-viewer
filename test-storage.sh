#!/bin/bash

# Test Firebase Storage Upload from Command Line
# This script tests if Firebase Storage is accessible

echo "🧪 Testing Firebase Storage Configuration"
echo "========================================="

# Your Firebase project details
PROJECT_ID="kvk-stats-tracker-d6c29"
BUCKET="kvk-stats-tracker-d6c29.firebasestorage.app"

# Test 1: Check if storage bucket is accessible (public read test)
echo ""
echo "Test 1: Checking storage bucket accessibility..."
STORAGE_URL="https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o"
response=$(curl -s -o /dev/null -w "%{http_code}" "$STORAGE_URL")

if [ "$response" -eq 200 ] || [ "$response" -eq 401 ]; then
    echo "✅ Storage bucket is reachable (HTTP $response)"
else
    echo "❌ Storage bucket not accessible (HTTP $response)"
fi

# Test 2: Try to list files (will fail without auth, but shows connectivity)
echo ""
echo "Test 2: Attempting to list files..."
curl -s "$STORAGE_URL" | head -c 200
echo ""

# Test 3: Check Firestore REST API
echo ""
echo "Test 3: Checking Firestore API..."
FIRESTORE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/test"
firestore_response=$(curl -s -o /dev/null -w "%{http_code}" "$FIRESTORE_URL")

if [ "$firestore_response" -eq 200 ] || [ "$firestore_response" -eq 403 ] || [ "$firestore_response" -eq 401 ]; then
    echo "✅ Firestore is reachable (HTTP $firestore_response)"
else
    echo "❌ Firestore not accessible (HTTP $firestore_response)"
fi

echo ""
echo "========================================="
echo "📊 Test Summary:"
echo "- Storage Bucket: ${BUCKET}"
echo "- Project ID: ${PROJECT_ID}"
echo ""
echo "To fully test upload functionality:"
echo "1. Open test-storage.html in a browser"
echo "2. Or use the admin panel to upload a file"
echo ""
echo "If you see 401/403 errors above, that's normal - it means"
echo "the services are reachable but require authentication."