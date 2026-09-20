import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@mai-habi/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface ServiceRow {
  deployment_url: unknown;
}

function safeDeploymentUrl(value: unknown): URL | null {
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.vercel.app'))
      return null;
    return url;
  } catch {
    return null;
  }
}

async function loadService(serviceId: string): Promise<URL | null> {
  if (
    !SUPABASE_URL ||
    !SUPABASE_ANON_KEY ||
    !/^svc_[a-z0-9]{16,64}$/.test(serviceId)
  )
    return null;
  const query = new URL(`${SUPABASE_URL}/rest/v1/backend_services`);
  query.searchParams.set('id', `eq.${serviceId}`);
  query.searchParams.set('enabled', 'eq.true');
  query.searchParams.set('select', 'deployment_url');
  query.searchParams.set('limit', '1');
  const response = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as ServiceRow[];
  return safeDeploymentUrl(rows[0]?.deployment_url);
}

async function gateway(
  request: Request,
  { params }: { params: Promise<{ serviceId: string; path?: string[] }> },
) {
  const { serviceId, path = [] } = await params;
  const deployment = await loadService(serviceId);
  if (!deployment)
    return Response.json(
      { error: 'Backend service not found or disabled.' },
      { status: 404 },
    );

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('origin') ?? '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          request.headers.get('access-control-request-headers') ?? 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin, Access-Control-Request-Headers',
      },
    });
  }

  const incoming = new URL(request.url);
  const target = new URL('/api/service', deployment);
  target.search = incoming.search;
  target.searchParams.set('__path', path.join('/'));

  const headers = new Headers(request.headers);
  for (const name of [
    'host',
    'cookie',
    'content-length',
    'connection',
    'transfer-encoding',
  ])
    headers.delete(name);
  headers.set('x-habi-service', serviceId);

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.arrayBuffer(),
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  for (const name of [
    'set-cookie',
    'content-length',
    'content-encoding',
    'transfer-encoding',
  ])
    responseHeaders.delete(name);
  responseHeaders.set('Cache-Control', 'no-store');
  responseHeaders.set('X-Habi-Service', serviceId);
  if (!responseHeaders.has('Access-Control-Allow-Origin'))
    responseHeaders.set('Access-Control-Allow-Origin', '*');
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = gateway;
export const POST = gateway;
export const PUT = gateway;
export const PATCH = gateway;
export const DELETE = gateway;
export const OPTIONS = gateway;
