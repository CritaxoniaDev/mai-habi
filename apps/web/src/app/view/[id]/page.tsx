import type { Metadata } from 'next';
import ViewerShell from '../../../islands/ViewerShell';

export const metadata: Metadata = {
  title: 'Viewer',
};

/*
 * The viewer is its own module: no explorer, no Monaco, no console. It resolves
 * the project, compiles it in the visitor's browser and renders the result. It
 * server-renders its loading frame directly (a client component rendered by this
 * server page), then hydrates to compile — no dynamic import indirection needed.
 */
export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ViewerShell id={id} />;
}
