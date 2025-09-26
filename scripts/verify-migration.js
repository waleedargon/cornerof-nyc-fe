#!/usr/bin/env node

/**
 * Migration Verification Script
 * Verifies that data was migrated correctly between Firebase projects
 */

const admin = require('firebase-admin');
const path = require('path');

// Configuration - Update these with your project details
const SOURCE_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc',
  serviceAccountPath: './source-firebase-service-account.json'
};

const TARGET_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc-a5faf',
  serviceAccountPath: './destination-firebase-service-account.json'
};

const COLLECTIONS_TO_VERIFY = [
  'users',
  'groups', 
  'matches',
  'invitations',
  'messages',
  'reports',
  'venues',
  'votes'
];

class MigrationVerifier {
  constructor() {
    this.sourceApp = null;
    this.targetApp = null;
    this.verificationResults = [];
  }

  async initialize() {
    try {
      console.log('🔍 Initializing Migration Verification...');
      
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

      console.log('✅ Verification apps initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize verification apps:', error);
      return false;
    }
  }

  async verifyFirestoreData() {
    console.log('\n📊 Verifying Firestore data migration...');
    
    const sourceDb = admin.firestore(this.sourceApp);
    const targetDb = admin.firestore(this.targetApp);

    for (const collectionName of COLLECTIONS_TO_VERIFY) {
      try {
        console.log(`\n🔍 Verifying collection: ${collectionName}`);
        
        // Get document counts from both projects
        const sourceSnapshot = await sourceDb.collection(collectionName).get();
        const targetSnapshot = await targetDb.collection(collectionName).get();
        
        const sourceCount = sourceSnapshot.size;
        const targetCount = targetSnapshot.size;
        
        console.log(`📄 Source: ${sourceCount} documents`);
        console.log(`📄 Target: ${targetCount} documents`);
        
        const result = {
          collection: collectionName,
          sourceCount,
          targetCount,
          status: sourceCount === targetCount ? 'MATCH' : 'MISMATCH',
          issues: []
        };

        if (sourceCount !== targetCount) {
          result.issues.push(`Document count mismatch: ${sourceCount} vs ${targetCount}`);
        }

        // Sample document verification (check first 5 documents)
        if (sourceCount > 0 && targetCount > 0) {
          const sampleSize = Math.min(5, sourceCount);
          const sourceDocIds = sourceSnapshot.docs.slice(0, sampleSize).map(doc => doc.id);
          
          for (const docId of sourceDocIds) {
            const sourceDoc = await sourceDb.collection(collectionName).doc(docId).get();
            const targetDoc = await targetDb.collection(collectionName).doc(docId).get();
            
            if (!targetDoc.exists) {
              result.issues.push(`Document ${docId} missing in target`);
              result.status = 'MISMATCH';
            } else {
              // Basic field comparison (excluding timestamps and references)
              const sourceData = this.normalizeDocumentData(sourceDoc.data());
              const targetData = this.normalizeDocumentData(targetDoc.data());
              
              const sourceKeys = Object.keys(sourceData).sort();
              const targetKeys = Object.keys(targetData).sort();
              
              if (JSON.stringify(sourceKeys) !== JSON.stringify(targetKeys)) {
                result.issues.push(`Document ${docId} has different fields`);
                result.status = 'MISMATCH';
              }
            }
          }
        }

        if (result.status === 'MATCH') {
          console.log(`✅ Collection ${collectionName}: VERIFIED`);
        } else {
          console.log(`❌ Collection ${collectionName}: ISSUES FOUND`);
          result.issues.forEach(issue => console.log(`   - ${issue}`));
        }

        this.verificationResults.push(result);
        
      } catch (error) {
        console.error(`❌ Failed to verify collection ${collectionName}:`, error);
        this.verificationResults.push({
          collection: collectionName,
          status: 'ERROR',
          error: error.message
        });
      }
    }
  }

