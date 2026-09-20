import type { Metadata } from 'next';
import BackendServiceBuilder from '../../islands/BackendServiceBuilder';

export const metadata: Metadata = {
  title: 'API Builder',
  description: 'Design and publish lightweight JSON APIs from your browser.',
};

export default function ApiBuilderPage() {
  return <BackendServiceBuilder />;
}
