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
  X,
} from 'lucide-react';
import { useWorkspace } from '../../state/workspace';
import { FileTypeIcon } from '../../lib/file-icons';

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
  const newNodeRequest = useWorkspace((state) => state.newNodeRequest);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ src: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEntry | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ path: string; count: number } | null>(null);

  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<string>('');

  /**
   * Opens the file picker for a folder.
   *
   * Deferred by a tick because Radix restores focus while the context menu
   * closes, and a click dispatched inside that cycle never reaches the input —
   * the dialog simply never appears.
   */
  const openUpload = (parent: string) => {
    uploadTarget.current = parent;
    setTimeout(() => uploadInput.current?.click(), 0);
  };

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

  /** Returns false to keep the row open when the name cannot be used. */
  const submitDraft = (name: string): boolean => {
    const entry = draft;
    if (!entry) return true;

    const error = validateName(name, siblingsOf(entry.parent));
    if (error) {
      toast.error(error);
      return false;
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

    return true;
  };

  const submitRename = (path: string, name: string): boolean => {
    if (name.trim() === basename(path)) {
      setRenaming(null);
      return true;
    }

    const error = validateName(name, siblingsOf(dirname(path), path));
    if (error) {
      toast.error(error);
      return false;
    }

    setRenaming(null);
    try {
      store().renameNode(path, name.trim());
      setSelected(joinPath(dirname(path), name.trim()));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not rename that.');
    }

    return true;
  };

  const beginCreate = (parent: string, type: 'file' | 'directory') => {
    if (parent) setExpanded((current) => ({ ...current, [parent]: true }));
    setDraft({ parent, type });
  };

  /*
   * Where a new node belongs, given what is selected: inside a selected folder,
   * beside a selected file, otherwise at the root. This is the rule the context
   * menu already follows, applied to requests arriving from elsewhere.
   */
  const draftParentForSelection = (): string => {
    if (!selected) return '';

    const node = store().files[selected];
    if (!node) return '';

    return node.type === 'directory' ? selected : dirname(selected);
  };

  useEffect(() => {
    if (!newNodeRequest) return;

    beginCreate(draftParentForSelection(), newNodeRequest.type);
    store().consumeNewNodeRequest();
    // Re-runs per request: the token changes even when the type repeats.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newNodeRequest]);

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

    void importFromDataTransfer(event.dataTransfer, { stripRoot: false })
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

  const renderNode = (node: TreeNode, ancestors: boolean[], isLast: boolean) => {
    const isOpen = expanded[node.path] ?? false;
    const isOpenFile = activeTab === node.path;
    const isSelected = selected === node.path;
    const depth = ancestors.length;

    // A draft row is appended after the real children, so it takes the elbow.
    const hasDraft = draft?.parent === node.path;
    const children = node.children ?? [];

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
          // Both kinds accept a drop; a file stands in for its own folder.
          event.preventDefault();
          // The container behind also handles dragover, and would otherwise
          // win and highlight the project root instead of this row.
          event.stopPropagation();
          setDragOver(node.type === 'directory' ? node.path : dirname(node.path));
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
        className={cn(
          'group relative flex h-7 cursor-pointer select-none items-center gap-1 pl-1.5 pr-2 outline-none',
          'text-secondary font-light transition-colors duration-[--duration-fast] ease-[--ease-standard]',
          // The open file stays marked even when the explorer has no focus.
          isOpenFile ? 'bg-surface-active text-foreground' : 'text-foreground-secondary',
          !isOpenFile && 'hover:bg-surface-hover hover:text-foreground',
          isSelected && !isOpenFile && 'bg-surface-hover text-foreground',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
          dragOver !== null &&
            dragOver === (node.type === 'directory' ? node.path : dirname(node.path)) &&
            'bg-surface-active ring-1 ring-inset ring-border-strong',
        )}
      >
        {isOpenFile && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />}

        <TreeGuide ancestors={ancestors} isLast={isLast} />

        {node.type === 'directory' ? (
          isOpen ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )
        ) : (
          <FileTypeIcon path={node.path} className="size-3.5" />
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
                <ContextMenuItem onSelect={() => openUpload(node.path)}>
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
            {children.map((child, index) =>
              // A continuation line is drawn for this level only while more
              // siblings follow; the last child leaves the column blank.
              renderNode(child, [...ancestors, !isLast], !hasDraft && index === children.length - 1),
            )}
            {hasDraft && draft && (
              <DraftRow
                ancestors={[...ancestors, !isLast]}
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
            {tree.map((node, index) =>
              renderNode(node, [], draft?.parent !== '' && index === tree.length - 1),
            )}

            {draft?.parent === '' && (
              <DraftRow
                ancestors={[]}
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
                const picked = event.target;
                if (!picked.files?.length) return;

                const parent = uploadTarget.current;

                void importFromFiles(picked.files, { stripRoot: false })
                  .then((result) => mergeImported(result.files, parent, result.warnings))
                  .catch((cause) => toast.error('Upload failed', { description: String(cause) }))
                  // Without this the same file cannot be picked twice: the value
                  // is unchanged, so the browser fires no second change event.
                  .finally(() => {
                    picked.value = '';
                  });
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
          <ContextMenuItem onSelect={() => openUpload('')}>
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

/**
 * The connector drawn to the left of every row.
 *
 * `ancestors[i]` is true when the folder at that depth still has siblings
 * below it, which is what decides between a continuation line and blank space.
 *
 * Drawn with pseudo-elements rather than box-drawing glyphs. A character is
 * sized by the font, so the vertical strokes only met up when the glyph's line
 * box happened to match the row height — at other zoom levels they broke into
 * dashes, and their width drifted with the monospace metrics. These segments
 * are `self-stretch`, so each spans exactly one row and the line is continuous
 * down the tree at any size.
 *
 * Purely decorative: the tree itself carries `aria-level`, so this stays hidden
 * from assistive technology rather than being read out as punctuation.
 */
function TreeGuide({ ancestors, isLast }: { ancestors: boolean[]; isLast: boolean }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 self-stretch">
      {ancestors.map((hasMore, depth) => (
        <span
          key={depth}
          className={cn(
            'relative w-3',
            // A line continues past this row only while that ancestor has more below it.
            hasMore &&
              "before:absolute before:inset-y-0 before:left-1/2 before:w-px before:bg-border-strong before:content-['']",
          )}
        />
      ))}

      <span
        className={cn(
          'relative w-3',
          // The elbow: down from the top, then out to the right at mid-row.
          "before:absolute before:left-1/2 before:top-0 before:w-px before:bg-border-strong before:content-['']",
          // A last child stops at the turn; a middle one carries on to the next row.
          isLast ? 'before:h-1/2' : 'before:bottom-0',
          "after:absolute after:left-1/2 after:top-1/2 after:h-px after:w-1/2 after:bg-border-strong after:content-['']",
        )}
      />
    </span>
  );
}

function DraftRow({
  ancestors,
  type,
  onSubmit,
  onCancel,
}: {
  ancestors: boolean[];
  type: 'file' | 'directory';
  onSubmit: (name: string) => boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex h-7 items-center gap-1 pl-1.5 pr-2 text-secondary">
      <TreeGuide ancestors={ancestors} isLast />

      {type === 'directory' ? (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      ) : (
        <FileIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <InlineInput
        initial=""
        placeholder={type === 'directory' ? 'folder name' : 'file name'}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    </div>
  );
}

/**
 * The name field used for both creating and renaming.
 *
 * Three ways out, because a half-typed name should never trap anyone:
 * Escape, the cancel button, or clicking away without having typed anything.
 * Clicking away *with* a name commits it, which is what an inline field in a
 * file tree is expected to do.
 */
function InlineInput({
  initial,
  placeholder,
  onSubmit,
  onCancel,
}: {
  initial: string;
  placeholder?: string;
  /** Returns false when the name was rejected and the field should stay open. */
  onSubmit: (value: string) => boolean;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  /* Enter and blur can both fire for one interaction; only the first counts. */
  const settled = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    const dot = initial.lastIndexOf('.');
    ref.current?.setSelectionRange(0, dot > 0 ? dot : initial.length);
  }, [initial]);

  const cancel = () => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
  };

  const submit = (viaBlur = false) => {
    if (settled.current) return;
    settled.current = true;

    if (onSubmit(value)) return;

    // Rejected. Pressing Enter means "I am done", so stay put and let them fix
    // it; clicking away means "I have moved on", so discard rather than drag
    // focus back into a field they deliberately left. Either way the reason was
    // already reported.
    if (viaBlur) {
      onCancel();
      return;
    }

    settled.current = false;
    ref.current?.focus();
  };

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <input
        ref={ref}
        value={value}
        placeholder={placeholder}
        aria-label={initial ? `Rename ${initial}` : 'Name'}
        title="Enter to confirm, Escape to cancel"
        onChange={(event) => setValue(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onBlur={() => {
          // Nothing typed, or nothing changed: treat leaving as a cancel.
          if (!value.trim() || value === initial) cancel();
          else submit(true);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
        className={cn(
          'h-7 w-full min-w-0 rounded-sm border border-border-strong bg-surface px-1',
          'text-secondary font-light text-foreground outline-none',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-1 focus-visible:outline-focus-ring',
        )}
      />

      <button
        type="button"
        aria-label="Cancel"
        title="Cancel (Esc)"
        // Taking focus first would fire blur, which would commit the name.
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          cancel();
        }}
        className={cn(
          'grid size-4 shrink-0 place-items-center rounded-sm text-muted-foreground outline-none',
          'transition-colors duration-[--duration-fast] hover:bg-surface-active hover:text-foreground',
          'focus-visible:outline-1 focus-visible:outline-focus-ring',
        )}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}
