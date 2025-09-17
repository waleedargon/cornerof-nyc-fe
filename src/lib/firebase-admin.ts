
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

    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (!serviceAccountBase64) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable not found!");
      console.error("📋 To fix this in Firebase App Hosting:");
      console.error("1. Go to Firebase Console → App Hosting → Your App → Settings");
      console.error("2. Add environment variable: FIREBASE_SERVICE_ACCOUNT_BASE64");
      console.error("3. Set value to base64 encoded service account JSON");
      console.error("4. Redeploy your application");
      return;
    }

    // Decode base64 and parse JSON
    let serviceAccount;
    try {
      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.error("❌ Failed to decode/parse service account JSON:");
      console.error("📋 Make sure FIREBASE_SERVICE_ACCOUNT_BASE64 is properly base64 encoded");
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
