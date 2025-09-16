
'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, User, Tent, LayoutDashboard, Home, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSignOut = () => {
    router.push('/');
  };

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
    </>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            href="/"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Home className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">CORNER OF Home</span>
          </Link>
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
                <Link
                  href="/"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <Home className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">CORNER OF Home</span>
                </Link>
                {navLinks}
              </nav>
            </SheetContent>
          </Sheet>
           <h1 className="text-lg sm:text-xl font-semibold font-headline text-primary">Admin Dashboard</h1>
           <div className="ml-auto">
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
