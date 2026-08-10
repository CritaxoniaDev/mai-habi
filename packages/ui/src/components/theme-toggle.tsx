import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_LABELS, THEME_MODES, type ThemeMode } from '../theme/controller';
import { useTheme } from '../theme/use-theme';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './menu';
import { cn } from '../lib/cn';

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Compact appearance control.
 *
 * The icon is supporting decoration only — the selected mode is always named in
 * text inside the menu, and the trigger carries it in its accessible name.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { mode, resolved, setMode } = useTheme();
  const Icon = ICONS[mode];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-label={`Appearance: ${THEME_LABELS[mode]}`}
        >
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {THEME_MODES.map((option) => {
          const OptionIcon = ICONS[option];
          const selected = option === mode;

          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => setMode(option)}
              aria-checked={selected}
              role="menuitemradio"
              className={selected ? 'bg-surface-secondary text-foreground' : undefined}
            >
              <OptionIcon aria-hidden="true" />
              {THEME_LABELS[option]}
              {option === 'system' && (
                <span className="ml-auto text-micro text-muted-foreground">
                  {THEME_LABELS[resolved]}
                </span>
              )}
              {selected && (
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full bg-foreground',
                    option !== 'system' && 'ml-auto',
                  )}
                  aria-hidden="true"
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The expanded form used in settings, where there is room to show all modes. */
export function ThemeRadioGroup({ className }: { className?: string }) {
  const { mode, resolved, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className={cn('grid grid-cols-3 gap-2', className)}
    >
      {THEME_MODES.map((option) => {
        const OptionIcon = ICONS[option];
        const selected = option === mode;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(option)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border px-3 py-3 transition-colors',
              'duration-[--duration-fast] ease-[--ease-standard]',
              selected
                ? 'border-border-strong bg-surface-secondary text-foreground'
                : 'border-border text-muted-foreground hover:border-border-strong hover:bg-surface-hover hover:text-foreground',
            )}
          >
            <OptionIcon className="size-4" aria-hidden="true" />
            <span className="text-label font-normal">{THEME_LABELS[option]}</span>
            {option === 'system' && (
              <span className="text-micro text-muted-foreground">
                Currently {THEME_LABELS[resolved]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
