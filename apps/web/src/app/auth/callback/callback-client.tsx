'use client';

import { useEffect, useState } from 'react';
import { getSupabase, storeGitHubToken } from '@mai-habi/shared';
import { Button } from '@mai-habi/ui';

/**
 * Supabase reports a rejected or expired link in the URL rather than by
 * throwing. The implicit flow puts it in the fragment, the code flow in the
 * query string, so both are checked.
 */
function urlError(): string | null {
  for (const source of [window.location.hash.slice(1), window.location.search.slice(1)]) {
    const params = new URLSearchParams(source);
    const described = params.get('error_description') ?? params.get('error');
    if (described) return described;
  }

  return null;
}

/**
 * Completes sign-in, then returns to the dashboard.
 *
 * `createClient` only *starts* reading the token out of the callback URL: the
 * constructor kicks off GoTrueClient's initialisation without awaiting it, so a
 * freshly created client has not established the session yet. `getSession()`
 * awaits that initialisation, and navigating only once it resolves is what stops
 * the token from being discarded along with the page.
 */
export function CallbackClient() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const complete = async (): Promise<string | null> => {
      // Read before the client exists: initialisation strips the token from the
      // URL once it has read it.
      const reported = urlError();
      if (reported) return reported;

      const supabase = await getSupabase();
      if (!supabase) return 'Cloud features are not configured.';

      const { data, error: cause } = await supabase.auth.getSession();
      if (cause) return cause.message;
      if (!data.session) return 'That sign-in attempt expired before it completed.';

      /*
       * The only point at which the GitHub token is visible. Nothing has
       * registered an `onAuthStateChange` listener on this page, so it has to
       * be taken here or it is gone for the life of the session.
       */
      storeGitHubToken(data.session.provider_token);

      return null;
    };

    void complete()
      .catch((cause: unknown) =>
        cause instanceof Error ? cause.message : 'Could not complete sign-in.',
      )
      .then((message) => {
        if (cancelled) return;
        if (message) setError(message);
        else window.location.replace('/');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div>
        <p className="text-section font-light">Could not sign you in</p>
        <p className="mx-auto mt-1.5 max-w-sm text-secondary font-light text-muted-foreground">
          {error}
        </p>
        <Button variant="default" className="mt-5" asChild>
          <a href="/">Back to projects</a>
        </Button>
      </div>
    );
  }

  return (
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
  );
}
