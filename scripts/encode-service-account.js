#!/usr/bin/env node

/**
 * Service Account Encoder
 * Encodes Firebase service account JSON to base64 for environment variables
 */

const fs = require('fs');
const path = require('path');

function encodeServiceAccount(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Service account file not found: ${filePath}`);
      process.exit(1);
    }

    const serviceAccountJson = fs.readFileSync(filePath, 'utf8');
    
    // Validate JSON
    try {
      const parsed = JSON.parse(serviceAccountJson);
      if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
        console.error('❌ Invalid service account JSON: missing required fields');
        process.exit(1);
      }
      console.log(`✅ Service account validated for project: ${parsed.project_id}`);
    } catch (error) {
      console.error('❌ Invalid JSON format in service account file');
      process.exit(1);
    }

    // Encode to base64
    const base64Encoded = Buffer.from(serviceAccountJson).toString('base64');
    
    console.log('\n🔐 Base64 Encoded Service Account:');
    console.log('=====================================');
    console.log(base64Encoded);
    console.log('=====================================\n');
    
    console.log('📋 Add this to your environment variables:');
    console.log(`FIREBASE_SERVICE_ACCOUNT_BASE64=${base64Encoded}`);
    
    // Save to file for convenience
    const outputPath = path.join(path.dirname(filePath), 'service-account-base64.txt');
    fs.writeFileSync(outputPath, base64Encoded);
    console.log(`\n💾 Base64 string saved to: ${outputPath}`);
    
    return base64Encoded;
    
  } catch (error) {
    console.error('❌ Error encoding service account:', error.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🔐 Firebase Service Account Encoder');
    console.log('=====================================');
    console.log('Usage: node encode-service-account.js <path-to-service-account.json>');
    console.log('');
    console.log('Example:');
    console.log('  node encode-service-account.js keys/service-account.json');
    console.log('');
    console.log('This will encode your Firebase service account JSON to base64');
    console.log('for use in environment variables like FIREBASE_SERVICE_ACCOUNT_BASE64');
    process.exit(0);
  }
  
  const filePath = args[0];
  encodeServiceAccount(filePath);
}

if (require.main === module) {
  main();
}

module.exports = { encodeServiceAccount };