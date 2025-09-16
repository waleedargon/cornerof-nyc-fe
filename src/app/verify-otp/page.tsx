import { Suspense } from 'react';
import { VerifyOTPForm } from './verify-otp-form';

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyOTPForm />
    </Suspense>
  );
}