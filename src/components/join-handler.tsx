
'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function JoinHandler({ inviteCode }: { inviteCode: string | null }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!inviteCode) {
      // If no code, maybe go home or to an error page.
      router.push('/home');
      return;
    }

    if (authLoading) {
      // Wait until we know if a user is logged in or not.
      return;
    }

    // If no user is logged in, redirect them to the phone check page.
    // The check page will handle both signup and signin flows.
    router.push(`/join/check?code=${inviteCode}`);

  }, [inviteCode, user, authLoading, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <p className="mt-4 text-muted-foreground">
            Verifying your invitation...
        </p>
      </div>
    </div>
  );
}
