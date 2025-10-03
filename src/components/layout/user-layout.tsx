'use client';

import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface UserLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function UserLayout({ children, className }: UserLayoutProps) {
  const pathname = usePathname();

  // Don't apply user layout styling to admin pages, auth pages, onboarding, or public pages
  const excludePaths = [
    '/', // Root/landing page
    '/admin',
    '/admin-signin',
    '/signin',
    '/signup',
    '/verify-otp',
    '/join',
  ];

  const isExcluded = excludePaths.some(path => {
    if (path === '/') {
      return pathname === '/'; // Exact match for root
    }
    return pathname.startsWith(path);
  });


  if (isExcluded) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main content area with bottom padding to account for bottom nav */}
      <main className={cn(
        'pb-16', // Add bottom padding for bottom nav on all devices
        className
      )}>
        {children}
      </main>
      
      {/* Bottom Navigation - shows on all devices */}
      <BottomNavigation />
    </div>
  );
}
