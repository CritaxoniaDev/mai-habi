import { basename, dirname } from '@mai-habi/filesystem';
import { toast } from '@mai-habi/ui';
import { useUi } from '../state/ui';
import { useWorkspace } from '../state/workspace';

/** Shared validation so the explorer, the header and the palette all agree. */
export function validateNodePath(path: string): string | null {
  const trimmed = path.trim();

  if (!trimmed) return 'Enter a name.';
  if (trimmed.startsWith('/')) return 'Paths are relative to the project root — drop the leading "/".';
  if (trimmed.includes('..')) return 'Paths cannot contain "..".';
  if (/[\\:*?"<>|]/.test(trimmed)) return 'Names cannot contain \\ : * ? " < > or |';
  if (useWorkspace.getState().files[trimmed]) return `"${basename(trimmed)}" already exists.`;

  return null;
}

export function promptNewFile(): void {
  useUi.getState().requestInput({
    title: 'New file',
    label: 'File name',
    placeholder: 'src/components/Button.tsx',
    hint: 'Include a folder to create one, for example src/utils/format.ts',
    confirmLabel: 'Create file',
    validate: validateNodePath,
    onSubmit: (path) => {
      try {
        useWorkspace.getState().createFile(path);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not create that file.');
      }
    },
  });
}

export function promptNewFolder(): void {
  useUi.getState().requestInput({
    title: 'New folder',
    label: 'Folder name',
    placeholder: 'src/components',
    confirmLabel: 'Create folder',
    validate: validateNodePath,
    onSubmit: (path) => {
      try {
        useWorkspace.getState().createFolder(path);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not create that folder.');
      }
    },
  });
}

export function promptRenameProject(): void {
  const project = useWorkspace.getState().project;
  if (!project) return;

  useUi.getState().requestInput({
    title: 'Rename project',
    label: 'Project name',
    initialValue: project.name,
    confirmLabel: 'Rename',
    validate: (value) => (value.trim() ? null : 'Enter a project name.'),
    onSubmit: (name) => useWorkspace.getState().renameProject(name),
  });
}

export { dirname };
