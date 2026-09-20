import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { validateBackendCode } from '../../../../lib/backend-sandbox';
import {
  VERCEL_CONNECTION_COOKIE,
  assertSameOrigin,
  openVercelConnection,
  vercelApiUrl,
} from '../../../../lib/vercel-connection';

export const runtime = 'nodejs';
export const maxDuration = 180;

const WRAPPER = `
import { handle } from '../service.mjs';

export default async function service(request, response) {
  try {
    const rawPath = Array.isArray(request.query.__path)
      ? request.query.__path.join('/')
      : String(request.query.__path || '');
    const query = { ...request.query };
    delete query.__path;
    const result = await handle({
      method: request.method || 'GET',
      path: '/' + rawPath.replace(/^\\/+/, ''),
      query,
      headers: request.headers,
      body: request.body ?? null,
    });
    const status = Number.isInteger(result?.status) ? result.status : 200;
    for (const [name, value] of Object.entries(result?.headers || {})) {
      if (typeof value === 'string') response.setHeader(name, value);
    }
    const body = result?.body ?? null;
    if (!response.hasHeader('content-type')) response.setHeader('content-type', 'application/json; charset=utf-8');
    response.status(status).send(typeof body === 'string' ? body : JSON.stringify(body));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'Service failed.' });
  }
}
`;

interface SourceFile {
  file: string;
  content: string;
}

async function uploadFiles(files: SourceFile[], token: string, teamId: string) {
  return Promise.all(
    files.map(async ({ file, content }) => {
      const body = Buffer.from(content);
      const sha = createHash('sha1').update(body).digest('hex');
      const upload = await fetch(vercelApiUrl('/v2/files', teamId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(body.length),
          'x-vercel-digest': sha,
        },
        body,
      });
      if (!upload.ok) throw new Error(`Could not upload ${file} to Vercel.`);
      return { file, sha, size: body.length };
    }),
  );
}

function safeProjectName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned.slice(0, 80) || `habi-service-${Date.now().toString(36)}`;
}

function safeDeploymentUrl(value: string): string {
  const candidate = value.startsWith('https://') ? value : `https://${value}`;
  const url = new URL(candidate);
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith('.vercel.app') ||
    url.username ||
    url.password ||
    url.port
  ) {
    throw new Error('Vercel returned an invalid deployment URL.');
  }
  return `https://${url.hostname}`;
}

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

    const body = (await request.json()) as { code?: unknown; name?: unknown };
    const code = String(body.code ?? '');
    const name = safeProjectName(String(body.name ?? 'habi-service'));
    const validationOutput = await validateBackendCode(code, connection);

    const uploaded = await uploadFiles(
      [
        { file: 'service.mjs', content: code },
        { file: 'api/service.mjs', content: WRAPPER },
        {
          file: 'package.json',
          content: JSON.stringify({ name, private: true, type: 'module' }),
        },
      ],
      connection.token,
      connection.teamId,
    );

    const deploymentResponse = await fetch(
      vercelApiUrl('/v13/deployments', connection.teamId),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${connection.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          target: 'production',
          files: uploaded.map(({ file, sha, size }) => ({ file, sha, size })),
          projectSettings: { framework: null },
        }),
      },
    );
    const deployment = (await deploymentResponse.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!deploymentResponse.ok || !deployment.id || !deployment.url) {
      throw new Error(
        deployment.error?.message || 'Vercel could not create the deployment.',
      );
    }
    const deploymentUrl = safeDeploymentUrl(deployment.url);

    return Response.json({
      deploymentId: deployment.id,
      deploymentUrl,
      projectName: name,
      validationOutput,
    });
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : 'Deployment failed.' },
      { status: 400 },
    );
  }
}
