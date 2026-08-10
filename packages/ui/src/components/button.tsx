import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Buttons stay visually light: no filled slabs, no weight above 400. The
 * primary action is distinguished by contrast, not by mass.
 *
 * Hover, focus, active and disabled are each given a distinct treatment rather
 * than sharing one.
 */
const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-normal ' +
    'transition-colors duration-[--duration-fast] ease-[--ease-standard] outline-none ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ' +
    // Dimmed but still readable, and the cursor says why it will not respond.
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-70 ' +
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'border border-border-strong bg-surface-secondary text-foreground ' +
          'hover:bg-surface-active active:bg-border-strong',
        outline:
          'border border-border bg-surface text-foreground hover:bg-surface-hover ' +
          'hover:border-border-strong active:bg-surface-active',
        ghost:
          'border border-transparent text-muted-foreground hover:bg-surface-hover ' +
          'hover:text-foreground active:bg-surface-active',
        subtle:
          'border border-transparent bg-surface-secondary text-foreground hover:bg-surface-hover ' +
          'active:bg-surface-active',
        danger:
          'border border-danger-border bg-danger-surface text-danger hover:brightness-95 ' +
          'active:brightness-90',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-7 px-2.5 text-secondary [&_svg]:size-3.5',
        default: 'h-8 px-3 text-secondary [&_svg]:size-4',
        lg: 'h-10 px-4 text-body [&_svg]:size-4',
        icon: 'h-8 w-8 [&_svg]:size-4',
        'icon-sm': 'h-7 w-7 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'outline', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, marks the control busy and blocks repeat submits. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Component = asChild ? Slot : 'button';

    return (
      <Component
        ref={ref}
        aria-busy={loading || undefined}
        disabled={asChild ? undefined : disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading && !asChild ? (
          <>
            <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {children}
          </>
        ) : (
          children
        )}
      </Component>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
