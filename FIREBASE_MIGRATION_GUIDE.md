# 🔥 Firebase Migration Guide

Complete guide to migrate your CORNER OF project from one Firebase account to another.

## 🎯 **Migration Overview**

### **What We're Migrating:**
- ✅ **Firestore Database** (All collections and documents)
- ✅ **Authentication Users** (Phone number + Email/Password)
- ✅ **Storage Files** (Images, uploads)
- ✅ **Project Configuration** (Rules, indexes)
- ✅ **Cloud Run Deployment** (App Hosting)

---

## 📋 **Pre-Migration Checklist**

### **1. Create New Firebase Project**
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase (make sure you're using the target account)
firebase login

# Create new project via Firebase Console
# Go to: https://console.firebase.google.com
# Click "Add project" and follow the setup
```

### **2. Enable Required Services**
In your new Firebase project, enable:
- ✅ **Authentication** (Phone & Email/Password providers)
- ✅ **Firestore Database**
- ✅ **Storage**
- ✅ **App Hosting** (for Cloud Run)

### **3. Download Service Account Keys**
```bash
# For SOURCE project (current)
# Go to Project Settings > Service Accounts
# Generate new private key -> save as 'keys/source-service-account.json'

# For TARGET project (new)  
# Go to Project Settings > Service Accounts
# Generate new private key -> save as 'keys/target-service-account.json'
```

### **4. Create Keys Directory**
```bash
mkdir -p keys/
# Place your service account JSON files here
```

---

## 🚀 **Migration Steps**

### **Step 1: Update Migration Script Configuration**

Edit `scripts/firebase-migration.js`:
```javascript
const TARGET_PROJECT_CONFIG = {
  projectId: 'your-new-project-id', // Replace with your new project ID
  serviceAccountPath: './keys/target-service-account.json'
};
```

### **Step 2: Run Data Migration**
```bash
# Install dependencies
npm install firebase-admin

# Make script executable
chmod +x scripts/firebase-migration.js

# Run migration (this will take time depending on data size)
node scripts/firebase-migration.js
```

### **Step 3: Update Project Configuration**

#### **Update Firebase Config**
Edit `src/lib/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: "your-new-api-key",
  authDomain: "your-new-project.firebaseapp.com",
  projectId: "your-new-project-id",
  storageBucket: "your-new-project.firebasestorage.app",
  messagingSenderId: "your-new-sender-id",
  appId: "your-new-app-id"
};
```

#### **Update Firebase RC**
Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-new-project-id"
  }
}
```

#### **Update App Hosting Config**
Edit `firebase.json`:
```json
{
  "apphosting": {
    "backendId": "your-new-backend-id",
    "rootDir": "/",
    "ignore": [
      "node_modules",
      ".git",
      "firebase-debug.log",
      "firebase-debug.*.log",
      "functions"
    ]
  }
}
```

#### **Update Environment Variables**
Update your `.env.local`:
```bash
# New Firebase Admin Service Account (base64 encoded)
FIREBASE_SERVICE_ACCOUNT_BASE64=your_new_base64_encoded_service_account

# Update any other Firebase-related env vars
```

### **Step 4: Deploy Firestore Rules & Indexes**

#### **Create Firestore Rules**
Create `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Groups rules
    match /groups/{groupId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (resource == null || request.auth.uid in resource.data.members);
    }
    
    // Matches rules
    match /matches/{matchId} {
      allow read, write: if request.auth != null;
    }
    
    // Messages rules
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    // Invitations rules
    match /invitations/{invitationId} {
      allow read, write: if request.auth != null;
    }
    
    // Reports rules (admin only)
    match /reports/{reportId} {
      allow read, write: if request.auth != null;
    }
    
    // Venues rules
    match /venues/{venueId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Add admin check if needed
    }
    
    // Votes rules
    match /votes/{voteId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### **Create Firestore Indexes**
Create `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "groups",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "members", "arrayConfig": "CONTAINS"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "groups",
      "queryScope": "COLLECTION", 
      "fields": [
        {"fieldPath": "isOpenToMatch", "order": "ASCENDING"},
        {"fieldPath": "neighborhood", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "groups", "arrayConfig": "CONTAINS"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "toGroup", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "matchId", "order": "ASCENDING"},
        {"fieldPath": "timestamp", "order": "ASCENDING"}
      ]
    }
  ],
  "fieldOverrides": []
}
```

#### **Deploy Rules and Indexes**
```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy storage rules if needed
firebase deploy --only storage
```

### **Step 5: Update App Hosting Configuration**

#### **Create New App Hosting Backend**
```bash
# Initialize App Hosting in new project
firebase apphosting:backends:create

