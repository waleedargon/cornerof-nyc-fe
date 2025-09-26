#!/usr/bin/env node

/**
 * Migration Setup Script
 * Prepares the environment for Firebase migration
 */

const fs = require('fs');
const path = require('path');

class MigrationSetup {
  constructor() {
    this.sourceProjectId = 'cornerof-nyc';
    this.targetProjectId = 'cornerof-nyc-a5faf';
  }

  checkServiceAccountFiles() {
    console.log('🔍 Checking service account files...');
    
    const sourceFile = './source-firebase-service-account.json';
    const targetFile = './destination-firebase-service-account.json';
    
    const issues = [];
    
    if (!fs.existsSync(sourceFile)) {
      issues.push(`❌ Source service account file missing: ${sourceFile}`);
    } else {
      try {
        const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
        if (sourceData.project_id !== this.sourceProjectId) {
          issues.push(`⚠️  Source project ID mismatch: expected ${this.sourceProjectId}, got ${sourceData.project_id}`);
        } else {
          console.log(`✅ Source service account validated: ${sourceData.project_id}`);
        }
      } catch (error) {
        issues.push(`❌ Source service account file is invalid JSON`);
      }
    }
    
    if (!fs.existsSync(targetFile)) {
      issues.push(`❌ Target service account file missing: ${targetFile}`);
    } else {
      try {
        const targetData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        if (targetData.project_id !== this.targetProjectId) {
          issues.push(`⚠️  Target project ID mismatch: expected ${this.targetProjectId}, got ${targetData.project_id}`);
        } else {
          console.log(`✅ Target service account validated: ${targetData.project_id}`);
        }
      } catch (error) {
        issues.push(`❌ Target service account file is invalid JSON`);
      }
    }
    
    return issues;
  }

  checkFirebaseAdmin() {
    console.log('📦 Checking firebase-admin dependency...');
    
    try {
      require('firebase-admin');
      console.log('✅ firebase-admin is installed');
      return true;
    } catch (error) {
      console.log('❌ firebase-admin not found');
      return false;
    }
  }

  generateNewFirebaseConfig() {
    console.log('\n🔧 Generating new Firebase configuration...');
    
    const newConfig = `// Updated Firebase configuration for migration
// Replace the config in src/lib/firebase.ts with this:

const firebaseConfig = {
  apiKey: "YOUR_NEW_API_KEY", // Get from Firebase Console
  authDomain: "${this.targetProjectId}.firebaseapp.com",
  projectId: "${this.targetProjectId}",
  storageBucket: "${this.targetProjectId}.firebasestorage.app",
  messagingSenderId: "YOUR_NEW_SENDER_ID", // Get from Firebase Console
  appId: "YOUR_NEW_APP_ID" // Get from Firebase Console
};

// Also update .firebaserc:
{
  "projects": {
    "default": "${this.targetProjectId}"
  }
}`;

    fs.writeFileSync('./new-firebase-config.txt', newConfig);
    console.log('📄 New config template saved to: new-firebase-config.txt');
  }

  displayMigrationPlan() {
    console.log('\n📋 Migration Plan:');
    console.log('==================');
    console.log(`📤 Source Project: ${this.sourceProjectId}`);
    console.log(`📥 Target Project: ${this.targetProjectId}`);
    console.log('\n🔄 Migration Steps:');
    console.log('1. ✅ Service accounts configured');
    console.log('2. 🔄 Ready to migrate data');
    console.log('3. ⏳ Update app configuration');
    console.log('4. ⏳ Deploy to new project');
    console.log('\n📊 Collections to migrate:');
    console.log('   - users');
    console.log('   - groups');
    console.log('   - matches');
    console.log('   - invitations');
    console.log('   - messages');
    console.log('   - reports');
    console.log('   - venues');
    console.log('   - votes');
  }

  run() {
    console.log('🚀 Firebase Migration Setup');
    console.log('============================\n');
    
    // Check service account files
    const issues = this.checkServiceAccountFiles();
    
    // Check dependencies
    const hasFirebaseAdmin = this.checkFirebaseAdmin();
    
    console.log('\n📊 Setup Status:');
    console.log('================');
    
    if (issues.length === 0) {
      console.log('✅ Service account files: OK');
    } else {
      console.log('❌ Service account issues:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (hasFirebaseAdmin) {
      console.log('✅ Dependencies: OK');
    } else {
      console.log('❌ Missing dependencies');
      console.log('   Run: npm install firebase-admin');
    }
    
    if (issues.length === 0 && hasFirebaseAdmin) {
      console.log('\n🎉 Setup Complete! Ready for migration.');
      this.generateNewFirebaseConfig();
      this.displayMigrationPlan();
      
      console.log('\n🚀 Next Steps:');
      console.log('==============');
      console.log('1. Run migration: npm run migrate:firebase');
      console.log('2. Verify results: npm run migrate:verify');
      console.log('3. Update app config with new-firebase-config.txt');
      console.log('4. Deploy to new project');
    } else {
      console.log('\n⚠️  Setup Issues Found');
      console.log('======================');
      console.log('Please fix the issues above before running migration.');
      
      if (!hasFirebaseAdmin) {
        console.log('\n📦 Install missing dependency:');
        console.log('npm install firebase-admin');
      }
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new MigrationSetup();
  setup.run();
}

module.exports = MigrationSetup;
