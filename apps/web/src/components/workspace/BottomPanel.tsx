import { Button, cn } from '@mai-habi/ui';
import { ChevronDown, Trash2 } from 'lucide-react';
import { useWorkspace, type BottomTab } from '../../state/workspace';
import { ConsolePanel } from './ConsolePanel';
import { PreviewPane } from './PreviewPane';
import { ProblemsPanel } from './ProblemsPanel';

const TABS: Array<{ id: BottomTab; label: string }> = [
  { id: 'console', label: 'Console' },
  { id: 'problems', label: 'Problems' },
  { id: 'preview', label: 'Preview' },
];

export function BottomPanel() {
  const bottomTab = useWorkspace((state) => state.bottomTab);
  const problems = useWorkspace((state) => state.problems);
  const compileErrors = useWorkspace((state) => state.compileErrors);
  const entries = useWorkspace((state) => state.console);

  const problemCount = problems.length + compileErrors.length;
  const errorCount = entries.filter((entry) => entry.level === 'error').length;

  return (
    <div className="flex h-full flex-col border-t border-border bg-surface">
      <div
        className="flex h-8 shrink-0 items-center gap-1 border-b border-border px-2"
        role="tablist"
        aria-label="Workspace panels"
      >
        {TABS.map((tab) => {
          const count =
            tab.id === 'problems' ? problemCount : tab.id === 'console' ? errorCount : 0;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={bottomTab === tab.id}
              onClick={() => useWorkspace.getState().setBottomTab(tab.id)}
              className={cn(
                'rounded-sm px-2 py-1 text-label font-light outline-none',
                'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
                bottomTab === tab.id
                  ? 'bg-surface-active text-foreground'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground',
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn('ml-1.5', tab.id === 'console' ? 'text-danger' : 'text-muted-foreground')}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-1">
          {bottomTab === 'console' && entries.length > 0 && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Clear console"
              onClick={() => useWorkspace.getState().clearConsole()}
            >
              <Trash2 />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Hide panel"
            onClick={() => useWorkspace.getState().togglePanel()}
          >
            <ChevronDown />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {/*
          The preview frame is never unmounted: it is what produces console
          output and runtime errors, so it has to keep running while the user
          reads them on another tab.
        */}
        <PreviewPane visible={bottomTab === 'preview'} />

        {bottomTab === 'console' && <ConsolePanel />}
        {bottomTab === 'problems' && <ProblemsPanel />}
      </div>
    </div>
  );
}
