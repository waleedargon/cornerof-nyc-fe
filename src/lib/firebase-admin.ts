
// Use dynamic import to avoid module loading issues
let admin: any = null;
let adminAuth: any = null;
let adminDb: any = null;

// Initialize Firebase Admin SDK
async function initializeFirebaseAdmin() {
  try {
    // Lazy load Firebase Admin SDK
    if (!admin) {
      admin = await import('firebase-admin');
      // Handle both named and default exports
      admin = admin.default || admin;
    }

    // Check if already initialized
    if (admin.apps && admin.apps.length > 0) {
      console.log("🔥 Firebase Admin SDK already initialized");
      adminAuth = admin.auth();
      adminDb = admin.firestore();
      return;
    }

    // Try multiple methods to get service account credentials
    let serviceAccount;
    
    // Method 1: Try Secret Manager (for production deployment)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    // Method 2: Try base64 encoded env var (for local development)
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    
    if (serviceAccountJson) {
      // Production: Using Secret Manager
      console.log("🔧 Using Firebase Secret Manager for service account");
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
        
        // Fix private key formatting - replace escaped newlines with actual newlines
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
      } catch (parseError) {
        console.error("❌ Failed to parse service account JSON from Secret Manager:");
        console.error("Error details:", parseError);
        return;
      }
    } else if (serviceAccountBase64) {
      // Local development: Using base64 encoded env var
      console.log("🔧 Using base64 environment variable for service account");
      try {
        const serviceAccountJsonDecoded = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(serviceAccountJsonDecoded);
        
        // Fix private key formatting - replace escaped newlines with actual newlines
        if (serviceAccount.private_key) {
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
      } catch (parseError) {
        console.error("❌ Failed to decode/parse service account JSON from base64:");
        console.error("📋 Make sure FIREBASE_SERVICE_ACCOUNT_BASE64 is properly base64 encoded");
        console.error("Error details:", parseError);
        return;
      }
    } else {
      console.error("❌ No Firebase service account credentials found!");
      console.error("📋 For local development:");
      console.error("   - Set FIREBASE_SERVICE_ACCOUNT_BASE64 in your .env.local file");
      console.error("   - Use the base64 encoded service account JSON");
      console.error("📋 For production deployment:");
      console.error("   - Service account should be available via Firebase Secret Manager");
      console.error("   - Secret name: 'firebase-service-account'");
      return;
    }

    // Validate required fields
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account: missing required fields');
    }

    // Initialize Firebase Admin
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    // Initialize services
    adminAuth = admin.auth(app);
    adminDb = admin.firestore(app);
    
    console.log("🔥 Firebase Admin SDK initialized successfully!");
    console.log(`Project ID: ${serviceAccount.project_id}`);
    console.log(`Service Account: ${serviceAccount.client_email}`);
    console.log("✅ Firebase Admin Auth and Firestore initialized");

  } catch (error: any) {
    console.error("💥 Firebase Admin SDK initialization failed:", error);
    adminAuth = null;
    adminDb = null;
  }
}

// Initialize on module load
initializeFirebaseAdmin();

// Helper functions to safely get admin services
export async function getAdminAuth(): Promise<any> {
  if (!adminAuth) {
    await initializeFirebaseAdmin(); // Try to initialize again
  }
  return adminAuth;
}

export async function getAdminDb(): Promise<any> {
  if (!adminDb) {
    await initializeFirebaseAdmin(); // Try to initialize again
  }
  return adminDb;
}

export { adminAuth, adminDb };
