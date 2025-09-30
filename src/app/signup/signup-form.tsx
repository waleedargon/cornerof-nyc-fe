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
import { InternationalPhoneInput } from '@/components/ui/international-phone-input';
import { internationalPhoneSchema } from '@/lib/phone-validation';
import { Logo } from '@/components/logo';
import { calculateAge, getMaxBirthDate, getMinBirthDate } from '@/lib/date-utils';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase';

// Global declarations for Firebase phone auth
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
  }
}

const profileSchema = z.object({
  phone: internationalPhoneSchema,
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
  sex: z.enum(['male', 'female', 'prefer-not-to-say'], {
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
  const [isClient, setIsClient] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: '',
      name: '',
      dateOfBirth: '',
    },
  });

  useEffect(() => {
    setIsClient(true);
    const code = searchParams?.get('code');
    const phone = searchParams?.get('phone');

    if (code) {
      setInviteCode(code);
    }
    if (phone) {
      form.setValue('phone', phone);
    }
  }, [searchParams, form]);

  // Initialize reCAPTCHA for phone authentication
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      // Only initialize if not already present
      if (!window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
            'size': 'invisible',
            'callback': (response: any) => {
              console.log('reCAPTCHA verified for signup', response);
            },
            'expired-callback': () => {
              console.log('reCAPTCHA expired');
            }
          });
        } catch (error) {
          console.error('Error initializing reCAPTCHA:', error);
        }
      }
    }
  }, [isClient]);

  // Function to execute reCAPTCHA Enterprise
  const executeRecaptcha = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).grecaptcha?.enterprise) {
        (window as any).grecaptcha.enterprise.ready(async () => {
          try {
            const token = await (window as any).grecaptcha.enterprise.execute('6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n', {
              action: 'PHONE_SIGNUP'
            });
            resolve(token);
          } catch (error) {
            console.error('reCAPTCHA execution failed:', error);
            resolve(null);
          }
        });
      } else {
        console.log('reCAPTCHA Enterprise not loaded, using Firebase fallback');
        resolve(null);
      }
    });
  };

  // Function to verify reCAPTCHA token on server
  const verifyRecaptchaToken = async (token: string, action: string = 'PHONE_SIGNUP'): Promise<boolean> => {
    try {
      // Try Enterprise API first
      let response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          expectedAction: action,
          siteKey: '6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n'
        }),
      });

      let result = await response.json();
      
      if (response.ok && result.success && result.valid) {
        console.log('reCAPTCHA Enterprise verification successful:', result);
        return true;
      }

      // If Enterprise API fails, try Firebase-based verification
      console.log('Enterprise API failed, trying Firebase-based verification:', result);
      
      response = await fetch('/api/verify-recaptcha-firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          expectedAction: action
        }),
      });

      result = await response.json();
      
      if (!response.ok) {
        console.error('Both reCAPTCHA verifications failed:', result);
        return false;
      }

      console.log('Firebase reCAPTCHA verification successful:', result);
      return result.success && result.valid;
    } catch (error) {
      console.error('Error verifying reCAPTCHA token:', error);
      return false;
    }
  };

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

      // Execute reCAPTCHA Enterprise and verify immediately
      // Note: reCAPTCHA tokens can only be used once, so we generate and verify in one step
      const recaptchaToken = await executeRecaptcha();
      
      if (recaptchaToken) {
        const isRecaptchaValid = await verifyRecaptchaToken(recaptchaToken, 'PHONE_SIGNUP');
        if (!isRecaptchaValid) {
          toast({
            title: 'Security Verification Failed',
            description: 'Please try again. If the problem persists, contact support.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        console.log('reCAPTCHA verification passed');
      }
      
      // Try to send OTP via Firebase Phone Auth
      try {
        if (window.recaptchaVerifier) {
          console.log('Attempting to send OTP to:', fullPhoneNumber);
          const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
          
          // Store confirmation result globally for verification
          window.confirmationResult = confirmationResult;
          
          toast({
            title: 'OTP Sent!',
            description: 'Please check your phone for the verification code.',
          });
        } else {
          throw new Error('reCAPTCHA not initialized');
        }
      } catch (otpError) {
        console.error('OTP sending failed:', otpError);
        
        // Fallback to development mode
        toast({
          title: 'Phone authentication not configured.',
          description: 'Using development mode - enter 123456 or 000000 as OTP.',
          variant: 'destructive',
        });
      }

      // Redirect to OTP verification with user data
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
      {/* reCAPTCHA container for phone authentication */}
      <div id="recaptcha-container-signup"></div>
      
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
                <InternationalPhoneInput name="phone" control={form.control} label="Phone Number" defaultCountry="US" />

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
                          className="text-left"
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
                              <RadioGroupItem value="prefer-not-to-say" />
                            </FormControl>
                            <FormLabel className="font-normal">Prefer not to say</FormLabel>
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
