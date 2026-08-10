import { basename } from '@mai-habi/filesystem';
import { cn } from '@mai-habi/ui';
import { X } from 'lucide-react';
import { useWorkspace } from '../../state/workspace';

export function EditorTabs() {
  const openTabs = useWorkspace((state) => state.openTabs);
  const activeTab = useWorkspace((state) => state.activeTab);
  const dirty = useWorkspace((state) => state.dirty);

  if (openTabs.length === 0) {
    return <div className="h-9 shrink-0 border-b border-border bg-surface" />;
  }

  return (
    <div
      className="no-scrollbar flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-surface"
      role="tablist"
      aria-label="Open files"
    >
      {openTabs.map((path) => {
        const isActive = path === activeTab;
        const isDirty = dirty.includes(path);
        const name = basename(path);

        return (
          <div
            key={path}
            role="tab"
            aria-selected={isActive}
            title={path}
            tabIndex={isActive ? 0 : -1}
            onClick={() => useWorkspace.getState().setActiveTab(path)}
            onKeyDown={(event) => {
              const store = useWorkspace.getState();
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                store.setActiveTab(path);
              }
              if (event.key === 'ArrowRight') store.cycleTab(1);
              if (event.key === 'ArrowLeft') store.cycleTab(-1);
              if (event.key === 'w' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                store.closeTab(path);
              }
            }}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                useWorkspace.getState().closeTab(path);
              }
            }}
            className={cn(
              'group relative flex cursor-pointer items-center gap-2 border-r border-border px-3',
              'text-secondary font-light outline-none',
              'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
              isActive
                ? 'bg-surface text-foreground'
                : 'bg-background text-muted-foreground hover:bg-surface-hover hover:text-foreground',
            )}
          >
            {/* Marks the active tab without relying on weight or colour alone. */}
            {isActive && <span className="absolute inset-x-0 top-0 h-px bg-foreground" />}

            <span className="max-w-40 truncate">{name}</span>

            <button
              type="button"
              aria-label={isDirty ? `Close ${name} (unsaved changes)` : `Close ${name}`}
              onClick={(event) => {
                event.stopPropagation();
                useWorkspace.getState().closeTab(path);
              }}
              className={cn(
                'grid size-4 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none',
                'transition-colors duration-[--duration-fast] hover:bg-surface-active hover:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
              )}
            >
              {isDirty && (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-muted-foreground group-hover:hidden"
                />
              )}
              <X className={cn('size-3', isDirty && 'hidden group-hover:block')} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
