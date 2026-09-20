import { cookies } from 'next/headers';
import { validateBackendCode } from '../../../../lib/backend-sandbox';
import {
  VERCEL_CONNECTION_COOKIE,
  assertSameOrigin,
  openVercelConnection,
} from '../../../../lib/vercel-connection';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const connection = openVercelConnection(
      (await cookies()).get(VERCEL_CONNECTION_COOKIE)?.value,
    );
    if (!connection)
      return Response.json(
        { error: 'Connect a Vercel account first.' },
        { status: 401 },
      );
    const { code } = (await request.json()) as { code?: unknown };
    const output = await validateBackendCode(String(code ?? ''), connection);
    return Response.json({ ok: true, output });
  } catch (cause) {
    return Response.json(
      {
        error:
          cause instanceof Error ? cause.message : 'Sandbox validation failed.',
      },
      { status: 400 },
    );
  }
}
