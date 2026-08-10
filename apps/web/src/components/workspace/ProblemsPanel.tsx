import { cn } from '@mai-habi/ui';
import { useWorkspace } from '../../state/workspace';

/**
 * Compilation errors and editor diagnostics, kept apart.
 *
 * A compile error means the bundle was never produced; a type diagnostic is
 * advice from the editor. Mixing them would hide which one is stopping the app
 * from running.
 */
export function ProblemsPanel() {
  const compileErrors = useWorkspace((state) => state.compileErrors);
  const compileWarnings = useWorkspace((state) => state.compileWarnings);
  const problems = useWorkspace((state) => state.problems);

  const empty =
    compileErrors.length === 0 && compileWarnings.length === 0 && problems.length === 0;

  if (empty) {
    return <p className="px-4 py-6 text-label font-light text-muted-foreground">No problems found.</p>;
  }

  return (
    <div className="h-full overflow-y-auto py-1">
      {compileErrors.length > 0 && (
        <Section title="Compilation">
          {compileErrors.map((error, index) => (
            <Row
              key={`compile-${index}`}
              severity="error"
              message={error.message}
              snippet={error.snippet}
              path={error.location?.file}
              line={error.location?.line}
              column={error.location?.column}
            />
          ))}
        </Section>
      )}

      {compileWarnings.length > 0 && (
        <Section title="Compiler warnings">
          {compileWarnings.map((warning, index) => (
            <Row
              key={`warn-${index}`}
              severity="warning"
              message={warning.message}
              snippet={warning.snippet}
              path={warning.location?.file}
              line={warning.location?.line}
              column={warning.location?.column}
            />
          ))}
        </Section>
      )}

      {problems.length > 0 && (
        <Section title="Editor">
          {problems.map((problem, index) => (
            <Row
              key={`editor-${index}`}
              severity={problem.severity === 'error' ? 'error' : 'warning'}
              message={problem.message}
              path={problem.path}
              line={problem.line}
              column={problem.column}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-1">
      <h3 className="px-4 py-1 text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  severity,
  message,
  snippet,
  path,
  line,
  column,
}: {
  severity: 'error' | 'warning';
  message: string;
  snippet?: string;
  path?: string;
  line?: number;
  column?: number;
}) {
  const openable = Boolean(path && useWorkspace.getState().files[path]);

  const content = (
    <>
      <span className={cn('shrink-0', severity === 'error' ? 'text-danger' : 'text-warning')}>
        {severity}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-foreground">{message}</span>
        {snippet && (
          <span className="mt-0.5 block truncate font-mono text-micro text-muted-foreground">
            {snippet}
          </span>
        )}
      </span>
      {path && (
        <span className="ml-auto shrink-0 font-mono text-micro text-muted-foreground">
          {path}
          {line ? `:${line}${column ? `:${column}` : ''}` : ''}
        </span>
      )}
    </>
  );

  if (!openable) {
    return <div className="flex items-baseline gap-2 px-4 py-1 text-label font-light">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => path && useWorkspace.getState().openFile(path)}
      className={cn(
        'flex w-full items-baseline gap-2 px-4 py-1 text-left text-label font-light outline-none',
        'hover:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2',
        'focus-visible:outline-focus-ring',
      )}
    >
      {content}
    </button>
  );
}
