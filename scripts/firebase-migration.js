#!/usr/bin/env node

/**
 * Firebase Migration Script
 * Migrates data from one Firebase project to another
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc',
  serviceAccountPath: './source-firebase-service-account.json'
};

const TARGET_PROJECT_CONFIG = {
  projectId: 'cornerof-nyc-a5faf',
  serviceAccountPath: './destination-firebase-service-account.json'
};

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'users',
  'groups', 
  'matches',
  'invitations',
  'messages',
  'reports',
  'venues',
  'votes'
];

class FirebaseMigration {
  constructor() {
    this.sourceApp = null;
    this.targetApp = null;
    this.migrationLog = [];
  }

  async initialize() {
    try {
      console.log('🔥 Initializing Firebase Migration...');
      
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

      console.log('✅ Firebase apps initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase apps:', error);
      return false;
    }
  }

  async migrateFirestoreData() {
    console.log('\n📊 Starting Firestore data migration...');
    
    const sourceDb = admin.firestore(this.sourceApp);
    const targetDb = admin.firestore(this.targetApp);

    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      try {
        console.log(`\n🔄 Migrating collection: ${collectionName}`);
        
        // Get all documents from source collection
        const sourceCollection = sourceDb.collection(collectionName);
        const snapshot = await sourceCollection.get();
        
        if (snapshot.empty) {
          console.log(`⚠️  Collection ${collectionName} is empty`);
          continue;
        }

        console.log(`📄 Found ${snapshot.size} documents in ${collectionName}`);
        
        // Migrate documents in batches
        const batch = targetDb.batch();
        let batchCount = 0;
        
        for (const doc of snapshot.docs) {
          const targetDocRef = targetDb.collection(collectionName).doc(doc.id);
          const docData = doc.data();
          
          // Handle Firestore references and timestamps
          const cleanedData = this.cleanFirestoreData(docData, collectionName);
          
          batch.set(targetDocRef, cleanedData);
          batchCount++;
          
          // Commit batch every 500 documents (Firestore limit is 500)
          if (batchCount === 500) {
            await batch.commit();
            console.log(`✅ Committed batch of ${batchCount} documents`);
            batchCount = 0;
          }
        }
        
        // Commit remaining documents
        if (batchCount > 0) {
          await batch.commit();
          console.log(`✅ Committed final batch of ${batchCount} documents`);
        }
        
        console.log(`✅ Successfully migrated collection: ${collectionName}`);
        this.migrationLog.push({
          collection: collectionName,
          documentsCount: snapshot.size,
          status: 'success'
        });
        
      } catch (error) {
        console.error(`❌ Failed to migrate collection ${collectionName}:`, error);
        this.migrationLog.push({
          collection: collectionName,
          status: 'failed',
          error: error.message
        });
      }
    }
  }

  cleanFirestoreData(data, collectionName) {
    // Handle DocumentReferences - convert to new project references
    const cleaned = JSON.parse(JSON.stringify(data, (key, value) => {
      // Handle Firestore Timestamps
      if (value && typeof value === 'object' && value._seconds !== undefined) {
        return admin.firestore.Timestamp.fromMillis(value._seconds * 1000 + Math.floor(value._nanoseconds / 1000000));
      }
      
      // Handle DocumentReferences
      if (value && typeof value === 'object' && value._path !== undefined) {
        // Convert old project reference to new project reference
        const pathParts = value._path.segments;
        return admin.firestore(this.targetApp).doc(pathParts.join('/'));
      }
      
      return value;
    }));
    
    return cleaned;
  }

  async migrateAuthentication() {
    console.log('\n🔐 Starting Authentication migration...');
    
    const sourceAuth = admin.auth(this.sourceApp);
    const targetAuth = admin.auth(this.targetApp);
    
    try {
      // Get all users from source
      let nextPageToken;
      let userCount = 0;
      
      do {
        const listUsersResult = await sourceAuth.listUsers(1000, nextPageToken);
        
        for (const userRecord of listUsersResult.users) {
          try {
            // Create user in target project
            const userToCreate = {
              uid: userRecord.uid,
              email: userRecord.email,
              emailVerified: userRecord.emailVerified,
              phoneNumber: userRecord.phoneNumber,
              displayName: userRecord.displayName,
              photoURL: userRecord.photoURL,
              disabled: userRecord.disabled,
              metadata: {
                creationTime: userRecord.metadata.creationTime,
                lastSignInTime: userRecord.metadata.lastSignInTime
              }
            };

            // Remove undefined fields
            Object.keys(userToCreate).forEach(key => {
              if (userToCreate[key] === undefined) {
                delete userToCreate[key];
              }
            });

            await targetAuth.createUser(userToCreate);
            userCount++;
            
            if (userCount % 100 === 0) {
              console.log(`✅ Migrated ${userCount} users...`);
            }
            
          } catch (error) {
            console.error(`❌ Failed to migrate user ${userRecord.uid}:`, error.message);
          }
        }
        
        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);
      
      console.log(`✅ Successfully migrated ${userCount} users`);
      
    } catch (error) {
      console.error('❌ Failed to migrate authentication:', error);
    }
  }

  async migrateStorage() {
    console.log('\n📁 Starting Storage migration...');
    
    const sourceBucket = admin.storage(this.sourceApp).bucket();
    const targetBucket = admin.storage(this.targetApp).bucket();
    
    try {
      const [files] = await sourceBucket.getFiles();
      console.log(`📄 Found ${files.length} files to migrate`);
      
      for (const file of files) {
        try {
          // Download file from source
          const [fileBuffer] = await file.download();
          
          // Upload to target bucket
          const targetFile = targetBucket.file(file.name);
          await targetFile.save(fileBuffer, {
            metadata: file.metadata
          });
          
          console.log(`✅ Migrated file: ${file.name}`);
          
        } catch (error) {
          console.error(`❌ Failed to migrate file ${file.name}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to migrate storage:', error);
    }
  }

  async generateMigrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      sourceProject: SOURCE_PROJECT_CONFIG.projectId,
      targetProject: TARGET_PROJECT_CONFIG.projectId,
      collections: this.migrationLog,
      summary: {
        totalCollections: COLLECTIONS_TO_MIGRATE.length,
        successfulMigrations: this.migrationLog.filter(log => log.status === 'success').length,
        failedMigrations: this.migrationLog.filter(log => log.status === 'failed').length
      }
    };
    
    const reportPath = path.join(__dirname, `migration-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📋 Migration report saved to: ${reportPath}`);
    console.log('\n🎉 Migration Summary:');
    console.log(`   ✅ Successful: ${report.summary.successfulMigrations}`);
    console.log(`   ❌ Failed: ${report.summary.failedMigrations}`);
    
    return report;
  }

  async run() {
    console.log('🚀 Starting Firebase Migration Process...\n');
    
    const initialized = await this.initialize();
    if (!initialized) {
      console.error('❌ Migration aborted due to initialization failure');
      return;
    }
    
    // Run migrations
    await this.migrateFirestoreData();
    await this.migrateAuthentication();
    await this.migrateStorage();
    
    // Generate report
    await this.generateMigrationReport();
    
    console.log('\n🎉 Migration process completed!');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new FirebaseMigration();
  migration.run().catch(console.error);
}

module.exports = FirebaseMigration;
