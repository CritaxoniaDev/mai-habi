import type { Metadata } from 'next';
import { EditorClient } from './editor-client';

export const metadata: Metadata = {
  title: 'Editor',
};

/*
 * Every byte of project data lives in the browser, so there is nothing to
 * prerender per project. The id is resolved here and handed to the client shell,
 * where Monaco and the compiler load — never on the dashboard.
 */
export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorClient projectId={id} />;
}
