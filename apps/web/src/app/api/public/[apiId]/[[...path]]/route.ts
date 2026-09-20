import type { MockApiRoute } from '@mai-habi/types';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@mai-habi/shared';

export const dynamic = 'force-dynamic';

interface PublishedApiRow {
  routes: unknown;
  cors_origin: unknown;
}

interface RouteParams {
  apiId: string;
  path?: string[];
}

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return Response.json(
    { error: message },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } },
  );
}

function isMockRoute(value: unknown): value is MockApiRoute {
  if (!value || typeof value !== 'object') return false;
  const route = value as Partial<MockApiRoute>;
  return (
    typeof route.id === 'string' &&
    typeof route.enabled === 'boolean' &&
    ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method ?? '') &&
    typeof route.path === 'string' &&
    typeof route.status === 'number' &&
    typeof route.delayMs === 'number' &&
    typeof route.failureRate === 'number' &&
    typeof route.response === 'string'
  );
}

function corsHeaders(corsOrigin: string, request: Request): HeadersInit {
  const requestOrigin = request.headers.get('origin');
  const allowedOrigin =
    corsOrigin === '*' || !requestOrigin || requestOrigin === corsOrigin
      ? corsOrigin
      : '';

  return {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

async function loadApi(apiId: string): Promise<PublishedApiRow | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!/^api_[a-z0-9]{16,64}$/.test(apiId)) return null;

  const query = new URL(`${SUPABASE_URL}/rest/v1/published_apis`);
  query.searchParams.set('id', `eq.${apiId}`);
  query.searchParams.set('enabled', 'eq.true');
  query.searchParams.set('select', 'routes,cors_origin');
  query.searchParams.set('limit', '1');

  const response = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    cache: 'no-store',
  });
  if (!response.ok) return null;

  const rows = (await response.json()) as PublishedApiRow[];
  return rows[0] ?? null;
}

async function handle(
  request: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const { apiId, path = [] } = await params;
  const application = await loadApi(apiId);
  if (!application) {
    return jsonError('API application not found or not published.', 404, {
      'Access-Control-Allow-Origin': '*',
    });
  }

  const corsOrigin = String(application.cors_origin || '*');
  const cors = corsHeaders(corsOrigin, request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const pathname = `/${path.join('/')}`;
  const routes = Array.isArray(application.routes)
    ? application.routes.filter(isMockRoute)
    : [];
  const route = routes.find(
    (candidate) =>
      candidate.enabled &&
      candidate.method === request.method &&
      candidate.path.split('?')[0] === pathname,
  );

  if (!route) {
    return jsonError(
      `No ${request.method} endpoint is configured for ${pathname}.`,
      404,
      cors,
    );
  }

  const delay = Math.max(0, Math.min(10_000, Number(route.delayMs) || 0));
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));

  const failed =
    Math.random() * 100 <
    Math.max(0, Math.min(100, Number(route.failureRate) || 0));
  const status = failed
    ? 500
    : Math.max(100, Math.min(599, Number(route.status) || 200));
  const body = failed
    ? JSON.stringify({ error: 'Simulated failure' })
    : route.response;

  return new Response(body, {
    status,
    headers: {
      ...cors,
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'X-Habi-Api': apiId,
    },
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
