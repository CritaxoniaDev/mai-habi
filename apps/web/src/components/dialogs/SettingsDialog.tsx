import { PUBLIC_PACKAGES } from '@mai-habi/compiler';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Label,
  Separator,
  Switch,
  ThemeRadioGroup,
  cn,
} from '@mai-habi/ui';
import { useUi } from '../../state/ui';
import { useWorkspace } from '../../state/workspace';

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </h3>
  );
}

export function SettingsDialog() {
  const open = useUi((state) => state.dialog === 'settings');
  const setDialog = useUi((state) => state.setDialog);
  const project = useWorkspace((state) => state.project);
  const files = useWorkspace((state) => state.files);

  if (!project) return null;

  const settings = project.settings;
  const update = useWorkspace.getState().updateSettings;
  const entryMissing = !files[settings.entryFile];
  const fontCount = (settings.fonts ?? []).length;

  return (
    <Dialog open={open} onOpenChange={(next) => setDialog(next ? 'settings' : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Project settings</DialogTitle>
          <DialogDescription>
            Sensible defaults are detected. Change these only if they do not fit.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-6 overflow-y-auto pr-1">
          <section className="space-y-3">
            <SectionHeading>Appearance</SectionHeading>
            <ThemeRadioGroup />
            <p className="text-label font-light text-muted-foreground">
              System follows your operating system and changes with it. This preference is stored in
              this browser and applies to the editor, not to your project.
            </p>
          </section>

          <Separator />

          <section className="space-y-3">
            <SectionHeading>Styling</SectionHeading>

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <Label htmlFor="setting-tailwind">Tailwind CSS</Label>
                <p className="mt-1 text-label font-light text-muted-foreground">
                  Loads Tailwind's browser build into the preview. Plain CSS keeps working either
                  way, and nothing is downloaded while this is off.
                </p>
              </div>
              <Switch
                id="setting-tailwind"
                checked={settings.tailwind}
                onCheckedChange={(checked) => update({ tailwind: checked })}
              />
            </div>

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <Label>Fonts</Label>
                <p className="mt-1 text-label font-light text-muted-foreground">
                  {fontCount === 0
                    ? 'Add fonts from Google Fonts and use them in your CSS. None are loaded yet.'
                    : `${fontCount} font${fontCount === 1 ? '' : 's'} loaded into the preview.`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setDialog('fonts')}
              >
                Choose fonts…
              </Button>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <SectionHeading>General</SectionHeading>

            <Field id="setting-name" label="Project name">
              {(field) => (
                <Input
                  {...field}
                  defaultValue={project.name}
                  onBlur={(event) => useWorkspace.getState().renameProject(event.target.value)}
                />
              )}
            </Field>

            <Field
              id="setting-entry"
              label="Entry file"
              hint="The module the compiler starts from. Leave it if you are unsure — one is generated when it is missing."
              error={entryMissing ? `"${settings.entryFile}" does not exist in this project.` : null}
            >
              {(field) => (
                <Input
                  {...field}
                  defaultValue={settings.entryFile}
                  onBlur={(event) => update({ entryFile: event.target.value.trim() })}
                />
              )}
            </Field>

            <div className="flex items-center justify-between">
              <Label htmlFor="setting-autocompile">Compile as I type</Label>
              <Switch
                id="setting-autocompile"
                checked={settings.autoCompile}
                onCheckedChange={(checked) => update({ autoCompile: checked })}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <SectionHeading>Viewer</SectionHeading>

            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <Label htmlFor="setting-viewer-toolbar">Viewer toolbar</Label>
                <p className="mt-1 text-label font-light text-muted-foreground">
                  Shows the hover-to-reveal toolbar when you open the viewer yourself. A shared link
                  never shows it — whoever opens it sees only your app.
                </p>
              </div>
              <Switch
                id="setting-viewer-toolbar"
                checked={settings.viewerToolbar ?? true}
                onCheckedChange={(checked) => update({ viewerToolbar: checked })}
              />
            </div>
          </section>

          <Separator />

          <section className="space-y-4">
            <SectionHeading>Editor</SectionHeading>

            <Field id="setting-tab-size" label="Tab size">
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  max={8}
                  defaultValue={settings.tabSize}
                  onBlur={(event) => update({ tabSize: Number(event.target.value) || 2 })}
                />
              )}
            </Field>

            <div className="flex items-center justify-between">
              <Label htmlFor="setting-wrap">Word wrap</Label>
              <Switch
                id="setting-wrap"
                checked={settings.wordWrap}
                onCheckedChange={(checked) => update({ wordWrap: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="setting-minimap">Minimap</Label>
              <Switch
                id="setting-minimap"
                checked={settings.minimap}
                onCheckedChange={(checked) => update({ minimap: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="setting-autosave">Autosave</Label>
              <Switch
                id="setting-autosave"
                checked={settings.autosave}
                onCheckedChange={(checked) => update({ autosave: checked })}
              />
            </div>
          </section>

          <Separator />

          <section className={cn('space-y-2')}>
            <SectionHeading>Packages</SectionHeading>
            <p className="text-label font-light text-muted-foreground">
              These are provided by the platform — import them without installing anything. Each is
              downloaded only when a project actually uses it.
            </p>

            <ul className="flex flex-wrap gap-1.5 pt-1">
              {PUBLIC_PACKAGES.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-border px-2 py-0.5 font-mono text-micro font-light text-foreground-secondary"
                >
                  {name}
                </li>
              ))}
            </ul>

            <p className="text-label font-light text-muted-foreground">
              There is no npm registry here, so anything else is reported as a compile error rather
              than failing at runtime.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
