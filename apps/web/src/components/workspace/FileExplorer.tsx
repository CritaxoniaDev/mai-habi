import { useEffect, useMemo, useRef, useState } from 'react';
import type { TreeNode } from '@mai-habi/types';
import {
  basename,
  buildTree,
  dirname,
  downloadFile,
  importFromDataTransfer,
  importFromFiles,
  joinPath,
} from '@mai-habi/filesystem';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  Button,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  cn,
  toast,
} from '@mai-habi/ui';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  File as FileIcon,
  FilePlus,
  FolderPlus,
  Link2,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkspace } from '../../state/workspace';

interface DraftEntry {
  parent: string;
  type: 'file' | 'directory';
}

/** Explains exactly what is wrong rather than reporting "invalid". */
function validateName(name: string, siblings: string[]): string | null {
  const trimmed = name.trim();

  if (!trimmed) return 'Enter a name.';
  if (trimmed.includes('/')) return 'Names cannot contain "/".';
  if (trimmed === '.' || trimmed === '..') return 'That name is reserved.';
  if (/[\\:*?"<>|]/.test(trimmed)) return 'Names cannot contain \\ : * ? " < > or |';
  if (siblings.includes(trimmed)) return `"${trimmed}" already exists in this folder.`;

  return null;
}

export function FileExplorer() {
  const files = useWorkspace((state) => state.files);
  const activeTab = useWorkspace((state) => state.activeTab);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ src: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEntry | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ path: string; count: number } | null>(null);

  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string>('');

  const tree = useMemo(() => buildTree(files), [files]);
  const store = useWorkspace.getState;

  /** Flattened visible rows, for arrow-key navigation. */
  const rows = useMemo(() => {
    const out: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        out.push(node);
        if (node.type === 'directory' && expanded[node.path]) walk(node.children ?? []);
      }
    };
    walk(tree);
    return out;
  }, [tree, expanded]);

  // Reveal the folder containing whatever tab is open.
  useEffect(() => {
    if (!activeTab) return;
    const segments = activeTab.split('/');
    segments.pop();

    let prefix = '';
    const next: Record<string, boolean> = {};
    for (const segment of segments) {
      prefix = prefix ? `${prefix}/${segment}` : segment;
      next[prefix] = true;
    }
    if (Object.keys(next).length > 0) setExpanded((current) => ({ ...current, ...next }));
  }, [activeTab]);

  const siblingsOf = (parent: string, exclude?: string) =>
    Object.values(store().files)
      .filter((node) => dirname(node.path) === parent && node.path !== exclude)
      .map((node) => basename(node.path));

  const submitDraft = (name: string) => {
    const entry = draft;
    if (!entry) return;

    const error = validateName(name, siblingsOf(entry.parent));
    if (error) {
      toast.error(error);
      return;
    }

    setDraft(null);
    const path = joinPath(entry.parent, name.trim());

    try {
      if (entry.type === 'file') store().createFile(path);
      else {
        store().createFolder(path);
        setExpanded((current) => ({ ...current, [path]: true }));
      }
      setSelected(path);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not create that.');
    }
  };

  const submitRename = (path: string, name: string) => {
    if (name.trim() === basename(path)) {
      setRenaming(null);
      return;
    }

    const error = validateName(name, siblingsOf(dirname(path), path));
    if (error) {
      toast.error(error);
      return;
    }

    setRenaming(null);
    try {
      store().renameNode(path, name.trim());
      setSelected(joinPath(dirname(path), name.trim()));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not rename that.');
    }
  };

  const beginCreate = (parent: string, type: 'file' | 'directory') => {
    if (parent) setExpanded((current) => ({ ...current, [parent]: true }));
    setDraft({ parent, type });
  };

  /** Folders with contents are confirmed before deletion; single files are not. */
  const requestDelete = (path: string) => {
    const node = store().files[path];
    if (!node) return;

    if (node.type === 'file') {
      store().deleteNode(path);
      return;
    }

    const count = Object.keys(store().files).filter(
      (candidate) => candidate.startsWith(`${path}/`),
    ).length;

    if (count === 0) {
      store().deleteNode(path);
      return;
    }

    setPendingDelete({ path, count });
  };

  const handleDrop = (event: React.DragEvent, parent: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(null);

    const moved = event.dataTransfer.getData('application/x-mai-habi-path');
    if (moved) {
      if (moved === parent || dirname(moved) === parent) return;
      try {
        store().moveNode(moved, joinPath(parent, basename(moved)));
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : 'Could not move that.');
      }
      return;
    }

    if (event.dataTransfer.items.length === 0) return;

    void importFromDataTransfer(event.dataTransfer)
      .then((result) => mergeImported(result.files, parent, result.warnings))
      .catch((cause) => toast.error('Import failed', { description: String(cause) }));
  };

  const mergeImported = (
    imported: Record<string, { path: string }>,
    parent: string,
    warnings: string[] = [],
  ) => {
    const merged = { ...store().files };
    for (const node of Object.values(imported)) {
      const path = joinPath(parent, node.path);
      merged[path] = { ...node, path } as never;
    }
    store().replaceFiles(merged);
    for (const warning of warnings) toast.warning(warning);
  };

  const onRowKeyDown = (event: React.KeyboardEvent, node: TreeNode) => {
    const index = rows.findIndex((row) => row.path === node.path);

    const focusRow = (target: number) => {
      const next = rows[target];
      if (!next) return;
      setSelected(next.path);
      const element = document.querySelector<HTMLElement>(`[data-tree-path="${CSS.escape(next.path)}"]`);
      element?.focus();
    };

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusRow(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusRow(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (node.type === 'directory' && !expanded[node.path]) {
          setExpanded((current) => ({ ...current, [node.path]: true }));
        } else {
          focusRow(index + 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (node.type === 'directory' && expanded[node.path]) {
          setExpanded((current) => ({ ...current, [node.path]: false }));
        } else {
          const parent = dirname(node.path);
          if (parent) focusRow(rows.findIndex((row) => row.path === parent));
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (node.type === 'file') store().openFile(node.path);
        else setExpanded((current) => ({ ...current, [node.path]: !current[node.path] }));
        break;
      case 'F2':
        event.preventDefault();
        setRenaming(node.path);
        break;
      case 'Delete':
        event.preventDefault();
        requestDelete(node.path);
        break;
      default:
        break;
    }
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isOpen = expanded[node.path] ?? false;
    const isOpenFile = activeTab === node.path;
    const isSelected = selected === node.path;
    const indent = 8 + depth * 12;

    const row = (
      <div
        data-tree-path={node.path}
        role="treeitem"
        aria-expanded={node.type === 'directory' ? isOpen : undefined}
        aria-selected={isSelected}
        aria-level={depth + 1}
        tabIndex={isSelected || (!selected && isOpenFile) ? 0 : -1}
        draggable
        title={node.path}
        onKeyDown={(event) => onRowKeyDown(event, node)}
        onDragStart={(event) => {
          event.dataTransfer.setData('application/x-mai-habi-path', node.path);
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          if (node.type !== 'directory') return;
          event.preventDefault();
          setDragOver(node.path);
        }}
        onDragLeave={() => setDragOver((current) => (current === node.path ? null : current))}
        onDrop={(event) =>
          node.type === 'directory' ? handleDrop(event, node.path) : handleDrop(event, dirname(node.path))
        }
        onClick={() => {
          setSelected(node.path);
          if (node.type === 'directory') {
            setExpanded((current) => ({ ...current, [node.path]: !isOpen }));
          } else {
            store().openFile(node.path);
          }
        }}
        style={{ paddingLeft: indent }}
        className={cn(
          'group relative flex h-7 cursor-pointer select-none items-center gap-1.5 pr-2 outline-none',
          'text-secondary font-light transition-colors duration-[--duration-fast] ease-[--ease-standard]',
          // The open file stays marked even when the explorer has no focus.
          isOpenFile ? 'bg-surface-active text-foreground' : 'text-foreground-secondary',
          !isOpenFile && 'hover:bg-surface-hover hover:text-foreground',
          isSelected && !isOpenFile && 'bg-surface-hover text-foreground',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
          dragOver === node.path && 'bg-surface-active ring-1 ring-inset ring-border-strong',
        )}
      >
        {isOpenFile && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />}

        {node.type === 'directory' ? (
          isOpen ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )
        ) : (
          <FileIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}

        {renaming === node.path ? (
          <InlineInput
            initial={node.name}
            onSubmit={(value) => submitRename(node.path, value)}
            onCancel={() => setRenaming(null)}
          />
        ) : (
          <span className="truncate">{node.name}</span>
        )}
      </div>
    );

    return (
      <div key={node.path} role="group">
        <ContextMenu>
          <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
          <ContextMenuContent>
            {node.type === 'directory' ? (
              <>
                <ContextMenuItem onSelect={() => beginCreate(node.path, 'file')}>
                  <FilePlus /> New file
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => beginCreate(node.path, 'directory')}>
                  <FolderPlus /> New folder
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => {
                    uploadTarget.current = node.path;
                    uploadInput.current?.click();
                  }}
                >
                  <Upload /> Upload files
                </ContextMenuItem>
              </>
            ) : (
              <>
                <ContextMenuItem onSelect={() => store().openFile(node.path)}>
                  <FileIcon /> Open
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => {
                    const file = store().files[node.path];
                    if (file?.type === 'file') downloadFile(node.path, file.content, file.encoding);
                  }}
                >
                  <Download /> Download
                </ContextMenuItem>
                <ContextMenuItem
                  onSelect={() => {
                    void navigator.clipboard.writeText(node.path);
                    toast.success('Path copied');
                  }}
                >
                  <Link2 /> Copy path
                </ContextMenuItem>
              </>
            )}

            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => setTimeout(() => setRenaming(node.path), 0)}>
              <Pencil /> Rename
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => store().duplicateNode(node.path)}>
              <Copy /> Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem destructive onSelect={() => requestDelete(node.path)}>
              <Trash2 /> Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {node.type === 'directory' && isOpen && (
          <>
            {node.children?.map((child) => renderNode(child, depth + 1))}
            {draft?.parent === node.path && (
              <DraftRow
                depth={depth + 1}
                type={draft.type}
                onSubmit={submitDraft}
                onCancel={() => setDraft(null)}
              />
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role="tree"
            aria-label="Project files"
            className="flex h-full flex-col overflow-y-auto py-1"
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver('');
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(event) => handleDrop(event, '')}
          >
            {tree.map((node) => renderNode(node, 0))}

            {draft?.parent === '' && (
              <DraftRow
                depth={0}
                type={draft.type}
                onSubmit={submitDraft}
                onCancel={() => setDraft(null)}
              />
            )}

            <div className="min-h-8 flex-1" />

            <input
              ref={uploadInput}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (!event.target.files) return;
                const parent = uploadTarget.current;
                void importFromFiles(event.target.files).then((result) =>
                  mergeImported(result.files, parent, result.warnings),
                );
              }}
            />
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onSelect={() => beginCreate('', 'file')}>
            <FilePlus /> New file
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => beginCreate('', 'directory')}>
            <FolderPlus /> New folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() => {
              uploadTarget.current = '';
              uploadInput.current?.click();
            }}
          >
            <Upload /> Import files
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={pendingDelete !== null} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete this folder?</AlertDialogTitle>
          <AlertDialogDescription>
            “{pendingDelete ? basename(pendingDelete.path) : ''}” contains {pendingDelete?.count}{' '}
            {pendingDelete?.count === 1 ? 'item' : 'items'}. They will all be removed from the
            project. This cannot be undone.
          </AlertDialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button variant="ghost">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="danger"
                onClick={() => {
                  if (pendingDelete) store().deleteNode(pendingDelete.path);
                }}
              >
                Delete folder
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DraftRow({
  depth,
  type,
  onSubmit,
  onCancel,
}: {
  depth: number;
  type: 'file' | 'directory';
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{ paddingLeft: 8 + depth * 12 }}
      className="flex h-7 items-center gap-1.5 pr-2 text-secondary"
    >
      {type === 'directory' ? (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : (
        <FileIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <InlineInput initial="" onSubmit={onSubmit} onCancel={onCancel} />
    </div>
  );
}

function InlineInput({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const dot = initial.lastIndexOf('.');
    ref.current?.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);

  return (
    <input
      ref={ref}
      value={value}
      aria-label={initial ? `Rename ${initial}` : 'Name'}
      onChange={(event) => setValue(event.target.value)}
      onClick={(event) => event.stopPropagation()}
      onBlur={() => onSubmit(value)}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Enter') onSubmit(value);
        if (event.key === 'Escape') onCancel();
      }}
      className={cn(
        'h-5 w-full min-w-0 rounded-sm border border-border-strong bg-surface px-1',
        'text-secondary font-light text-foreground outline-none',
        'focus-visible:outline-1 focus-visible:outline-focus-ring',
      )}
    />
  );
}
