rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    // Check if user is an admin (has custom claim)
    function isAdmin() {
      return request.auth != null && request.auth.token.isAdmin == true;
    }
    
    // ============================================
    // USER COLLECTIONS (Full Access)
    // ============================================
    match /users/{userId} {
      allow read, create, update: if true;
      allow delete: if isAdmin();
    }
    
    match /groups/{groupId} {
      allow read, create, update: if true;
      allow delete: if isAdmin();
      
      // Subcollections for matching system
      match /swipes/{swipeId} {
        allow read, write: if true;
      }
      match /likes/{likeId} {
        allow read, write: if true;
      }
    }
    
    match /matches/{matchId} {
      allow read, create, update: if true;
      allow delete: if isAdmin();
      
      // Chat messages
      match /messages/{messageId} {
        allow read, create: if true;
        allow update: if false; // Immutable
        allow delete: if isAdmin();
      }
    }
    
    match /invitations/{invitationId} {
      allow read, write: if true;
    }
    
    match /votes/{voteId} {
      allow read, create: if true;
      allow update, delete: if false; // Immutable
    }
    
    match /reports/{reportId} {
      allow read, create: if true;
      allow update, delete: if isAdmin();
    }
    
    // ============================================
    // ADMIN COLLECTIONS (Read-Only for Users)
    // ============================================
    match /neighborhoods/{neighborhoodId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /vibes/{vibeId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    match /venues/{venueId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // ============================================
    // DEFAULT: DENY ALL OTHER ACCESS
    // ============================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
