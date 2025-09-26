#!/usr/bin/env node

/**
 * Fix Storage Migration Script
 * Fixes storage bucket configuration and migration issues
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

class StorageFixer {
  constructor() {
    this.sourceApp = null;
    this.targetApp = null;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Storage Fixer...');
      
      // Initialize source Firebase app with correct bucket
      const sourceServiceAccount = require(path.resolve(SOURCE_PROJECT_CONFIG.serviceAccountPath));
      this.sourceApp = admin.initializeApp({
        credential: admin.credential.cert(sourceServiceAccount),
        projectId: SOURCE_PROJECT_CONFIG.projectId,
        // Try different bucket naming patterns
        storageBucket: `${SOURCE_PROJECT_CONFIG.projectId}.firebasestorage.app`
      }, 'source');

      // Initialize target Firebase app
      const targetServiceAccount = require(path.resolve(TARGET_PROJECT_CONFIG.serviceAccountPath));
      this.targetApp = admin.initializeApp({
        credential: admin.credential.cert(targetServiceAccount),
        projectId: TARGET_PROJECT_CONFIG.projectId,
        storageBucket: `${TARGET_PROJECT_CONFIG.projectId}.firebasestorage.app`
      }, 'target');

      console.log('✅ Apps initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize apps:', error);
      return false;
    }
  }

  async detectBucketNames() {
    console.log('\n🔍 Detecting correct bucket names...');
    
    const possibleSourceBuckets = [
      `${SOURCE_PROJECT_CONFIG.projectId}.firebasestorage.app`,
      `${SOURCE_PROJECT_CONFIG.projectId}.appspot.com`,
      SOURCE_PROJECT_CONFIG.projectId
    ];
    
    const possibleTargetBuckets = [
      `${TARGET_PROJECT_CONFIG.projectId}.firebasestorage.app`,
      `${TARGET_PROJECT_CONFIG.projectId}.appspot.com`,
      TARGET_PROJECT_CONFIG.projectId
    ];

    let sourceBucketName = null;
    let targetBucketName = null;

    // Test source buckets
    for (const bucketName of possibleSourceBuckets) {
      try {
        const bucket = admin.storage(this.sourceApp).bucket(bucketName);
        const [exists] = await bucket.exists();
        if (exists) {
          sourceBucketName = bucketName;
          console.log(`✅ Source bucket found: ${bucketName}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Source bucket not found: ${bucketName}`);
      }
    }

    // Test target buckets
    for (const bucketName of possibleTargetBuckets) {
      try {
        const bucket = admin.storage(this.targetApp).bucket(bucketName);
        const [exists] = await bucket.exists();
        if (exists) {
          targetBucketName = bucketName;
          console.log(`✅ Target bucket found: ${bucketName}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Target bucket not found: ${bucketName}`);
      }
    }

    return { sourceBucketName, targetBucketName };
  }

  async listSourceFiles(bucketName) {
    try {
      const bucket = admin.storage(this.sourceApp).bucket(bucketName);
      const [files] = await bucket.getFiles();
      console.log(`📄 Found ${files.length} files in source bucket`);
      return files;
    } catch (error) {
      console.error(`❌ Failed to list source files:`, error.message);
      return [];
    }
  }

  async migrateStorageWithCorrectBuckets(sourceBucketName, targetBucketName) {
    console.log('\n📁 Starting corrected Storage migration...');
    console.log(`📤 Source: ${sourceBucketName}`);
    console.log(`📥 Target: ${targetBucketName}`);
    
    try {
      const sourceBucket = admin.storage(this.sourceApp).bucket(sourceBucketName);
      const targetBucket = admin.storage(this.targetApp).bucket(targetBucketName);
      
      const [files] = await sourceBucket.getFiles();
      console.log(`📄 Found ${files.length} files to migrate`);
      
      if (files.length === 0) {
        console.log('✅ No files to migrate (source bucket is empty)');
        return { success: true, filesCount: 0 };
      }

      let successCount = 0;
      let failCount = 0;
      
      for (const file of files) {
        try {
          console.log(`🔄 Migrating: ${file.name}`);
          
          // Download file from source
          const [fileBuffer] = await file.download();
          
          // Upload to target bucket with same name
          const targetFile = targetBucket.file(file.name);
          await targetFile.save(fileBuffer, {
            metadata: file.metadata,
            resumable: false
          });
          
          successCount++;
          console.log(`✅ Migrated: ${file.name}`);
          
        } catch (error) {
          failCount++;
          console.error(`❌ Failed to migrate ${file.name}:`, error.message);
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

  async createTargetBucketInstructions() {
    console.log('\n📋 Create Target Storage Bucket');
    console.log('================================');
    console.log(`🎯 Project: ${TARGET_PROJECT_CONFIG.projectId}`);
    console.log(`🔗 Console: https://console.firebase.google.com/project/${TARGET_PROJECT_CONFIG.projectId}/storage`);
    
    console.log('\n📝 Steps:');
    console.log('1. Go to the Firebase Console link above');
    console.log('2. Click "Get started" if Storage is not set up');
    console.log('3. Choose "Start in production mode"');
    console.log('4. Select a location (preferably same as source)');
    console.log('5. Click "Done"');
    console.log('\n⏱️  This should take 1-2 minutes');
  }

  async run() {
    console.log('🔧 Starting Storage Migration Fixer...\n');
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Fixer aborted due to initialization failure');
      return;
    }
    
    // Detect correct bucket names
    const { sourceBucketName, targetBucketName } = await this.detectBucketNames();
    
    if (!sourceBucketName) {
      console.log('\n❌ Source storage bucket not found');
      console.log('This could mean:');
      console.log('1. Storage is not enabled in source project');
      console.log('2. No files have been uploaded yet');
      console.log('3. Different bucket naming pattern');
      return;
    }

    if (!targetBucketName) {
      console.log('\n❌ Target storage bucket not found');
      console.log('You need to enable Storage in the target project first.');
      await this.createTargetBucketInstructions();
      return;
    }

    // Check if source has files
    const sourceFiles = await this.listSourceFiles(sourceBucketName);
    if (sourceFiles.length === 0) {
      console.log('\n✅ Source bucket is empty - no files to migrate');
      console.log('Storage migration is complete (nothing to migrate)');
      return;
    }

    // Proceed with migration
    const result = await this.migrateStorageWithCorrectBuckets(sourceBucketName, targetBucketName);
    
    if (result.success) {
      console.log('\n🎉 Storage migration completed successfully!');
      if (result.filesCount > 0) {
        console.log(`✅ ${result.successCount}/${result.filesCount} files migrated`);
      }
    } else {
      console.log('\n❌ Storage migration failed');
      console.log(`Error: ${result.error}`);
    }
  }
}

// Run fixer if called directly
if (require.main === module) {
  const fixer = new StorageFixer();
  fixer.run().catch(console.error);
}

module.exports = StorageFixer;
