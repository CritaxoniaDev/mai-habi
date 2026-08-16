'use client';

import { useEffect } from 'react';
import { getSupabase } from '@mai-habi/shared';

/** Consumes the token in the callback URL, then returns to the dashboard. */
export function CallbackClient() {
  useEffect(() => {
    let cancelled = false;
    // The client is configured with detectSessionInUrl, so creating it consumes
    // the token in the callback URL before we navigate away.
    void getSupabase().then(() => {
      if (!cancelled) window.location.replace('/');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
