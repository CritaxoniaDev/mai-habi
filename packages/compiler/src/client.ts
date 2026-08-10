import type {
  CompileFailure,
  CompileSuccess,
  WorkerRequest,
  WorkerResponse,
  WorkerStatus,
} from './protocol';

export type CompileResult =
  | Omit<CompileSuccess, 'type' | 'id'>
  | Omit<CompileFailure, 'type' | 'id'>;

type StatusListener = (stage: WorkerStatus['stage']) => void;

interface Pending {
  resolve: (result: CompileResult) => void;
  reject: (error: Error) => void;
}

/**
 * Main-thread handle on the compiler worker.
 *
 * Compilation never touches the UI thread, so typing stays responsive while a
 * build is in flight. Superseded builds are dropped rather than queued: only
 * the newest source state matters.
 */
export class CompilerClient {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private statusListeners = new Set<StatusListener>();

  constructor(worker: Worker) {
    this.worker = worker;

    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (!message || typeof message !== 'object') return;

      if (message.type === 'status') {
        for (const listener of this.statusListeners) listener(message.stage);
        return;
      }

      if (message.type !== 'result') return;

      const pending = this.pending.get(message.id);
      if (!pending) return;

      this.pending.delete(message.id);
      const { type, id, ...result } = message;
      pending.resolve(result as CompileResult);
    });

    this.worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'The compiler worker failed to start.');
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    });
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  compile(files: Record<string, string>, entry: string, minify = false): Promise<CompileResult> {
    const id = this.nextId;
    this.nextId += 1;

    // A newer request makes older ones irrelevant.
    for (const [pendingId, pending] of this.pending) {
      if (pendingId >= id) continue;
      this.pending.delete(pendingId);
      pending.reject(new SupersededError());
    }

    const request: WorkerRequest = { type: 'compile', id, files, entry, minify };

    return new Promise<CompileResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(request);
    });
  }

  dispose(): void {
    this.worker.postMessage({ type: 'dispose' } satisfies WorkerRequest);
    this.worker.terminate();
    this.pending.clear();
    this.statusListeners.clear();
  }
}

/** Thrown when a build is abandoned because a newer one started. */
export class SupersededError extends Error {
  constructor() {
    super('Compilation superseded by a newer change.');
    this.name = 'SupersededError';
  }
}
