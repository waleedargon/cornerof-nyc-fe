#!/usr/bin/env node

/**
 * Script to encode Firebase service account JSON to base64
 * Usage: node scripts/encode-service-account.js path/to/service-account.json
 */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Firebase Service Account Base64 Encoder');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/encode-service-account.js <path-to-service-account.json>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/encode-service-account.js ./cornerof-nyc-firebase-adminsdk.json');
    console.log('');
    console.log('This will output the base64 encoded string that you can use as');
    console.log('the FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.');
    process.exit(1);
  }

  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    console.error('');
    console.error('Make sure the path to your service account JSON file is correct.');
    process.exit(1);
  }

  try {
    // Read the service account JSON file
    const serviceAccountJson = fs.readFileSync(filePath, 'utf8');
    
    // Validate it's valid JSON
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Check required fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Invalid service account JSON. Missing fields:', missingFields.join(', '));
      process.exit(1);
    }
    
    // Encode to base64
    const base64 = Buffer.from(serviceAccountJson).toString('base64');
    
    console.log('✅ Service account JSON encoded successfully!');
    console.log('');
    console.log('📋 Copy this base64 string and add it as FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable:');
    console.log('');
    console.log('=' .repeat(80));
    console.log(base64);
    console.log('=' .repeat(80));
    console.log('');
    console.log('🔧 Firebase App Hosting Setup:');
    console.log('1. Go to Firebase Console → App Hosting → Your App → Settings');
    console.log('2. Add environment variable: FIREBASE_SERVICE_ACCOUNT_BASE64');
    console.log('3. Paste the base64 string above as the value');
    console.log('4. Redeploy your application');
    console.log('');
    console.log('Project ID:', serviceAccount.project_id);
    console.log('Service Account Email:', serviceAccount.client_email);
    
  } catch (error) {
    console.error('❌ Error processing service account file:', error.message);
    process.exit(1);
  }
}

main();
