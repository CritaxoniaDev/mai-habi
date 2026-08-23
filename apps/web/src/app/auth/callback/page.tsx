import type { Metadata } from 'next';
import { CallbackClient } from './callback-client';

export const metadata: Metadata = {
  title: 'Signing in',
};

export default function AuthCallbackPage() {
  return (
    <main className="grid h-screen place-items-center px-6 text-center">
      <CallbackClient />
    </main>
  );
}
