// src/pages/api/admin-auth.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth } from '@/lib/firebase-admin';

// Add the new admin UID to this list
const ADMIN_UIDS = ['SoMmscT7CDhJzhrG5JU1ZdXQlw92', 'Ea9w2a9a92IV0p313b5a7s6BFr73'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check if the admin SDK is initialized before using it
  if (!adminAuth) {
    console.error("Admin auth is not initialized. Check your FIREBASE_SERVICE_ACCOUNT_KEY.");
    return res.status(500).json({ error: 'Internal server error: Admin SDK not initialized.' });
  }

  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'ID token is required.' });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    if (ADMIN_UIDS.includes(uid)) {
      const customToken = await adminAuth.createCustomToken(uid, { isAdmin: true });
      return res.status(200).json({ customToken });
    } else {
      return res.status(403).json({ error: 'Forbidden: User is not an admin.' });
    }
  } catch (error) {
    console.error('Error in admin-auth:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
