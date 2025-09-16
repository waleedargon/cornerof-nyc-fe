'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { joinGroup } from '@/lib/actions';

export function VerifyOTPForm() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get user data from URL params (signup only)
  const phone = searchParams.get('phone');
  const name = searchParams.get('name');
  const age = searchParams.get('age');
  const sex = searchParams.get('sex');
  const inviteCode = searchParams.get('code');

  useEffect(() => {
    if (!phone || !name || !age || !sex) {
      router.push('/signup');
      return;
    }

    // Start countdown for resend button
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phone, name, age, sex, router]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({ title: 'Error', description: 'Please enter a valid 6-digit OTP.', variant: 'destructive' });
      return;
    }

    if (!phone || !name || !age || !sex) {
      toast({ title: 'Error', description: 'Missing user data. Please start over.', variant: 'destructive' });
      router.push('/signup');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll just simulate OTP verification
      // In a real app, you'd verify the OTP with your backend/SMS service
      if (otp === '123456' || otp === '000000') { // Accept test OTPs
        // Create user account
        const usersRef = collection(db, 'users');
        const docRef = await addDoc(usersRef, {
          phone: phone,
          name: name,
          age: parseInt(age),
          sex: sex as 'male' | 'female' | 'other',
          createdAt: new Date().toISOString(),
          avatarUrl: '',
        });

        // Store user info in localStorage
        localStorage.setItem('userPhone', phone);
        localStorage.setItem('userId', docRef.id);
        localStorage.setItem('userName', name);

        toast({
          title: 'Account Created!',
          description: "Welcome to the app!",
        });

        // If there's an invite code, join the group
        if (inviteCode) {
          try {
            const result = await joinGroup(inviteCode, docRef.id);
            if (result.success) {
              toast({ title: 'Joined Group!', description: result.message });
            } else {
              toast({ title: 'Warning', description: result.message, variant: 'destructive' });
            }
          } catch (error) {
            console.error('Error joining group:', error);
            toast({ title: 'Warning', description: 'Account created but failed to join group.', variant: 'destructive' });
          }
        }

        router.push('/home');
      } else {
        toast({ title: 'Error', description: 'Invalid OTP. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({ title: 'Error', description: 'An error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setResendLoading(true);
    try {
      // Simulate resending OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'OTP Sent!',
        description: 'A new verification code has been sent to your phone.',
      });
      
      setCountdown(30);
      
      // Restart countdown
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resend OTP. Please try again.', variant: 'destructive' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerifyOTP();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background relative">
      {/* Back button */}
      <div className="absolute top-6 left-6">
        <Button asChild variant="ghost" size="icon">
          <Link href="/signup">
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
            <CardTitle className="text-3xl font-bold font-headline text-primary">Verify Your Phone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-muted-foreground">
              <p>We've sent a 6-digit code to</p>
              <p className="font-semibold text-foreground">{phone}</p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={handleOTPChange}
                onKeyPress={handleKeyPress}
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>

            <Button 
              onClick={handleVerifyOTP} 
              disabled={loading || otp.length !== 6} 
              className="w-full"
              size="lg"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Create Account
            </Button>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={handleResendOTP}
                disabled={countdown > 0 || resendLoading}
                className="text-sm"
              >
                {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </Button>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              <p>For testing, use: 123456 or 000000</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
