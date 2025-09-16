import { Suspense } from 'react';
import { JoinCheckForm } from './join-check-form';

export default function JoinCheckPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinCheckForm />
    </Suspense>
  );
}