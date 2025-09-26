#!/usr/bin/env node

/**
 * Fix Migration Issues Script
 * Addresses common Firebase migration problems
 */

const admin = require('firebase-admin');
const path = require('path');

const SOURCE_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc',
  serviceAccountPath: './source-firebase-service-account.json'
};

const TARGET_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc-a5faf',
  serviceAccountPath: './destination-firebase-service-account.json'
};

class MigrationFixer {
  constructor() {
    this.sourceApp = null;
    this.targetApp = null;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Migration Fixer...');
      
      // Initialize source Firebase app
      const sourceServiceAccount = require(path.resolve(SOURCE_PROJECT_CONFIG.serviceAccountPath));
      this.sourceApp = admin.initializeApp({
        credential: admin.credential.cert(sourceServiceAccount),
        projectId: SOURCE_PROJECT_CONFIG.projectId,
        storageBucket: `${SOURCE_PROJECT_CONFIG.projectId}.appspot.com`
      }, 'source');

      // Initialize target Firebase app  
      const targetServiceAccount = require(path.resolve(TARGET_PROJECT_CONFIG.serviceAccountPath));
      this.targetApp = admin.initializeApp({
        credential: admin.credential.cert(targetServiceAccount),
        projectId: TARGET_PROJECT_CONFIG.projectId,
        storageBucket: `${TARGET_PROJECT_CONFIG.projectId}.appspot.com`
      }, 'target');

      console.log('✅ Apps initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize apps:', error);
      return false;
    }
  }

  async checkTargetProjectSetup() {
    console.log('\n🔍 Checking target project setup...');
    
    const issues = [];
    const targetAuth = admin.auth(this.targetApp);
    
    try {
      // Check if Authentication is enabled
      await targetAuth.listUsers(1);
      console.log('✅ Authentication service is enabled');
    } catch (error) {
      issues.push('Authentication service not properly configured');
      console.log('❌ Authentication service issue:', error.message);
    }

    try {
      // Check if Storage bucket exists
      const targetBucket = admin.storage(this.targetApp).bucket();
      await targetBucket.exists();
      console.log('✅ Storage bucket exists');
    } catch (error) {
      issues.push('Storage bucket does not exist');
      console.log('❌ Storage bucket issue:', error.message);
    }

    return issues;
  }

  async migrateAuthenticationFixed() {
    console.log('\n🔐 Attempting fixed Authentication migration...');
    
    const sourceAuth = admin.auth(this.sourceApp);
    const targetAuth = admin.auth(this.targetApp);
    
    try {
      let nextPageToken;
      let userCount = 0;
      let successCount = 0;
      let failCount = 0;
      
      do {
        const listUsersResult = await sourceAuth.listUsers(100, nextPageToken); // Smaller batches
        
        for (const userRecord of listUsersResult.users) {
          try {
            // Check if user already exists
            try {
              await targetAuth.getUser(userRecord.uid);
              console.log(`⚠️  User ${userRecord.uid} already exists, skipping`);
              successCount++;
              continue;
            } catch (error) {
              // User doesn't exist, proceed with creation
            }

            // Create user with minimal required data
            const userToCreate = {
              uid: userRecord.uid,
            };

            // Only add fields that exist and are valid
            if (userRecord.email && userRecord.email.trim()) {
              userToCreate.email = userRecord.email;
              userToCreate.emailVerified = userRecord.emailVerified || false;
            }

            if (userRecord.phoneNumber && userRecord.phoneNumber.trim()) {
              userToCreate.phoneNumber = userRecord.phoneNumber;
            }

            if (userRecord.displayName && userRecord.displayName.trim()) {
              userToCreate.displayName = userRecord.displayName;
            }

            if (userRecord.photoURL && userRecord.photoURL.trim()) {
              userToCreate.photoURL = userRecord.photoURL;
            }

            userToCreate.disabled = userRecord.disabled || false;

            await targetAuth.createUser(userToCreate);
            successCount++;
            
            if (successCount % 10 === 0) {
              console.log(`✅ Migrated ${successCount} users...`);
            }
            
          } catch (error) {
            failCount++;
            if (error.code === 'auth/uid-already-exists') {
              console.log(`⚠️  User ${userRecord.uid} already exists`);
              successCount++;
              failCount--;
            } else {
              console.error(`❌ Failed to migrate user ${userRecord.uid}:`, error.code || error.message);
            }
          }
          
          userCount++;
        }
        
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);
      
      console.log(`\n📊 Authentication Migration Results:`);
      console.log(`   Total users processed: ${userCount}`);
      console.log(`   ✅ Successfully migrated: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
      
      return { total: userCount, success: successCount, failed: failCount };
      
    } catch (error) {
      console.error('❌ Failed to migrate authentication:', error);
      return { total: 0, success: 0, failed: 0, error: error.message };
    }
  }

  async createStorageBucket() {
    console.log('\n📁 Creating Storage bucket...');
    
    try {
      const targetBucket = admin.storage(this.targetApp).bucket();
      const [exists] = await targetBucket.exists();
      
      if (exists) {
        console.log('✅ Storage bucket already exists');
        return true;
      }

      // Note: Bucket creation via Admin SDK requires additional permissions
      // The bucket should be created via Firebase Console
      console.log('⚠️  Storage bucket needs to be created manually');
      console.log('📋 Instructions:');
      console.log(`   1. Go to Firebase Console: https://console.firebase.google.com/project/${TARGET_PROJECT_CONFIG.projectId}`);
      console.log('   2. Go to Storage section');
      console.log('   3. Click "Get started" to create the default bucket');
      console.log('   4. Choose your preferred location');
      console.log('   5. Re-run the migration after bucket is created');
      
      return false;
    } catch (error) {
      console.error('❌ Storage bucket check failed:', error.message);
      return false;
    }
  }

  async migrateStorageFixed() {
    console.log('\n📁 Attempting fixed Storage migration...');
    
    try {
      const sourceBucket = admin.storage(this.sourceApp).bucket();
      const targetBucket = admin.storage(this.targetApp).bucket();
      
      // Check if target bucket exists
      const [targetExists] = await targetBucket.exists();
      if (!targetExists) {
        console.log('❌ Target storage bucket does not exist');
        await this.createStorageBucket();
        return { success: false, reason: 'Target bucket not found' };
      }

      const [files] = await sourceBucket.getFiles();
      console.log(`📄 Found ${files.length} files to migrate`);
      
      if (files.length === 0) {
        console.log('✅ No files to migrate');
        return { success: true, filesCount: 0 };
      }

      let successCount = 0;
      let failCount = 0;
      
      for (const file of files) {
        try {
          // Download file from source
          const [fileBuffer] = await file.download();
          
          // Upload to target bucket
          const targetFile = targetBucket.file(file.name);
          await targetFile.save(fileBuffer, {
            metadata: file.metadata,
            resumable: false // For smaller files
          });
          
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`✅ Migrated ${successCount}/${files.length} files...`);
          }
          
        } catch (error) {
          failCount++;
          console.error(`❌ Failed to migrate file ${file.name}:`, error.message);
        }
      }
      
      console.log(`\n📊 Storage Migration Results:`);
      console.log(`   Total files: ${files.length}`);
      console.log(`   ✅ Successfully migrated: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
      
      return { success: true, filesCount: files.length, successCount, failCount };
      
    } catch (error) {
      console.error('❌ Failed to migrate storage:', error.message);
      return { success: false, error: error.message };
    }
  }

  async generateSetupInstructions() {
    console.log('\n📋 Target Project Setup Instructions');
    console.log('=====================================');
    console.log(`🎯 Project: ${TARGET_PROJECT_CONFIG.projectId}`);
    console.log(`🔗 Console: https://console.firebase.google.com/project/${TARGET_PROJECT_CONFIG.projectId}`);
    
    console.log('\n1️⃣  Enable Authentication Providers:');
    console.log('   • Go to Authentication > Sign-in method');
    console.log('   • Enable "Phone" provider');
    console.log('   • Enable "Email/Password" provider');
    console.log('   • Configure any other providers you use');
    
    console.log('\n2️⃣  Create Storage Bucket:');
    console.log('   • Go to Storage section');
    console.log('   • Click "Get started"');
    console.log('   • Choose your preferred location');
    console.log('   • Accept default security rules');
    
    console.log('\n3️⃣  Enable Firestore (if not already done):');
    console.log('   • Go to Firestore Database');
    console.log('   • Click "Create database"');
    console.log('   • Choose production mode');
    console.log('   • Select your preferred location');
    
    console.log('\n4️⃣  After setup is complete, re-run:');
    console.log('   npm run migrate:firebase');
  }

  async run() {
    console.log('🔧 Starting Migration Issue Fixer...\n');
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Fixer aborted due to initialization failure');
      return;
    }
    
    // Check target project setup
    const issues = await this.checkTargetProjectSetup();
    
    if (issues.length > 0) {
      console.log('\n⚠️  Target Project Setup Issues:');
      issues.forEach(issue => console.log(`   ❌ ${issue}`));
      await this.generateSetupInstructions();
      return;
    }
    
    // Attempt fixed migrations
    console.log('\n🔄 Attempting to fix migration issues...');
    
    const authResult = await this.migrateAuthenticationFixed();
    const storageResult = await this.migrateStorageFixed();
    
    console.log('\n🎉 Fix Attempt Complete!');
    console.log('========================');
    
    if (authResult.success !== undefined && authResult.success > 0) {
      console.log(`✅ Authentication: ${authResult.success} users migrated`);
    } else {
      console.log('⚠️  Authentication: Still needs manual setup');
    }
    
    if (storageResult.success) {
      console.log(`✅ Storage: ${storageResult.successCount || 0} files migrated`);
    } else {
      console.log('⚠️  Storage: Still needs manual setup');
    }
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Complete any manual setup steps above');
    console.log('2. Re-run: npm run migrate:firebase');
    console.log('3. Verify: npm run migrate:verify');
  }
}

// Run fixer if called directly
if (require.main === module) {
  const fixer = new MigrationFixer();
  fixer.run().catch(console.error);
}

module.exports = MigrationFixer;
