
import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth | null = null;
let adminDb: admin.firestore.Firestore | null = null;

try {
  if (!admin.apps.length) {
    const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

    if (serviceAccountBase64) {
      const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin SDK initialized successfully from Base64 env var.");
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_BASE64 env var not found. Admin features will be disabled.");
    }
  }

  if (admin.apps.length > 0) {
    adminAuth = admin.auth();
    adminDb = admin.firestore();
  }
} catch (error) {
  console.error("Firebase Admin SDK initialization failed:", error);
}

export { adminAuth, adminDb };
