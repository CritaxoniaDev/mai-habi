import { useRef, useState } from 'react';
import type { FileMap, TemplateId } from '@mai-habi/types';
import { TEMPLATES } from '@mai-habi/shared';
import { importFromDataTransfer, importFromFiles, importFromZip } from '@mai-habi/filesystem';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  cn,
  toast,
} from '@mai-habi/ui';
import { FolderUp, Upload } from 'lucide-react';
import { createAndOpen, importAndOpen } from '../../lib/project-actions';

type Choice = TemplateId | 'import';

const TEMPLATE_CHOICES: Array<{ id: Choice; name: string; description: string }> = [
  ...TEMPLATES.map((template) => ({
    id: template.id as Choice,
    name: template.name,
    description: template.description,
  })),
  {
    id: 'import',
    name: 'Import existing project',
    description: 'Bring in files, a folder or a ZIP archive.',
  },
];

export interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProjectDialog({ open, onOpenChange }: NewProjectDialogProps) {
  const [name, setName] = useState('Untitled Project');
  const [nameError, setNameError] = useState<string | null>(null);
  const [choice, setChoice] = useState<Choice>('react-ts');
  const [busy, setBusy] = useState(false);
  const [dropActive, setDropActive] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);

  const validate = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Enter a project name.');
      return false;
    }
    if (trimmed.includes('/')) {
      setNameError('Project names cannot contain "/".');
      return false;
    }
    if (trimmed.length > 80) {
      setNameError('Keep the name under 80 characters.');
      return false;
    }
    setNameError(null);
    return true;
  };

  const finish = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      toast.error('That did not work', {
        description: error instanceof Error ? error.message : String(error),
      });
      setBusy(false);
    }
  };

  const create = () => {
    if (!validate()) return;

    if (choice === 'import') {
      fileInput.current?.click();
      return;
    }
    void finish(() => createAndOpen(name, choice));
  };

  const receive = (result: { files: FileMap; warnings: string[] }) => {
    if (Object.keys(result.files).length === 0) {
      toast.error('Nothing to import', { description: 'No supported files were found.' });
      return;
    }
    for (const warning of result.warnings) toast.warning(warning);
    void finish(() => importAndOpen(name, result.files));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Everything is stored in this browser until you choose to sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Field id="project-name" label="Project name" error={nameError}>
            {(field) => (
              <Input
                {...field}
                value={name}
                autoFocus
                placeholder="Untitled Project"
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) setNameError(null);
                }}
                onKeyDown={(event) => event.key === 'Enter' && create()}
              />
            )}
          </Field>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-secondary font-normal text-foreground">Template</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATE_CHOICES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  role="radio"
                  aria-checked={choice === template.id}
                  onClick={() => setChoice(template.id)}
                  className={cn(
                    'rounded-md border px-3.5 py-3 text-left outline-none',
                    'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                    choice === template.id
                      ? 'border-border-strong bg-surface-secondary'
                      : 'border-border hover:border-border-strong hover:bg-surface-hover',
                  )}
                >
                  <span className="block text-secondary font-normal text-foreground">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block text-label font-light text-muted-foreground">
                    {template.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          {choice === 'import' && (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDropActive(true);
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDropActive(false);
                void importFromDataTransfer(event.dataTransfer)
                  .then(receive)
                  .catch((error) => toast.error('Import failed', { description: String(error) }));
              }}
              className={cn(
                'rounded-lg border border-dashed px-4 py-6 text-center',
                'transition-colors duration-[--duration-fast]',
                dropActive ? 'border-border-strong bg-surface-secondary' : 'border-border',
              )}
            >
              <p className="text-secondary font-light text-muted-foreground">
                Drop files, a folder or a ZIP archive here
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                  <Upload /> Files
                </Button>
                <Button size="sm" variant="outline" onClick={() => folderInput.current?.click()}>
                  <FolderUp /> Folder
                </Button>
                <Button size="sm" variant="outline" onClick={() => zipInput.current?.click()}>
                  ZIP archive
                </Button>
              </div>
              <p className="mt-3 text-micro font-light text-muted-foreground">
                node_modules, .git and build folders are skipped. Dependencies are restored with npm
                install.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="default" onClick={create} loading={busy}>
            {choice === 'import' ? 'Choose files' : 'Create project'}
          </Button>
        </DialogFooter>

        <input
          ref={fileInput}
          type="file"
          multiple
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) =>
            event.target.files && void importFromFiles(event.target.files).then(receive)
          }
        />
        <input
          ref={folderInput}
          type="file"
          multiple
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          /* @ts-expect-error non-standard but supported by every target browser */
          webkitdirectory=""
          directory=""
          onChange={(event) =>
            event.target.files && void importFromFiles(event.target.files).then(receive)
          }
        />
        <input
          ref={zipInput}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void file
              .arrayBuffer()
              .then(importFromZip)
              .then(receive)
              .catch((error) => toast.error('Import failed', { description: String(error) }));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
