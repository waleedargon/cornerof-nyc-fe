'use client';

import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();

  // Redirect to profile create page
  router.push('/profile/create');

  return null;
}
