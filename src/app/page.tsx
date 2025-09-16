
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to home page
    if (!loading && user) {
      router.push('/home');
    }
  }, [user, loading, router]);

  // Show loading during initial hydration and auth check
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user exists after loading, show loading while redirecting
  if (user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md text-center">
        {/* Logo above content */}
        <div className="flex justify-center mb-8">
          <Logo size="xxl" />
        </div>

        <p className="text-3xl font-bold font-headline text-primary mb-4">Plans Start Here.</p>
        
        <p className="text-md sm:text-lg text-muted-foreground mb-5">
          Connect your crew with other groups for spontaneous meetups.
        </p>

        <div className="space-y-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/signup">Get On The List</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/signin">Sign In</Link>
          </Button>
        </div>

        <div className="mt-8">
          <Button asChild variant="link" className="text-muted-foreground">
            <Link href="/admin-signup">Admin Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
