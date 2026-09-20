import 'server-only';

import { Sandbox } from '@vercel/sandbox';
import type { VercelConnection } from './vercel-connection';

const RUNNER = `
import { handle } from './service.mjs';
if (typeof handle !== 'function') throw new Error('Export an async function named handle.');
const result = await handle({
  method: 'GET', path: '/health', query: {}, headers: {}, body: null
});
if (!result || typeof result !== 'object') throw new Error('handle() must return an object.');
if (result.status !== undefined && (!Number.isInteger(result.status) || result.status < 100 || result.status > 599)) {
  throw new Error('result.status must be an HTTP status between 100 and 599.');
}
console.log(JSON.stringify({ ok: true, result }, null, 2));
`;

export async function validateBackendCode(
  code: string,
  connection: VercelConnection,
): Promise<string> {
  if (!code.trim() || code.length > 100_000)
    throw new Error('Backend source must be between 1 and 100,000 characters.');

  const sandbox = await Sandbox.create({
    token: connection.token,
    teamId: connection.teamId,
    projectId: connection.projectId,
    runtime: 'node24',
    persistent: false,
    timeout: 60_000,
    networkPolicy: 'deny-all',
  });

  try {
    await sandbox.writeFiles([
      { path: 'service.mjs', content: code },
      { path: 'validate.mjs', content: RUNNER },
    ]);
    const syntax = await sandbox.runCommand(
      'node',
      ['--check', 'service.mjs'],
      {
        timeoutMs: 10_000,
      },
    );
    const syntaxOutput =
      `${await syntax.stdout()}${await syntax.stderr()}`.trim();
    if (syntax.exitCode !== 0)
      throw new Error(syntaxOutput || 'Syntax validation failed.');

    const run = await sandbox.runCommand('node', ['validate.mjs'], {
      timeoutMs: 10_000,
    });
    const output = `${await run.stdout()}${await run.stderr()}`.trim();
    if (run.exitCode !== 0) throw new Error(output || 'Sandbox test failed.');
    return output;
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}
