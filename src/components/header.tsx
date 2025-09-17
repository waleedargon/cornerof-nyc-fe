'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, LogOut, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

type HeaderProps = {
  title?: string;
  backHref?: string;
  showSignOut?: boolean;
  showLogo?: boolean;
  centerLogo?: boolean;
};

export function Header({ title, backHref, showSignOut = false, showLogo = true, centerLogo = false }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = () => {
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    router.push('/');
  };
  
  if (centerLogo) {
    return (
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex h-16 items-center px-4 max-w-7xl mx-auto">
          {/* Left side - Back button or spacer */}
          <div className="flex items-center justify-start w-20 sm:w-24">
            {backHref ? (
              <Button asChild variant="ghost" size="icon">
                <Link href={backHref}>
                  <ChevronLeft className="h-6 w-6" />
                  <span className="sr-only">Back</span>
                </Link>
              </Button>
            ) : (
              <div className="w-10"></div>
            )}
          </div>

          {/* Center - Logo (truly centered) */}
          <div className="flex-1 flex justify-center">
            <Link href="/home">
              <Logo size="sm" className="mb-0" />
            </Link>
          </div>

          {/* Right side - Profile and Sign Out (fixed width to match left) */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 w-20 sm:w-24">
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
