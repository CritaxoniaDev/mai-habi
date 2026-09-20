import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

export const VERCEL_CONNECTION_COOKIE = 'habi_vercel_connection';

export interface VercelConnection {
  token: string;
  teamId: string;
  projectId: string;
  username: string;
}

function key(): Buffer {
  const secret = process.env.VERCEL_CONNECTION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'VERCEL_CONNECTION_SECRET must contain at least 32 characters.',
    );
  }
  return createHash('sha256').update(secret).digest();
}

export function sealVercelConnection(connection: VercelConnection): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(connection), 'utf8'),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString('base64url'))
    .join('.');
}

export function openVercelConnection(
  value: string | undefined,
): VercelConnection | null {
  if (!value) return null;
  try {
    const [iv, tag, encrypted] = value
      .split('.')
      .map((part) => Buffer.from(part, 'base64url'));
    if (!iv || !tag || !encrypted) return null;
    const decipher = createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(
      Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
        'utf8',
      ),
    ) as VercelConnection;
  } catch {
    return null;
  }
}

export function vercelApiUrl(path: string, teamId: string): string {
  const url = new URL(path, 'https://api.vercel.com');
  url.searchParams.set('teamId', teamId);
  return url.toString();
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    throw new Error('Cross-origin request rejected.');
  }
}
