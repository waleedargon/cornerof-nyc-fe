#!/usr/bin/env node

/**
 * Storage Migration Workaround Script
 * Uses a different approach to migrate storage files between Firebase projects
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const https = require('https');

const SOURCE_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc',
  serviceAccountPath: './source-firebase-service-account.json'
};

const TARGET_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc-a5faf',
  serviceAccountPath: './destination-firebase-service-account.json'
};

class StorageMigrationWorkaround {
  constructor() {
    this.sourceApp = null;
    this.targetApp = null;
  }

  async initialize() {
    try {
      console.log('🔧 Initializing Storage Migration Workaround...');
      
      // Initialize source Firebase app
      const sourceServiceAccount = require(path.resolve(SOURCE_PROJECT_CONFIG.serviceAccountPath));
      this.sourceApp = admin.initializeApp({
        credential: admin.credential.cert(sourceServiceAccount),
        projectId: SOURCE_PROJECT_CONFIG.projectId,
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

  async downloadAndUploadFile(sourceFile, targetBucket) {
    try {
      // Get download URL from source
      const [downloadUrl] = await sourceFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      });

      // Download file content via HTTP
      const fileBuffer = await this.downloadFileFromUrl(downloadUrl);
      
      // Create target file
      const targetFile = targetBucket.file(sourceFile.name);
      
      // Upload to target bucket
      await targetFile.save(fileBuffer, {
        metadata: {
          contentType: sourceFile.metadata.contentType || 'application/octet-stream',
          cacheControl: sourceFile.metadata.cacheControl || 'public, max-age=31536000',
        },
        resumable: false
      });

      return true;
    } catch (error) {
      console.error(`❌ Failed to migrate ${sourceFile.name}:`, error.message);
      return false;
    }
  }

  downloadFileFromUrl(url) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        response.on('error', reject);
      }).on('error', reject);
    });
  }

  async migrateStorageWithWorkaround() {
    console.log('\n📁 Starting Storage migration with workaround...');
    
    try {
      const sourceBucket = admin.storage(this.sourceApp).bucket();
      const targetBucket = admin.storage(this.targetApp).bucket();
      
      // Get all files from source bucket
      const [files] = await sourceBucket.getFiles();
      console.log(`📄 Found ${files.length} files to migrate`);
      
      if (files.length === 0) {
        console.log('✅ No files to migrate (source bucket is empty)');
        return { success: true, filesCount: 0 };
      }

      // Filter out system files (like Firestore exports)
      const userFiles = files.filter(file => {
        const name = file.name;
        return !name.includes('export_metadata') && 
               !name.includes('all_namespaces') &&
               (name.startsWith('avatars/') || name.startsWith('groups/'));
      });

      console.log(`📄 Found ${userFiles.length} user files to migrate (excluding system files)`);

      if (userFiles.length === 0) {
        console.log('✅ No user files to migrate');
        return { success: true, filesCount: 0 };
      }

      let successCount = 0;
      let failCount = 0;
      
      for (const file of userFiles) {
        console.log(`🔄 Migrating: ${file.name}`);
        
        const success = await this.downloadAndUploadFile(file, targetBucket);
        if (success) {
          successCount++;
          console.log(`✅ Migrated: ${file.name}`);
        } else {
          failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n📊 Storage Migration Results:`);
      console.log(`   User files found: ${userFiles.length}`);
      console.log(`   ✅ Successfully migrated: ${successCount}`);
      console.log(`   ❌ Failed: ${failCount}`);
      
      return { 
        success: true, 
        filesCount: userFiles.length, 
        successCount, 
        failCount,
        skippedSystemFiles: files.length - userFiles.length
      };
      
    } catch (error) {
      console.error('❌ Failed to migrate storage:', error.message);
      return { success: false, error: error.message };
    }
  }

  async generateStorageReport() {
    console.log('\n📋 Storage Migration Report');
    console.log('===========================');
    
    try {
      const sourceBucket = admin.storage(this.sourceApp).bucket();
      const targetBucket = admin.storage(this.targetApp).bucket();
      
      const [sourceFiles] = await sourceBucket.getFiles();
      const [targetFiles] = await targetBucket.getFiles();
      
      const sourceUserFiles = sourceFiles.filter(file => {
        const name = file.name;
        return name.startsWith('avatars/') || name.startsWith('groups/');
      });
      
      const targetUserFiles = targetFiles.filter(file => {
        const name = file.name;
        return name.startsWith('avatars/') || name.startsWith('groups/');
      });
      
      console.log(`📤 Source bucket: ${sourceUserFiles.length} user files`);
      console.log(`📥 Target bucket: ${targetUserFiles.length} user files`);
      
      if (sourceUserFiles.length === targetUserFiles.length) {
        console.log('✅ File counts match - migration appears successful');
      } else {
        console.log('⚠️  File counts don\'t match - some files may not have migrated');
      }
      
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
    }
  }

  async run() {
    console.log('🔧 Starting Storage Migration Workaround...\n');
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Workaround aborted due to initialization failure');
      return;
    }
    
    // Migrate storage with workaround
    const result = await this.migrateStorageWithWorkaround();
    
    if (result.success) {
      console.log('\n🎉 Storage migration workaround completed!');
      if (result.filesCount > 0) {
        console.log(`✅ ${result.successCount}/${result.filesCount} user files migrated`);
        if (result.skippedSystemFiles > 0) {
          console.log(`ℹ️  ${result.skippedSystemFiles} system files skipped (Firestore exports)`);
        }
      }
      
      // Generate final report
      await this.generateStorageReport();
      
    } else {
      console.log('\n❌ Storage migration workaround failed');
      console.log(`Error: ${result.error}`);
    }
  }
}

// Run workaround if called directly
if (require.main === module) {
  const workaround = new StorageMigrationWorkaround();
  workaround.run().catch(console.error);
}

module.exports = StorageMigrationWorkaround;
