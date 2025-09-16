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
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from '@/lib/firebase';
import { joinGroup } from '@/lib/actions';

export function VerifyOTPForm() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const phone = searchParams.get('phone');
  const name = searchParams.get('name');
  const age = searchParams.get('age');
  const sex = searchParams.get('sex');
  const inviteCode = searchParams.get('code');
  const isSignUp = name && age && sex;

  // Initialize reCAPTCHA and send OTP
  useEffect(() => {
    if (!phone) {
      router.push(isSignUp ? '/signup' : '/signin');
      return;
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': () => { /* reCAPTCHA solved */ }
    });

    setRecaptchaVerifier(verifier);

    const sendOtp = async () => {
      try {
        const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
        setConfirmationResult(confirmation);
        toast({ title: 'OTP Sent!', description: 'Please check your phone for the code.' });
        startCountdown();
      } catch (error) {
        console.error('Error sending OTP:', error);
        toast({ title: 'Error', description: 'Could not send OTP. Please try again.', variant: 'destructive' });
      }
    };

    sendOtp();

    return () => {
      verifier.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]); // Only run once when the phone number is available

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6 || !confirmationResult) {
      toast({ title: 'Error', description: 'Please enter a valid 6-digit OTP.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;

      let userId = user.uid;
      let userName = name;
      let userAvatar = '';

      if (isSignUp) {
        const usersRef = collection(db, 'users');
        const docRef = await addDoc(usersRef, {
          phone: phone,
          name: name,
          age: parseInt(age!),
          sex: sex as 'male' | 'female' | 'other',
          createdAt: new Date().toISOString(),
          avatarUrl: '',
          firebaseUid: user.uid,
        });
        userId = docRef.id;
      } else {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('phone', '==', phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          userId = userDoc.id;
          userName = userDoc.data().name;
          userAvatar = userDoc.data().avatarUrl;
        }
      }
      
      localStorage.setItem('userPhone', phone!);
      localStorage.setItem('userId', userId);
      localStorage.setItem('userName', userName!);
      localStorage.setItem('userAvatar', userAvatar);
      localStorage.setItem('firebaseUid', user.uid);

      toast({ title: 'Success!', description: isSignUp ? 'Account created successfully!' : 'Signed in successfully!' });

      if (inviteCode) {
        await joinGroup(inviteCode, userId);
        toast({ title: 'Joined Group!', description: `You have successfully joined a group.` });
      }

      router.push('/home');

    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({ title: 'Error', description: 'Invalid OTP or an error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0 || !recaptchaVerifier || !phone) return;

    setResendLoading(true);
    try {
      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      setConfirmationResult(confirmation);
      toast({ title: 'OTP Resent!', description: 'A new code has been sent.' });
      startCountdown();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resend OTP. Please try again.', variant: 'destructive' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background relative">
      <div id="recaptcha-container"></div>
      <div className="absolute top-6 left-6">
        <Button asChild variant="ghost" size="icon">
          <Link href={isSignUp ? `/signup?${searchParams.toString()}` : '/signin'}>
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
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
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
              {isSignUp ? 'Verify & Create Account' : 'Verify & Sign In'}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
