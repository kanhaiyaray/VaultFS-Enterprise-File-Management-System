// server/test-supabase.js
require('dotenv').config();
const supabase = require('./utils/supabase');

async function testSupabase() {
  console.log('🚀 Testing Supabase Connection...\n');
  
  try {
    // Test 1: Upload a file
    console.log('📤 Uploading test file...');
    const result = await supabase.uploadFile(
      'test-user-123',
      Buffer.from('Hello from VaultFS! 🎉'),
      'test-file.txt',
      'text/plain'
    );
    
    console.log('✅ Upload successful!');
    console.log(`   File path: ${result.path}`);
    console.log(`   Public URL: ${result.url}\n`);
    
    // Test 2: Get signed URL
    console.log('🔐 Getting signed URL...');
    const signedUrl = await supabase.getSignedUrl(
      'test-user-123',
      result.path,
      300
    );
    console.log(`   Signed URL (valid for 5 min): ${signedUrl}\n`);
    
    // Test 3: Get file info
    console.log('📋 Getting file info...');
    const info = await supabase.getFileInfo(result.path);
    console.log(`   File size: ${info.size} bytes`);
    console.log(`   Created: ${info.created_at}\n`);
    
    console.log('✅ All tests passed! Supabase is working perfectly! 🎉');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('   Make sure your .env file has the correct credentials.');
  }
}

testSupabase();