  normalizeDocumentData(data) {
    if (!data) return {};
    
    // Remove timestamps and references for basic comparison
    const normalized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object') {
        // Skip Firestore timestamps and references
        if (value._seconds !== undefined || value._path !== undefined) {
          continue;
        }
      }
      normalized[key] = value;
    }
    
    return normalized;
  }

  async verifyAuthentication() {
    console.log('\n🔐 Verifying Authentication migration...');
    
    try {
      const sourceAuth = admin.auth(this.sourceApp);
      const targetAuth = admin.auth(this.targetApp);
      
      // Get user counts
      const sourceUsers = await sourceAuth.listUsers(1000);
      const targetUsers = await targetAuth.listUsers(1000);
      
      console.log(`👥 Source users: ${sourceUsers.users.length}`);
      console.log(`👥 Target users: ${targetUsers.users.length}`);
      
      const authResult = {
        sourceUserCount: sourceUsers.users.length,
        targetUserCount: targetUsers.users.length,
        status: sourceUsers.users.length === targetUsers.users.length ? 'MATCH' : 'MISMATCH',
        issues: []
      };

      if (sourceUsers.users.length !== targetUsers.users.length) {
        authResult.issues.push(`User count mismatch: ${sourceUsers.users.length} vs ${targetUsers.users.length}`);
      }

      // Verify sample users exist
      const sampleUsers = sourceUsers.users.slice(0, 5);
      for (const sourceUser of sampleUsers) {
        try {
          const targetUser = await targetAuth.getUser(sourceUser.uid);
          if (sourceUser.email !== targetUser.email || sourceUser.phoneNumber !== targetUser.phoneNumber) {
            authResult.issues.push(`User ${sourceUser.uid} data mismatch`);
            authResult.status = 'MISMATCH';
          }
        } catch (error) {
          authResult.issues.push(`User ${sourceUser.uid} missing in target`);
          authResult.status = 'MISMATCH';
        }
      }

      if (authResult.status === 'MATCH') {
        console.log('✅ Authentication: VERIFIED');
      } else {
        console.log('❌ Authentication: ISSUES FOUND');
        authResult.issues.forEach(issue => console.log(`   - ${issue}`));
      }

      this.verificationResults.push({
        service: 'Authentication',
        ...authResult
      });

    } catch (error) {
      console.error('❌ Failed to verify authentication:', error);
      this.verificationResults.push({
        service: 'Authentication',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async verifyStorage() {
    console.log('\n📁 Verifying Storage migration...');
    
    try {
      const sourceBucket = admin.storage(this.sourceApp).bucket();
      const targetBucket = admin.storage(this.targetApp).bucket();
      
      const [sourceFiles] = await sourceBucket.getFiles();
      const [targetFiles] = await targetBucket.getFiles();
      
      console.log(`📄 Source files: ${sourceFiles.length}`);
      console.log(`📄 Target files: ${targetFiles.length}`);
      
      const storageResult = {
        sourceFileCount: sourceFiles.length,
        targetFileCount: targetFiles.length,
        status: sourceFiles.length === targetFiles.length ? 'MATCH' : 'MISMATCH',
        issues: []
      };

      if (sourceFiles.length !== targetFiles.length) {
        storageResult.issues.push(`File count mismatch: ${sourceFiles.length} vs ${targetFiles.length}`);
      }

      // Verify sample files exist
      const sampleFiles = sourceFiles.slice(0, 5);
      const targetFileNames = targetFiles.map(f => f.name);
      
      for (const sourceFile of sampleFiles) {
        if (!targetFileNames.includes(sourceFile.name)) {
          storageResult.issues.push(`File ${sourceFile.name} missing in target`);
          storageResult.status = 'MISMATCH';
        }
      }

      if (storageResult.status === 'MATCH') {
        console.log('✅ Storage: VERIFIED');
      } else {
        console.log('❌ Storage: ISSUES FOUND');
        storageResult.issues.forEach(issue => console.log(`   - ${issue}`));
      }

      this.verificationResults.push({
        service: 'Storage',
        ...storageResult
      });

    } catch (error) {
      console.error('❌ Failed to verify storage:', error);
      this.verificationResults.push({
        service: 'Storage',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async generateVerificationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      sourceProject: SOURCE_PROJECT_CONFIG.projectId,
      targetProject: TARGET_PROJECT_CONFIG.projectId,
      results: this.verificationResults,
      summary: {
        totalChecks: this.verificationResults.length,
        passed: this.verificationResults.filter(r => r.status === 'MATCH').length,
        failed: this.verificationResults.filter(r => r.status === 'MISMATCH').length,
        errors: this.verificationResults.filter(r => r.status === 'ERROR').length
      }
    };
    
    const reportPath = path.join(__dirname, `verification-report-${Date.now()}.json`);
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📋 Verification report saved to: ${reportPath}`);
    console.log('\n🎯 Verification Summary:');
    console.log(`   ✅ Passed: ${report.summary.passed}`);
    console.log(`   ❌ Failed: ${report.summary.failed}`);
    console.log(`   🚨 Errors: ${report.summary.errors}`);
    
    const overallStatus = report.summary.failed === 0 && report.summary.errors === 0 ? 'SUCCESS' : 'ISSUES_FOUND';
    console.log(`\n🏆 Overall Status: ${overallStatus}`);
    
    if (overallStatus === 'SUCCESS') {
      console.log('🎉 Migration verification completed successfully!');
      console.log('✅ Your data has been migrated correctly.');
    } else {
      console.log('⚠️  Issues found during verification.');
      console.log('📋 Please review the detailed report above.');
    }
    
    return report;
  }

  async run() {
    console.log('🔍 Starting Migration Verification Process...\n');
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Verification aborted due to initialization failure');
      return;
    }
    
    // Run verifications
    await this.verifyFirestoreData();
    await this.verifyAuthentication();
    await this.verifyStorage();
    
    // Generate report
    await this.generateVerificationReport();
  }
}

// Run verification if called directly
if (require.main === module) {
  const verifier = new MigrationVerifier();
  verifier.run().catch(console.error);
}

module.exports = MigrationVerifier;
