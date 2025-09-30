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
import { calculateAge } from '@/lib/date-utils';

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
  const phone = searchParams?.get('phone');
  const name = searchParams?.get('name');
  const dateOfBirth = searchParams?.get('dateOfBirth');
  const sex = searchParams?.get('sex');
  const inviteCode = searchParams?.get('code');

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
            // Clear and recreate reCAPTCHA if it expires
            try {
              if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = undefined;
                
                // Recreate after a short delay
                setTimeout(() => {
                  const recaptchaContainer = document.getElementById('recaptcha-container');
                  if (recaptchaContainer) {
                    recaptchaContainer.innerHTML = '';
                    
                    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                      'size': 'invisible',
                      'callback': (response: any) => {
                        console.log('reCAPTCHA verified', response);
                      }
                    });
                    
                    window.recaptchaVerifier.render().catch(err => 
                      console.error("Error re-rendering reCAPTCHA:", err)
                    );
                  }
                }, 100);
              }
            } catch (error) {
              console.error('Error handling reCAPTCHA expiration:', error);
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

  // Function to execute reCAPTCHA Enterprise
  const executeRecaptcha = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && (window as any).grecaptcha?.enterprise) {
        (window as any).grecaptcha.enterprise.ready(async () => {
          try {
            const token = await (window as any).grecaptcha.enterprise.execute('6LefSdkrAAAAAPP_F6DzKO_0PRWiuoWUCy8epd8n', {
              action: 'PHONE_RESEND'
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
  const verifyRecaptchaToken = async (token: string, action: string = 'PHONE_RESEND'): Promise<boolean> => {
    try {
      const response = await fetch('/api/verify-recaptcha', {
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

      const result = await response.json();
      
      if (!response.ok) {
        console.error('reCAPTCHA server verification failed:', result);
        return false;
      }

      console.log('reCAPTCHA verification successful:', result);
      return result.success && result.valid;
    } catch (error) {
      console.error('Error verifying reCAPTCHA token:', error);
      return false;
    }
  };

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
      // Execute reCAPTCHA Enterprise first
      const recaptchaToken = await executeRecaptcha();
      
      // Verify reCAPTCHA token on server if we got one
      if (recaptchaToken) {
        const isRecaptchaValid = await verifyRecaptchaToken(recaptchaToken, 'PHONE_RESEND');
        if (!isRecaptchaValid) {
          toast({
            title: 'Security Verification Failed',
            description: 'Please try again. If the problem persists, contact support.',
            variant: 'destructive',
          });
          if (isResend) setResendLoading(false);
          else setLoading(false);
          return;
        }
        console.log('reCAPTCHA verification passed for resend');
      }
      
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

    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (error.code === 'auth/invalid-app-credential') {
        errorMessage = 'Phone authentication not configured. Using development mode - enter 123456 or 000000 as OTP.';
        // Firebase phone auth not configured, using development mode
        // In development, we'll just show a message and let users use test OTPs
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage = 'reCAPTCHA verification failed. Please try again.';
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please check your phone number.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait before trying again.';
      }
      
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
      // Attempt to reset reCAPTCHA on error
      if (window.recaptchaVerifier) {
        try {
          // Clear the reCAPTCHA verifier and recreate it
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
          
          // Recreate reCAPTCHA verifier
          const recaptchaContainer = document.getElementById('recaptcha-container');
          if (recaptchaContainer) {
            recaptchaContainer.innerHTML = '';
            
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              'size': 'invisible',
              'callback': (response: any) => {
                console.log('reCAPTCHA verified', response);
              },
              'expired-callback': () => {
                console.log('reCAPTCHA expired');
              }
            });
            
            await window.recaptchaVerifier.render();
          }
        } catch (resetError) {
          console.error("Error resetting reCAPTCHA after failed OTP send:", resetError);
        }
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
    // Check if OTP was already sent from signup page
    if (isClient && phone) {
      // Check if we already have a confirmation result from signup page
      if (window.confirmationResult) {
        console.log('OTP already sent from signup page');
        toast({
          title: 'OTP Ready!',
          description: 'Please check your phone for the verification code.',
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
      } else {
        // If no confirmation result, send OTP (fallback)
        handleSendOTP(false);
      }
    }
  }, [isClient, phone, handleSendOTP]);


  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({ title: 'Error', description: 'Please enter a valid 6-digit OTP.', variant: 'destructive' });
      return;
    }

    if (!phone || !name || !dateOfBirth || !sex) {
      toast({ title: 'Error', description: 'Missing user data. Please start over.', variant: 'destructive' });
      router.push('/signup');
      return;
    }

    setLoading(true);
    try {
      let user = null;
      
      if (window.confirmationResult) {
        // Normal Firebase phone auth flow
        const result = await window.confirmationResult.confirm(otp);
        user = result.user;
      } else if (otp === '123456' || otp === '000000') {
        // Development fallback when Firebase phone auth is not configured
        // Using development fallback for OTP verification
        // We'll create a user without Firebase Auth UID in this case
        user = { uid: `dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
      } else {
        throw new Error('Invalid OTP. Please try 123456 or 000000 for development, or resend OTP.');
      }

      if (user) {
        // Create user account in Firestore
        const usersRef = collection(db, 'users');
        const docRef = await addDoc(usersRef, {
          uid: user.uid, // Store Firebase Auth UID
          phone: phone,
          name: name,
          dateOfBirth: dateOfBirth,
          age: calculateAge(dateOfBirth), // Calculate and store age for backward compatibility
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
