'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { joinGroup } from '@/lib/actions';
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import type { E164Number } from 'libphonenumber-js/core';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Logo } from '@/components/logo';
import { internationalPhoneSchema } from '@/lib/phone-validation';

const FormSchema = z.object({
  phone: internationalPhoneSchema,
});

export function JoinCheckForm() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      phone: "",
    },
  });

  const handleCheckUser = async (data: z.infer<typeof FormSchema>) => {
    const inviteCode = searchParams.get('code');
    const phoneNumber = data.phone as E164Number;
    
    if (!inviteCode) {
        toast({ title: 'Error', description: 'Invalid invite link. No code provided.', variant: 'destructive' });
        router.push('/home');
        return;
    }
    setLoading(true);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // User does not exist, redirect to sign up
        router.push(`/signup?code=${inviteCode}&phone=${phoneNumber}`);
      } else {
        // User exists, log them in and join the group
        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;

        localStorage.setItem('userPhone', phoneNumber);
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', userDoc.data().name);

        toast({ title: 'Welcome back!', description: 'Joining group...' });

        const result = await joinGroup(inviteCode, userId);
        if (result.success) {
            toast({ title: 'Joined Group!', description: result.message });
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
        router.push('/home');
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive' });
      setLoading(false);
    }
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
            <CardTitle className="text-3xl font-bold font-headline text-primary">Verify Your Number</CardTitle>
            <p className="text-muted-foreground mt-2">
              Enter your phone number to see if you have an account, or to create a new one.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCheckUser)} className="space-y-4">
                <InternationalPhoneInput name="phone" control={form.control} label="Phone Number" defaultCountry="US" />
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
