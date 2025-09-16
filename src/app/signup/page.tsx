import { Suspense } from 'react';
import { SignUpForm } from './signup-form';

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpForm />
    </Suspense>
  );
}
