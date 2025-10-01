'use client';

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Users, User, Tent, LayoutDashboard, LogOut, Menu, MapPin, Tag, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAdmin, loading, user, error } = useAdminAuth();
  const { toast } = useToast();

  useEffect(() => {
    
    // Prevent redirect loops - don't redirect if already on admin-signin
    if (pathname === '/admin-signin') {
      return;
    }
    
    // Don't redirect immediately - give time for auth to settle
    const redirectTimer = setTimeout(() => {
      // Only redirect if we're absolutely sure there's no user
      if (!loading && !user) {
        console.log('No user found after delay, redirecting to admin sign-in');
        router.push('/admin-signin');
      } 
      // Only redirect for access denied if we have a clear error and user is not admin
      else if (!loading && user && !isAdmin && error && error.includes('Access denied')) {
        console.log('Access denied, redirecting to home');
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
          variant: 'destructive'
        });
        router.push('/');
      }
      // If user exists but admin status is still being verified, don't redirect
      else if (!loading && user && !isAdmin && !error) {
        console.log('User exists, admin status being verified... staying on admin page');
        // Don't redirect - let the verification complete
      }
    }, 2000); // Increased delay to 2 seconds

    return () => clearTimeout(redirectTimer);
  }, [isAdmin, loading, user, error, router, toast, pathname]);

  const handleSignOut = async () => {
    try {
      console.log('🚪 Admin logout button clicked - signing out...');
      await signOut(auth);
      // Clear admin status cache
      localStorage.removeItem('adminStatus');
      console.log('✅ Admin signed out successfully, redirecting to home...');
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error if there's an auth error
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/admin-signin')}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Redirect if not admin (this will be handled by useEffect, but adding as fallback)
  if (!isAdmin) {
    return null;
  }

  const navLinks = (
    <>
      <Link
        href="/admin"
        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
      >
        <LayoutDashboard className="h-5 w-5" />
        Dashboard
      </Link>
      <Link
        href="/admin/groups"
        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
      >
        <Users className="h-5 w-5" />
        Groups
      </Link>
      <Link
        href="/admin/users"
        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
      >
        <User className="h-5 w-5" />
        Users
      </Link>
      <Link
        href="/admin/venues"
        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
      >
        <Tent className="h-5 w-5" />
        Venues
      </Link>
      <Link
        href="/admin/neighborhoods"
        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
      >
        <MapPin className="h-5 w-5" />
        Neighborhoods
      </Link>
      <Link
        href="/admin/vibes"
        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
      >
        <Tag className="h-5 w-5" />
        Vibes
      </Link>
      <Link
        href="/admin/logs"
        className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
      >
        <FileText className="h-5 w-5" />
        Activity Logs
      </Link>
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link href="/admin" className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
            <LayoutDashboard className="h-5 w-5" />
            <span className="sr-only">Dashboard</span>
          </Link>
          <Link href="/admin/groups" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
            <Users className="h-5 w-5" />
            <span className="sr-only">Groups</span>
          </Link>
          <Link href="/admin/users" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
            <User className="h-5 w-5" />
            <span className="sr-only">Users</span>
          </Link>
          <Link href="/admin/venues" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
            <Tent className="h-5 w-5" />
            <span className="sr-only">Venues</span>
          </Link>
          <Link href="/admin/neighborhoods" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
            <MapPin className="h-5 w-5" />
            <span className="sr-only">Neighborhoods</span>
          </Link>
          <Link href="/admin/vibes" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
            <Tag className="h-5 w-5" />
            <span className="sr-only">Vibes</span>
          </Link>
          <Link href="/admin/logs" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
            <FileText className="h-5 w-5" />
            <span className="sr-only">Activity Logs</span>
          </Link>
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="sr-only">Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium mt-4">
                {navLinks}
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="text-lg sm:text-xl font-semibold font-headline text-primary">Admin Dashboard</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign Out">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}