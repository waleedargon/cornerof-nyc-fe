'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { PhoneNumberInput } from '@/components/ui/phone-number-input';
import type { E164Number } from 'libphonenumber-js/core';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Logo } from '@/components/logo';

const FormSchema = z.object({
  phone: z.string()
    .min(1, 'Phone number is required.')
    .refine((phone) => {
      // Phone should be in E164 format: +15551234567 (12 digits total)
      return phone.startsWith('+1') && phone.length === 12 && /^\+1\d{10}$/.test(phone);
    }, {
      message: 'Please enter a valid US phone number.',
    }),
});

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      phone: "",
    },
  });

  const handleSignIn = async (data: z.infer<typeof FormSchema>) => {
    const phoneNumber = data.phone as E164Number;
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', phoneNumber));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: 'Error', description: 'Phone number not found. Please sign up.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Just redirect to the OTP page, which will handle sending the code
      router.push(`/verify-otp?phone=${phoneNumber}`);

    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background relative">
      <div className="absolute top-6 left-6">
        <Button asChild variant="ghost" size="icon">
          <Link href="/">
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
      </div>
      
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="xxl" />
        </div>
        
        <Card className="py-6">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl font-bold font-headline text-primary">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSignIn)} className="space-y-4">
                <PhoneNumberInput name="phone" control={form.control} label="Phone Number" />
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
