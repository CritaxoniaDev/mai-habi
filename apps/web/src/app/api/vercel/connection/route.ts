import { cookies } from 'next/headers';
import {
  VERCEL_CONNECTION_COOKIE,
  assertSameOrigin,
  openVercelConnection,
  sealVercelConnection,
  vercelApiUrl,
} from '../../../../lib/vercel-connection';

export const runtime = 'nodejs';

function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  const connection = openVercelConnection(
    (await cookies()).get(VERCEL_CONNECTION_COOKIE)?.value,
  );
  return Response.json(
    connection
      ? {
          connected: true,
          username: connection.username,
          teamId: connection.teamId,
          projectId: connection.projectId,
        }
      : { connected: false },
  );
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = (await request.json()) as Record<string, unknown>;
    const token = String(body.token ?? '').trim();
    const teamId = String(body.teamId ?? '').trim();
    const projectId = String(body.projectId ?? '').trim();
    if (!token || !teamId || !projectId)
      return error('Token, team ID, and project ID are required.');

    const headers = { Authorization: `Bearer ${token}` };
    const [userResponse, projectResponse] = await Promise.all([
      fetch(vercelApiUrl('/v2/user', teamId), { headers, cache: 'no-store' }),
      fetch(
        vercelApiUrl(`/v9/projects/${encodeURIComponent(projectId)}`, teamId),
        {
          headers,
          cache: 'no-store',
        },
      ),
    ]);
    if (!userResponse.ok || !projectResponse.ok)
      return error(
        'Vercel rejected those credentials or the selected project.',
        401,
      );

    const user = (await userResponse.json()) as {
      user?: { username?: string; email?: string };
    };
    const username =
      user.user?.username ?? user.user?.email ?? 'Vercel account';
    const store = await cookies();
    store.set(
      VERCEL_CONNECTION_COOKIE,
      sealVercelConnection({ token, teamId, projectId, username }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      },
    );
    return Response.json({ connected: true, username, teamId, projectId });
  } catch (cause) {
    return error(
      cause instanceof Error ? cause.message : 'Could not connect Vercel.',
      500,
    );
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    (await cookies()).delete(VERCEL_CONNECTION_COOKIE);
    return Response.json({ connected: false });
  } catch (cause) {
    return error(
      cause instanceof Error ? cause.message : 'Could not disconnect.',
      500,
    );
  }
}
