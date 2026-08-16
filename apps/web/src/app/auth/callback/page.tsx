import type { Metadata } from 'next';
import { CallbackClient } from './callback-client';

export const metadata: Metadata = {
  title: 'Signing in',
};

export default function AuthCallbackPage() {
  return (
    <main className="grid h-screen place-items-center px-6 text-center">
      <div>
        <p className="text-section font-light">Signing you in</p>
        <p className="mt-1.5 text-secondary font-light text-muted-foreground">
          This only takes a moment.
        </p>
        <noscript>
          <p className="mt-4 text-secondary font-light text-danger">
            JavaScript is required to complete sign-in.
          </p>
        </noscript>
      </div>
      <CallbackClient />
    </main>
  );
}
