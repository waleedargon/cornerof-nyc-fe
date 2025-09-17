import { Suspense } from 'react';
import { AdminSignInForm } from './admin-signin-form';

export default function AdminSignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminSignInForm />
    </Suspense>
  );
}
