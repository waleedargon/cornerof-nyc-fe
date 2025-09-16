'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, LogOut, User } from 'lucide-react';
import { signOut } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

type HeaderProps = {
  title?: string;
  backHref?: string;
  showSignOut?: boolean;
  showLogo?: boolean;
  centerLogo?: boolean;
};

export function Header({ title, backHref, showSignOut = false, showLogo = true, centerLogo = false }: HeaderProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The useAuth hook will handle clearing localStorage and redirecting
      toast({ title: 'Signed Out', description: 'You have been successfully signed out.' });
      router.push('/'); // Redirect to home page after sign out
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: 'Error', description: 'Failed to sign out. Please try again.', variant: 'destructive' });
    }
  };
  
  if (centerLogo) {
    return (
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-4 max-w-7xl mx-auto">
          {/* Left side - Back button or spacer */}
          <div className="flex items-center">
            {backHref ? (
              <Button asChild variant="ghost" size="icon">
                <Link href={backHref}>
                  <ChevronLeft className="h-6 w-6" />
                  <span className="sr-only">Back</span>
                </Link>
              </Button>
            ) : (
              <div className="w-10"></div> // Spacer to balance the right side
            )}
          </div>

          {/* Center - Logo */}
          <div className="flex-1 flex justify-center">
            <Link href="/home">
              <Logo size="sm" className="mb-0" />
            </Link>
          </div>

          {/* Right side - Profile and Sign Out */}
          <div className="flex items-center gap-1 sm:gap-2">
            {showSignOut && (
              <>
                <Button asChild variant="ghost" size="icon" aria-label="Profile">
                  <Link href="/profile/create">
                    <User className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign Out">
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Default header layout
  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-4 max-w-7xl mx-auto">
        {/* Left side - Back button or Logo */}
        <div className="flex items-center">
          {backHref ? (
            <Button asChild variant="ghost" size="icon" className="mr-2">
              <Link href={backHref}>
                <ChevronLeft className="h-6 w-6" />
                <span className="sr-only">Back</span>
              </Link>
            </Button>
          ) : showLogo ? (
            <Link href="/home" className="mr-4">
              <Logo size="sm" className="mb-0" />
            </Link>
          ) : null}
        </div>

        {/* Center - Title (hidden on small screens if logo is present) */}
        <div className="flex-1 flex justify-center">
          {title && (
            <h1 className={`font-semibold font-headline text-primary ${
              showLogo ? 'hidden sm:block text-lg' : 'text-lg'
            }`}>
              {title}
            </h1>
          )}
        </div>

        {/* Right side - Profile and Sign Out */}
        <div className="flex items-center gap-1 sm:gap-2">
          {showSignOut && (
            <>
              <Button asChild variant="ghost" size="icon" aria-label="Profile">
                <Link href="/profile/create">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign Out">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
