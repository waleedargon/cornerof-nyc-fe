import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

// Admin UIDs whitelist (legacy fallback). Prefer custom claims (isAdmin=true).
const ADMIN_UIDS = ['846uEyRPtnXrgRyLY8GlGFpwFrL2'];

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    // Get admin auth instance
    const adminAuth = await getAdminAuth();
    if (!adminAuth) {
      console.error('Admin auth not initialized. Check FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.');
      return NextResponse.json({ error: 'Admin SDK not initialized' }, { status: 500 });
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is an admin via custom claims or fallback UID whitelist
    const userRecord = await adminAuth.getUser(uid);
    const hasAdminClaim = userRecord.customClaims?.isAdmin === true;
    if (!hasAdminClaim && !ADMIN_UIDS.includes(uid)) {
      return NextResponse.json({ error: 'Access denied. User is not an admin.' }, { status: 403 });
    }

    // Ensure custom claim is set for future checks (idempotent)
    if (!hasAdminClaim) {
      await adminAuth.setCustomUserClaims(uid, { ...(userRecord.customClaims || {}), isAdmin: true });
    }

    return NextResponse.json({ 
      success: true, 
      uid: uid,
      isAdmin: true 
    });

  } catch (error: any) {
    console.error('Admin auth verification error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired. Please sign in again.' }, { status: 401 });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json({ error: 'Invalid token. Please sign in again.' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
