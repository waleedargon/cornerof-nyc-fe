import { storage, auth } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadOptions {
  maxSize?: number; // in bytes, default 5MB
  allowedTypes?: string[]; // MIME types, default: images
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
};

/**
 * Validates file before upload
 */
export function validateFile(file: File, options: UploadOptions = DEFAULT_OPTIONS): string | null {
  const { maxSize, allowedTypes } = { ...DEFAULT_OPTIONS, ...options };

  if (file.size > maxSize!) {
    return `File size must be less than ${Math.round(maxSize! / 1024 / 1024)}MB`;
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return `File type not allowed. Supported types: ${allowedTypes?.join(', ')}`;
  }

  return null;
}

/**
 * Checks if user is authenticated
 * Supports both Firebase Auth (admin) and localStorage (regular users)
 */
function checkAuthentication(): void {
  // Check Firebase Auth first (for admin users)
  if (auth.currentUser) {
    return; // Admin is authenticated via Firebase Auth ✅
  }
  
  // Check localStorage for regular users
  if (typeof window !== 'undefined') {
    const userId = localStorage.getItem('userId');
    if (userId) {
      return; // Regular user is authenticated via localStorage ✅
    }
  }
  
  // If neither authentication method found, throw error
  throw new Error('You must be signed in to upload files.');
}

/**
 * Uploads a file to Firebase Storage
 */
export async function uploadFile(
  file: File,
  path: string,
  options: UploadOptions = DEFAULT_OPTIONS
): Promise<UploadResult> {
  // Check authentication
  checkAuthentication();
  
  // Validate file
  const validationError = validateFile(file, options);
  if (validationError) {
    throw new Error(validationError);
  }

  // Generate unique filename
  const fileExtension = file.name.split('.').pop() || '';
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const fullPath = `${path}/${uniqueFileName}`;

  // Create storage reference
  const storageRef = ref(storage, fullPath);

  try {
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      path: fullPath
    };
  } catch (error) {
    console.error('Upload error:', error);
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('storage/unauthorized')) {
        throw new Error('You do not have permission to upload this file. Please make sure you are signed in.');
      }
    }
    throw new Error('Failed to upload file. Please try again.');
  }
}

/**
 * Deletes a file from Firebase Storage
 */
export async function deleteFile(path: string): Promise<void> {
  if (!path) return;

  // Check authentication
  checkAuthentication();

  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Delete error:', error);
    // Don't throw error for delete operations to avoid blocking UI
    // but log if it's an authentication issue
    if (error instanceof Error && error.message.includes('storage/unauthorized')) {
      console.warn('Unauthorized to delete file. User may need to sign in again.');
    }
  }
}

/**
 * Uploads user avatar
 */
export async function uploadUserAvatar(file: File, userId: string): Promise<UploadResult> {
  return uploadFile(file, `avatars/${userId}`, {
    maxSize: 5 * 1024 * 1024, // 5MB for avatars
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  });
}

/**
 * Uploads group image
 */
export async function uploadGroupImage(file: File, groupId: string): Promise<UploadResult> {
  return uploadFile(file, `groups/${groupId}`, {
    maxSize: 5 * 1024 * 1024, // 5MB for group images
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  });
}

/**
 * Uploads venue image
 */
export async function uploadVenueImage(file: File, venueId: string): Promise<UploadResult> {
  return uploadFile(file, `venues/${venueId}`, {
    maxSize: 5 * 1024 * 1024, // 5MB for venue images
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  });
}

/**
 * Creates a file input change handler
 */
export function createFileInputHandler(
  onFileSelect: (file: File) => void,
  onError: (error: string) => void,
  options: UploadOptions = DEFAULT_OPTIONS
) {
  return (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file, options);
    if (validationError) {
      onError(validationError);
      return;
    }

    onFileSelect(file);
  };
}

/**
 * Converts file to base64 for preview
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
