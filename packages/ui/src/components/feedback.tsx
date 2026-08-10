import * as React from 'react';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <>
      <Loader2
        aria-hidden="true"
        className={cn('size-4 animate-spin text-muted-foreground motion-reduce:animate-none', className)}
      />
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}

/** Placeholder for content whose layout is already known. Never used in Monaco. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-secondary motion-reduce:animate-none', className)}
    />
  );
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      <p className="text-panel font-normal text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-secondary font-light text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export interface ErrorNoticeProps {
  title: string;
  detail?: string;
  /** Tells the user whether their work survived — the first thing they ask. */
  reassurance?: string;
  actions?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorNotice({
  title,
  detail,
  reassurance,
  actions,
  onDismiss,
  className,
}: ErrorNoticeProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-danger-border bg-danger-surface px-3.5 py-3',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />

      <div className="min-w-0 flex-1">
        <p className="text-secondary font-normal text-danger">{title}</p>

        {detail && (
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-micro font-light leading-relaxed text-danger">
            {detail}
          </pre>
        )}

        {reassurance && (
          <p className="mt-1.5 text-label font-light text-foreground-secondary">{reassurance}</p>
        )}

        {actions && <div className="mt-2.5 flex flex-wrap gap-2">{actions}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'shrink-0 rounded-sm px-1 text-label font-light text-danger outline-none',
            'hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
          )}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  const tones = {
    neutral: 'border-border text-muted-foreground',
    accent: 'border-border-strong text-foreground',
    success: 'border-border text-success',
    warning: 'border-border text-warning',
  } as const;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-micro font-light',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export type ProgressStepState = 'pending' | 'active' | 'done';

export interface ProgressStep {
  label: string;
  state: ProgressStepState;
}

/**
 * Named stages for long operations.
 *
 * npm reports no reliable completion ratio, so the product shows the stage it
 * has actually reached rather than inventing a percentage.
 */
export function ProgressSteps({ steps, className }: { steps: ProgressStep[]; className?: string }) {
  return (
    <ol className={cn('space-y-1.5', className)} aria-live="polite">
      {steps.map((step) => (
        <li key={step.label} className="flex items-center gap-2.5 text-secondary font-light">
          <span className="grid size-4 shrink-0 place-items-center">
            {step.state === 'done' && <Check className="size-3.5 text-success" aria-hidden="true" />}
            {step.state === 'active' && <Spinner className="size-3.5" />}
            {step.state === 'pending' && (
              <span className="size-1.5 rounded-full bg-subtle-foreground" aria-hidden="true" />
            )}
          </span>
          <span
            className={cn(
              step.state === 'pending' ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {step.label}
          </span>
          <span className="sr-only">{step.state}</span>
        </li>
      ))}
    </ol>
  );
}
