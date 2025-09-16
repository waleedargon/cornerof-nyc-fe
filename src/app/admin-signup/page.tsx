'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';

export default function AdminSignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleAdminSignUp = async () => {
    if (!email || !password) {
        toast({ title: 'Error', description: 'Please enter email and password.', variant: 'destructive' });
        return;
    }
    setLoading(true);
    // This is a placeholder for actual admin sign-up logic
    setTimeout(() => {
        console.log('Admin signup with:', email, password);
        toast({ title: 'Success', description: 'Admin account created (mock).' });
        router.push('/admin');
        setLoading(false);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background relative">
      {/* Back button */}
      <div className="absolute top-6 left-6">
        <Button asChild variant="ghost" size="icon">
          <Link href="/">
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
      </div>
      
      {/* Centered content */}
      <div className="w-full max-w-md">
        {/* Logo above form */}
        <div className="flex justify-center mb-8">
          <Logo size="xxl" />
        </div>
        
        <Card className="py-6">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold font-headline text-primary">Admin Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button onClick={handleAdminSignUp} disabled={loading} className="w-full" size="lg">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Admin Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