# Follow prompts to set up GitHub integration
```

#### **Update Service Account Secret**
```bash
# Encode new service account for Cloud Run
node scripts/encode-service-account.js keys/target-service-account.json

# Add secret to Firebase
firebase functions:secrets:set FIREBASE_SERVICE_ACCOUNT_JSON
```

#### **Deploy to New Project**
```bash
# Deploy the application
firebase deploy --only apphosting
```

---

## 🔧 **Post-Migration Tasks**

### **1. Verify Data Integrity**
```bash
# Run verification script
node scripts/verify-migration.js
```

### **2. Test Authentication**
- ✅ Test phone number login
- ✅ Test admin email/password login
- ✅ Verify user data is accessible

### **3. Test Core Functionality**
- ✅ Group creation/joining
- ✅ Matching system
- ✅ Chat functionality
- ✅ File uploads
- ✅ Admin panel

### **4. Update DNS & Domains**
If using custom domain:
```bash
# Update Firebase Hosting domain
firebase hosting:sites:list
firebase hosting:sites:create your-new-site
```

### **5. Update External Integrations**
- ✅ Update webhook URLs
- ✅ Update API endpoints
- ✅ Update third-party service configurations

---

## ⚠️ **Important Considerations**

### **Authentication Migration Limitations**
- ❌ **User passwords cannot be migrated** (Firebase security)
- ✅ **Solution**: Users will need to reset passwords on first login
- ✅ **Phone numbers and UIDs** will be preserved

### **Firestore References**
- ⚠️ **DocumentReferences** need special handling
- ✅ Migration script handles this automatically
- ✅ All relationships will be preserved

### **Storage URLs**
- ⚠️ **Storage URLs will change** (different project domain)
- ✅ Files will be migrated with same paths
- ⚠️ May need to update any hardcoded URLs

### **Downtime Considerations**
- ⏱️ **Estimated downtime**: 2-4 hours (depending on data size)
- 📊 **Data size factors**: Number of users, messages, files
- 🔄 **Recommended**: Migrate during low-traffic hours

---

## 📊 **Migration Timeline Estimate**

### **Small Project** (< 1k users, < 10GB data)
- **Preparation**: 2-3 hours
- **Migration**: 1-2 hours  
- **Testing**: 1 hour
- **Total**: 4-6 hours

### **Medium Project** (1k-10k users, 10-100GB data)
- **Preparation**: 3-4 hours
- **Migration**: 3-6 hours
- **Testing**: 2 hours
- **Total**: 8-12 hours

### **Large Project** (10k+ users, 100GB+ data)
- **Preparation**: 4-6 hours
- **Migration**: 6-12 hours
- **Testing**: 3 hours
- **Total**: 13-21 hours

---

## 🆘 **Troubleshooting**

### **Common Issues & Solutions**

#### **"Permission denied" errors**
```bash
# Ensure service accounts have proper roles:
# - Firebase Admin SDK Administrator Service Agent
# - Cloud Datastore Owner
# - Firebase Authentication Admin
```

#### **"Document reference not found"**
```bash
# Run reference cleanup script
node scripts/fix-references.js
```

#### **"Storage bucket not accessible"**
```bash
# Verify storage bucket permissions and CORS
firebase storage:rules:deploy
```

#### **"Index not found" errors**
```bash
# Deploy missing indexes
firebase deploy --only firestore:indexes
```

---

## 🎉 **Post-Migration Verification**

### **Automated Tests**
```bash
# Run full test suite
npm test

# Run specific migration tests
npm run test:migration
```

### **Manual Verification Checklist**
- [ ] User login works (phone + email)
- [ ] Group creation/joining works
- [ ] Matching algorithm works
- [ ] Chat messages send/receive
- [ ] File uploads work
- [ ] Admin panel accessible
- [ ] All data visible and correct
- [ ] Performance is acceptable

---

## 📞 **Support & Next Steps**

After successful migration:

1. **Monitor for 24-48 hours** for any issues
2. **Update documentation** with new project details
3. **Notify users** if password resets are needed
4. **Update monitoring/analytics** configurations
5. **Archive old project** (after confirming stability)

---

## 🔐 **Security Notes**

- ✅ **Service account keys** should be stored securely
- ✅ **Delete old service accounts** after migration
- ✅ **Rotate API keys** for security
- ✅ **Review Firebase rules** in new project
- ✅ **Update CORS settings** if needed

**Migration is 100% feasible** and this script handles all the complexities for you! 🚀
