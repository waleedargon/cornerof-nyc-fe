'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2, ChevronLeft } from 'lucide-react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { E164Number } from 'libphonenumber-js/core';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { joinGroup } from '@/lib/actions';
import { PhoneNumberInput } from '@/components/ui/phone-number-input';
import { Logo } from '@/components/logo';
import { calculateAge, getMaxBirthDate, getMinBirthDate } from '@/lib/date-utils';

const profileSchema = z.object({
  phone: z.string()
    .min(1, 'Phone number is required.')
    .refine((phone) => {
      // Phone should be in E164 format: +15551234567 (11 digits total)
      return phone.startsWith('+1') && phone.length === 12 && /^\+1\d{10}$/.test(phone);
    }, {
      message: 'Please enter a valid US phone number.',
    }),
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  dateOfBirth: z.string()
    .min(1, 'Date of birth is required.')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
      return finalAge >= 18;
    }, {
      message: 'You must be at least 18 years old.',
    }),
  sex: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select an option.',
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: '',
      name: '',
      dateOfBirth: '',
    },
  });

  useEffect(() => {
    const code = searchParams?.get('code');
    const phone = searchParams?.get('phone');

    if (code) {
      setInviteCode(code);
    }
    if (phone) {
      form.setValue('phone', phone);
    }
  }, [searchParams, form]);

  async function onSubmit(values: ProfileFormData) {
    setLoading(true);
    try {
      const fullPhoneNumber = values.phone as E164Number;

      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', fullPhoneNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({ title: 'Error', description: 'This phone number is already registered.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Instead of creating the user directly, redirect to OTP verification
      const params = new URLSearchParams({
        phone: fullPhoneNumber,
        name: values.name,
        dateOfBirth: values.dateOfBirth,
        sex: values.sex,
      });

      // Add invite code if present
      if (inviteCode) {
        params.append('code', inviteCode);
      }

      toast({
        title: 'OTP Sent!',
        description: 'Please check your phone for the verification code.',
      });

      router.push(`/verify-otp?${params.toString()}`);
    } catch (error) {
      console.error('Error during signup:', error);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

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
            <CardTitle className="text-3xl font-bold font-headline text-primary">Create Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <PhoneNumberInput name="phone" control={form.control} label="Phone Number" />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Alex Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          min={getMinBirthDate()}
                          max={getMaxBirthDate()}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel>Sex</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4 space-y-0"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="male" />
                            </FormControl>
                            <FormLabel className="font-normal">Male</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="female" />
                            </FormControl>
                            <FormLabel className="font-normal">Female</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="other" />
                            </FormControl>
                            <FormLabel className="font-normal">Other</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Complete Profile
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
