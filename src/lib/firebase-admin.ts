
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

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON environment variable not found!");
      console.error("📋 To fix this in Firebase App Hosting:");
      console.error("1. Go to your Google Cloud project's Secret Manager");
      console.error("2. Create a secret named 'firebase-service-account' with your service account JSON");
      console.error("3. Ensure your App Hosting backend has access to this secret");
      console.error("4. Redeploy your application");
      return;
    }

    // Parse JSON
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.error("❌ Failed to parse service account JSON:");
      console.error("📋 Make sure FIREBASE_SERVICE_ACCOUNT_JSON is a valid JSON string");
      console.error("Error details:", parseError);
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
