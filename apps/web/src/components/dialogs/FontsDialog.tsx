import { useEffect, useMemo, useState } from 'react';
import type { FontConfig } from '@mai-habi/types';
import { googleFontsHref } from '@mai-habi/compiler';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  cn,
  toast,
} from '@mai-habi/ui';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useUi } from '../../state/ui';
import { useWorkspace } from '../../state/workspace';
import {
  CUSTOM_WEIGHTS,
  FONT_CATEGORY_LABEL,
  GOOGLE_FONTS,
  findCatalogFont,
  makeFontConfig,
} from '../../lib/google-fonts';

/** Stable empty reference: a fresh [] in the selector would churn re-renders. */
const NO_FONTS: FontConfig[] = [];
const PREVIEW_TEXT = 'The quick brown fox jumps over the lazy dog';

/**
 * Adds Google Fonts to the active project.
 *
 * Choices are stored in project settings and injected into the preview by the
 * compiler, so nothing here touches the file tree. The dialog loads the fonts
 * into the editor document too, purely so the list and previews render in the
 * real typeface.
 */
export function FontsDialog() {
  const open = useUi((state) => state.dialog === 'fonts');
  const setDialog = useUi((state) => state.setDialog);
  const project = useWorkspace((state) => state.project);
  const storedFonts = useWorkspace((state) => state.project?.settings.fonts);
  const fonts = storedFonts ?? NO_FONTS;

  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');

  const selected = useMemo(
    () => new Set(fonts.map((font) => font.family.toLowerCase())),
    [fonts],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? GOOGLE_FONTS.filter((font) => font.family.toLowerCase().includes(needle))
      : GOOGLE_FONTS;
    return matches.slice(0, 60);
  }, [query]);

  /*
   * The editor document is not sandboxed, so the chosen fonts and the visible
   * shelf can be loaded straight into it — that is what lets each name below
   * render in its own typeface. Torn down when the dialog closes.
   */
  useEffect(() => {
    if (!open) return;

    const previewFonts: FontConfig[] = [
      ...fonts,
      ...results
        .filter((font) => !selected.has(font.family.toLowerCase()))
        .map((font) => ({ family: font.family, weights: [400], italic: false, defaultBody: false })),
    ];

    const href = googleFontsHref(previewFonts);
    if (!href) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [open, results, fonts, selected]);

  if (!project) return null;

  const commit = (next: FontConfig[]) => useWorkspace.getState().updateSettings({ fonts: next });

  const add = (family: string) => {
    const name = family.trim();
    if (!name) return;
    if (selected.has(name.toLowerCase())) {
      toast(`"${name}" is already added.`);
      return;
    }
    commit([...fonts, makeFontConfig(name)]);
  };

  const remove = (family: string) => commit(fonts.filter((font) => font.family !== family));

  const patch = (family: string, change: Partial<FontConfig>) =>
    commit(fonts.map((font) => (font.family === family ? { ...font, ...change } : font)));

  const toggleWeight = (font: FontConfig, weight: number) => {
    const next = font.weights.includes(weight)
      ? font.weights.filter((value) => value !== weight)
      : [...font.weights, weight].sort((a, b) => a - b);
    if (next.length === 0) return; // A font must keep at least one weight.
    patch(font.family, { weights: next });
  };

  // Only one font can be the document default, so the rest are cleared.
  const setDefault = (family: string, on: boolean) =>
    commit(fonts.map((font) => ({ ...font, defaultBody: on && font.family === family })));

  const addCustom = () => {
    add(custom);
    setCustom('');
  };

  return (
    <Dialog open={open} onOpenChange={(next) => setDialog(next ? 'fonts' : null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Fonts</DialogTitle>
          <DialogDescription>
            Add fonts from Google Fonts. They load into the preview automatically — set one as the
            default, or reference its family name in your CSS.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[62vh] space-y-5 overflow-y-auto pr-1">
          {fonts.length > 0 && (
            <section className="space-y-2.5">
              <p className="text-micro font-normal uppercase tracking-[0.08em] text-muted-foreground">
                In this project
              </p>
              <ul className="space-y-2.5">
                {fonts.map((font) => {
                  const weightOptions = findCatalogFont(font.family)?.weights ?? CUSTOM_WEIGHTS;
                  return (
                    <li
                      key={font.family}
                      className="rounded-lg border border-border bg-surface p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="truncate text-body text-foreground"
                            style={{ fontFamily: `"${font.family}", sans-serif` }}
                          >
                            {font.family}
                          </p>
                          <p
                            className="mt-1 truncate text-secondary font-light text-muted-foreground"
                            style={{
                              fontFamily: `"${font.family}", sans-serif`,
                              fontWeight: font.weights[0] ?? 400,
                              fontStyle: font.italic ? 'italic' : 'normal',
                            }}
                          >
                            {PREVIEW_TEXT}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${font.family}`}
                          onClick={() => remove(font.family)}
                        >
                          <Trash2 />
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {weightOptions.map((weight) => {
                          const active = font.weights.includes(weight);
                          return (
                            <button
                              key={weight}
                              type="button"
                              aria-pressed={active}
                              onClick={() => toggleWeight(font, weight)}
                              className={cn(
                                'rounded-full border px-2.5 py-0.5 text-micro font-light outline-none',
                                'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
                                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
                                active
                                  ? 'border-border-strong bg-surface-secondary text-foreground'
                                  : 'border-border text-muted-foreground hover:bg-surface-hover',
                              )}
                            >
                              {weight}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={font.italic}
                            onCheckedChange={(checked) => patch(font.family, { italic: checked })}
                          />
                          <span className="text-label font-light text-foreground-secondary">
                            Italic
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <Switch
                            checked={font.defaultBody}
                            onCheckedChange={(checked) => setDefault(font.family, checked)}
                          />
                          <span className="text-label font-light text-foreground-secondary">
                            Default font
                          </span>
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-2.5">
            <Input
              placeholder="Search Google Fonts…"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {results.map((font) => {
                const added = selected.has(font.family.toLowerCase());
                return (
                  <li key={font.family}>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => add(font.family)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left outline-none',
                        'transition-colors duration-[--duration-fast] ease-[--ease-standard]',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                        added
                          ? 'cursor-default border-border bg-surface-secondary'
                          : 'border-border hover:border-border-strong hover:bg-surface-hover',
                      )}
                    >
                      <span className="min-w-0">
                        <span
                          className="block truncate text-secondary text-foreground"
                          style={{ fontFamily: `"${font.family}", sans-serif` }}
                        >
                          {font.family}
                        </span>
                        <span className="block text-micro font-light text-muted-foreground">
                          {FONT_CATEGORY_LABEL[font.category]}
                        </span>
                      </span>
                      {added ? (
                        <Check className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <Plus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {results.length === 0 && (
              <p className="text-label font-light text-muted-foreground">
                Nothing on the shelf matches — add it by name below.
              </p>
            )}
          </section>

          <section className="space-y-1.5">
            <Label htmlFor="font-custom">Add any Google font by name</Label>
            <div className="flex gap-2">
              <Input
                id="font-custom"
                placeholder="e.g. Instrument Serif"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addCustom()}
              />
              <Button variant="outline" onClick={addCustom} disabled={!custom.trim()}>
                <Plus /> Add
              </Button>
            </div>
            <p className="text-micro font-light text-muted-foreground">
              Spelled exactly as Google Fonts lists it. Not every weight exists for every family.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
