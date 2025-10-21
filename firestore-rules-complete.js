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
    
    // Check if user is authenticated (Firebase Auth)
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // ============================================
    // USERS COLLECTION
    // ============================================
    match /users/{userId} {
      // Anyone can read user profiles
      allow read: if true;
      
      // Anyone can create a user profile (signup)
      allow create: if true;
      
      // Users can update their own profile OR admins can update any
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      
      // Only admins can delete users
      allow delete: if isAdmin();
    }
    
    // ============================================
    // GROUPS COLLECTION
    // ============================================
    match /groups/{groupId} {
      // Anyone can read groups
      allow read: if true;
      
      // Anyone can create a group
      allow create: if true;
      
      // Anyone can update groups (permissive for localStorage users)
      allow update: if true;
      
      // Only admins can delete groups
      allow delete: if isAdmin();
      
      // Subcollection: swipes (for matching system)
      match /swipes/{swipeId} {
        allow read, write: if true;
      }
      
      // Subcollection: likes (for matching system)
      match /likes/{likeId} {
        allow read, write: if true;
      }
    }
    
    // ============================================
    // MATCHES COLLECTION
    // ============================================
    match /matches/{matchId} {
      // Anyone can read matches
      allow read: if true;
      
      // Anyone can create a match
      allow create: if true;
      
      // Anyone can update matches
      allow update: if true;
      
      // Only admins can delete matches
      allow delete: if isAdmin();
      
      // Subcollection: messages (for chat)
      match /messages/{messageId} {
        // Anyone can read messages
        allow read: if true;
        
        // Anyone can create messages
        allow create: if true;
        
        // No updates to messages (immutable)
        allow update: if false;
        
        // Only admins can delete messages
        allow delete: if isAdmin();
      }
    }
    
    // ============================================
    // MESSAGES COLLECTION (standalone - if used)
    // ============================================
    match /messages/{messageId} {
      // Anyone can read messages
      allow read: if true;
      
      // Anyone can create messages
      allow create: if true;
      
      // No updates to messages (immutable)
      allow update: if false;
      
      // Only admins can delete messages
      allow delete: if isAdmin();
    }
    
    // ============================================
    // INVITATIONS COLLECTION
    // ============================================
    match /invitations/{invitationId} {
      // Anyone can read invitations
      allow read: if true;
      
      // Anyone can create invitations
      allow create: if true;
      
      // Anyone can update invitations (accept/reject)
      allow update: if true;
      
      // Anyone can delete invitations
      allow delete: if true;
    }
    
    // ============================================
    // VOTES COLLECTION (for democracy mode)
    // ============================================
    match /votes/{voteId} {
      // Anyone can read votes
      allow read: if true;
      
      // Anyone can create a vote
      allow create: if true;
      
      // No updates or deletes to votes (immutable)
      allow update, delete: if false;
    }
    
    // ============================================
    // REPORTS COLLECTION
    // ============================================
    match /reports/{reportId} {
      // Anyone can read reports
      allow read: if true;
      
      // Anyone can create a report
      allow create: if true;
      
      // Only admins can update/delete reports
      allow update, delete: if isAdmin();
    }
    
    // ============================================
    // NEIGHBORHOODS COLLECTION (Admin Only)
    // ============================================
    match /neighborhoods/{neighborhoodId} {
      // Anyone can read neighborhoods
      allow read: if true;
      
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // ============================================
    // VIBES COLLECTION (Admin Only)
    // ============================================
    match /vibes/{vibeId} {
      // Anyone can read vibes
      allow read: if true;
      
      // Only admins can write
      allow write: if isAdmin();
    }
    
    // ============================================
    // VENUES COLLECTION (Admin Only)
    // ============================================
    match /venues/{venueId} {
      // Anyone can read venues
      allow read: if true;
      
      // Only admins can write
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
