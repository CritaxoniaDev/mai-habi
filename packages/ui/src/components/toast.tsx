import { Toaster as SonnerToaster, toast } from 'sonner';
import { useTheme } from '../theme/use-theme';

/**
 * Toasts are for lightweight confirmations only — saved, copied, created.
 * Failures that need a decision use a dialog or a persistent notice instead.
 *
 * sonner's own typography is overridden here so nothing exceeds weight 400,
 * and its theme follows the resolved application appearance.
 */
export function Toaster() {
  const { resolved } = useTheme();

  return (
    <SonnerToaster
      theme={resolved}
      position="bottom-right"
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            'z-toast border border-border bg-surface-raised text-foreground rounded-lg ' +
            'shadow-overlay text-secondary',
          title: 'font-normal',
          description: 'font-light text-muted-foreground',
          actionButton: 'font-normal',
          cancelButton: 'font-light',
        },
        style: {
          fontFamily: 'var(--font-sans)',
          fontWeight: 300,
          background: 'var(--surface-raised)',
          color: 'var(--foreground)',
          borderColor: 'var(--border)',
        },
      }}
    />
  );
}

export { toast };
