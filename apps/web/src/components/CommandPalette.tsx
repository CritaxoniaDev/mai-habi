import { useMemo } from 'react';
import { basename, downloadProject, listFiles } from '@mai-habi/filesystem';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  THEME_LABELS,
  THEME_MODES,
  setThemeMode,
} from '@mai-habi/ui';
import {
  Compass,
  Download,
  FilePlus,
  FolderPlus,
  Monitor,
  Moon,
  PanelBottom,
  PanelLeft,
  Play,
  RotateCw,
  Settings,
  Share2,
  Sun,
  Type,
  Webhook,
  Wind,
} from 'lucide-react';
import { useUi } from '../state/ui';
import { useWorkspace } from '../state/workspace';
import { openViewer, recompile } from '../lib/run';
import { startProductTour } from '../lib/tour';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function CommandPalette() {
  const mode = useUi((state) => state.palette);
  const setPalette = useUi((state) => state.setPalette);
  const files = useWorkspace((state) => state.files);
  const tailwind = useWorkspace((state) => state.project?.settings.tailwind ?? false);

  const paths = useMemo(() => listFiles(files).map((file) => file.path), [files]);

  const close = () => setPalette(null);
  const runAnd = (action: () => void) => () => {
    close();
    action();
  };

  return (
    <CommandDialog open={mode !== null} onOpenChange={(open) => setPalette(open ? mode : null)}>
      <CommandInput placeholder={mode === 'files' ? 'Go to file…' : 'Type a command…'} autoFocus />
      <CommandList>
        <CommandEmpty>Nothing matches that.</CommandEmpty>

        {mode === 'commands' && (
          <>
            <CommandGroup heading="Project">
              <CommandItem onSelect={runAnd(openViewer)}>
                <Play /> Open viewer
                <CommandShortcut>⌘↵</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={runAnd(recompile)}>
                <RotateCw /> Rebuild
                <CommandShortcut>⌘R</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={runAnd(() => useUi.getState().setDialog('share'))}>
                <Share2 /> Share project
              </CommandItem>
              <CommandItem
                onSelect={runAnd(() => {
                  const { project, files: current } = useWorkspace.getState();
                  if (project) void downloadProject(current, project.name);
                })}
              >
                <Download /> Export as ZIP
              </CommandItem>
              <CommandItem
                onSelect={runAnd(() =>
                  useWorkspace.getState().updateSettings({ tailwind: !tailwind }),
                )}
              >
                <Wind /> {tailwind ? 'Disable Tailwind CSS' : 'Enable Tailwind CSS'}
              </CommandItem>
              <CommandItem onSelect={runAnd(() => useUi.getState().setDialog('fonts'))}>
                <Type /> Fonts…
              </CommandItem>
              <CommandItem
                onSelect={runAnd(() => {
                  window.location.href = '/rest';
                })}
              >
                <Webhook /> REST client
              </CommandItem>
              <CommandItem onSelect={runAnd(() => useUi.getState().setDialog('settings'))}>
                <Settings /> Project settings
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Files">
              <CommandItem
                onSelect={runAnd(() => useWorkspace.getState().requestNewNode('file'))}
              >
                <FilePlus /> New file
              </CommandItem>
              <CommandItem
                onSelect={runAnd(() => useWorkspace.getState().requestNewNode('directory'))}
              >
                <FolderPlus /> New folder
              </CommandItem>
              <CommandItem onSelect={() => setPalette('files')}>
                <FilePlus /> Quick open
                <CommandShortcut>⌘P</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Appearance">
              {THEME_MODES.map((option) => {
                const Icon = THEME_ICONS[option];
                return (
                  <CommandItem key={option} onSelect={runAnd(() => setThemeMode(option))}>
                    <Icon /> Appearance: {THEME_LABELS[option]}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandGroup heading="View">
              <CommandItem onSelect={runAnd(() => useWorkspace.getState().toggleExplorer())}>
                <PanelLeft /> Toggle files
                <CommandShortcut>⌘B</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={runAnd(() => useWorkspace.getState().togglePanel('console'))}>
                <PanelBottom /> Toggle console
                <CommandShortcut>⌘`</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={runAnd(() => useWorkspace.getState().setBottomTab('preview'))}>
                <PanelBottom /> Show preview panel
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Help">
              <CommandItem onSelect={runAnd(startProductTour)}>
                <Compass /> Take a tour
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {mode === 'files' && (
          <CommandGroup heading="Files">
            {paths.map((path) => (
              <CommandItem
                key={path}
                value={path}
                onSelect={runAnd(() => useWorkspace.getState().openFile(path))}
              >
                <span className="text-foreground">{basename(path)}</span>
                <span className="ml-auto truncate font-mono text-micro text-muted-foreground">
                  {path}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
