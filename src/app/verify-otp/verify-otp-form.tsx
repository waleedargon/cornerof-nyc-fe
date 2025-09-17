'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChevronLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase';
import { joinGroup } from '@/lib/actions';

// Add a global declaration for window.recaptchaVerifier if it doesn't exist
// This prevents TypeScript errors when accessing a dynamically added property
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
  }
}

export function VerifyOTPForm() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Get user data from URL params (signup only)
  const phone = searchParams.get('phone');
  const name = searchParams.get('name');
  const age = searchParams.get('age');
  const sex = searchParams.get('sex');
  const inviteCode = searchParams.get('code');

  // Set up reCAPTCHA verifier
  useEffect(() => {
    if (isClient) {
      if (!window.recaptchaVerifier) {
        // Ensure the container is empty before rendering new reCAPTCHA
        const recaptchaContainer = document.getElementById('recaptcha-container');
        if (recaptchaContainer) {
          recaptchaContainer.innerHTML = '';
        }

        // Create and render reCAPTCHA verifier
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': (response: any) => {
            console.log('reCAPTCHA verified', response);
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
            // Reset reCAPTCHA if it expires
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.render().then((widgetId) => {
                window.recaptchaVerifier.reset(widgetId);
              });
            }
          }
        });

        window.recaptchaVerifier.render().catch(error => {
          console.error('reCAPTCHA render error:', error);
          toast({ title: 'Error', description: 'Could not initialize reCAPTCHA. Please refresh the page.', variant: 'destructive' });
        });
      } else {
        // If verifier exists, ensure it's rendered
        window.recaptchaVerifier.render().catch(err => console.error("Recaptcha already rendered or error on re-render", err));
      }
    }
  }, [isClient, toast]);

  // Function to send OTP
  const handleSendOTP = useCallback(async (isResend = false) => {
    if (!phone) {
      toast({ title: 'Error', description: 'Phone number is missing.', variant: 'destructive' });
      return;
    }
    
    if (isResend) {
      setResendLoading(true);
    } else {
      setLoading(true); // Show loading state on initial send
    }

    try {
      const verifier = window.recaptchaVerifier;
      if (!verifier) {
        throw new Error('RecaptchaVerifier not initialized.');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
      window.confirmationResult = confirmationResult; // Store for later use

      toast({
        title: 'OTP Sent!',
        description: 'A new verification code has been sent to your phone.',
      });

      setCountdown(30);
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
      console.error('Error sending OTP:', error);
      toast({ title: 'Error', description: 'Failed to send OTP. Please try again.', variant: 'destructive' });
      // Attempt to reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render().then(widgetId => {
          window.recaptchaVerifier.reset(widgetId);
        }).catch(resetError => {
            console.error("Error resetting reCAPTCHA after failed OTP send:", resetError);
        });
      }
    } finally {
      if (isResend) {
        setResendLoading(false);
      } else {
        setLoading(false); // Hide loading state after initial send
      }
    }
  }, [phone, toast]);

  // Send OTP on initial component load
  useEffect(() => {
    setIsClient(true); // Indicate that the component has mounted
  }, []);

  useEffect(() => {
    // Only run this when isClient is true and phone is available
    if (isClient && phone) {
      handleSendOTP(false); // Initial OTP send
    }
  }, [isClient, phone, handleSendOTP]);


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
      if (!window.confirmationResult) {
        throw new Error('OTP not sent or session expired. Please resend OTP.');
      }

      const result = await window.confirmationResult.confirm(otp);
      const user = result.user;

      if (user) {
        // Create user account in Firestore
        const usersRef = collection(db, 'users');
        const docRef = await addDoc(usersRef, {
          uid: user.uid, // Store Firebase Auth UID
          phone: phone,
          name: name,
          age: parseInt(age),
          sex: sex as 'male' | 'female' | 'other',
          createdAt: new Date().toISOString(),
          avatarUrl: '',
        });

        // Store essential user info in localStorage
        localStorage.setItem('userPhone', phone);
        localStorage.setItem('userId', docRef.id); // Firestore doc ID
        localStorage.setItem('userName', name);
        localStorage.setItem('userUID', user.uid); // Firebase Auth UID

        toast({
          title: 'Account Created!',
          description: "Welcome to the app!",
        });

        // If there's an invite code, join the group
        if (inviteCode) {
          try {
            const joinResult = await joinGroup(inviteCode, docRef.id);
            if (joinResult.success) {
              toast({ title: 'Joined Group!', description: joinResult.message });
            } else {
              toast({ title: 'Warning', description: joinResult.message, variant: 'destructive' });
            }
          } catch (error) {
            console.error('Error joining group:', error);
            toast({ title: 'Warning', description: 'Account created but failed to join group.', variant: 'destructive' });
          }
        }

        router.push('/home'); // Redirect to a protected route
      } else {
        throw new Error('Could not verify user.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({ title: 'Error', description: 'Invalid OTP or an error occurred. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleResendOTP = () => {
    if (countdown > 0) return;
    handleSendOTP(true);
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
  
  // Return null on the server to ensure client-side rendering only
  if (!isClient) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-background relative">
      <div id="recaptcha-container"></div>

      <div className="absolute top-6 left-6">
        <Button asChild variant="ghost" size="icon">
          <Link href="/signup">
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
                type="tel" // Use type='tel' for numeric keyboard on mobile
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
