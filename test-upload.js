// Test Firebase Storage Upload
// Run this with: node test-upload.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// Go to Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'kvk-stats-tracker-d6c29.firebasestorage.app'
});

const bucket = admin.storage().bucket();

async function testUpload() {
  try {
    // Create a test file
    const testContent = 'Test file content - ' + new Date().toISOString();
    const testFileName = 'test-file-' + Date.now() + '.txt';
    const localPath = path.join(__dirname, testFileName);
    
    fs.writeFileSync(localPath, testContent);
    console.log('✅ Test file created:', testFileName);
    
    // Upload to Firebase Storage
    const destination = `uploads/test/${testFileName}`;
    await bucket.upload(localPath, {
      destination: destination,
      metadata: {
        contentType: 'text/plain',
        metadata: {
          uploadedBy: 'test-script',
          timestamp: Date.now().toString()
        }
      }
    });
    
    console.log('✅ File uploaded successfully to:', destination);
    
    // Get download URL
    const file = bucket.file(destination);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });
    
    console.log('📎 Download URL:', url);
    
    // Clean up local test file
    fs.unlinkSync(localPath);
    console.log('🧹 Local test file cleaned up');
    
    console.log('\n✨ Test completed successfully! Firebase Storage is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testUpload();