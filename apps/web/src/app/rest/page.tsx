import type { Metadata } from 'next';
import RestClient from '../../islands/RestClient';

export const metadata: Metadata = {
  title: 'REST client',
};

/*
 * A standalone tool, not tied to any project. The store persists per browser, so
 * the composed request and history survive between visits. Rendered directly as
 * a client component — it server-renders its shell and then hydrates to restore
 * the persisted request.
 */
export default function RestPage() {
  return <RestClient />;
}
