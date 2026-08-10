/// <reference lib="webworker" />

import { compile, initialiseCompiler } from '@mai-habi/compiler/bundler';
import type { WorkerRequest, WorkerResponse } from '@mai-habi/compiler/protocol';

/**
 * The compiler worker.
 *
 * One of these exists per editor tab. Compilation therefore scales with the
 * number of browsers rather than with server CPU — a hundred users are a
 * hundred local workers, not a hundred remote containers.
 */

const scope = self as unknown as DedicatedWorkerGlobalScope;

function reply(message: WorkerResponse): void {
  scope.postMessage(message);
}

let ready: Promise<unknown> | null = null;

function ensureCompiler(): Promise<unknown> {
  if (!ready) {
    reply({ type: 'status', stage: 'loading-compiler' });
    ready = initialiseCompiler().then((instance) => {
      reply({ type: 'status', stage: 'ready' });
      return instance;
    });
  }
  return ready;
}

scope.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (!request || typeof request !== 'object') return;

  if (request.type === 'dispose') {
    scope.close();
    return;
  }

  if (request.type !== 'compile') return;

  void (async () => {
    try {
      await ensureCompiler();
      reply({ type: 'status', stage: 'compiling' });

      const result = await compile({
        files: request.files,
        entry: request.entry,
        minify: request.minify,
      });

      reply({ type: 'result', id: request.id, ...result } as WorkerResponse);
      reply({ type: 'status', stage: 'ready' });
    } catch (error) {
      reply({
        type: 'result',
        id: request.id,
        ok: false,
        errors: [
          {
            message: error instanceof Error ? error.message : String(error),
            location: null,
          },
        ],
        warnings: [],
        durationMs: 0,
      });
      reply({ type: 'status', stage: 'ready' });
    }
  })();
});
