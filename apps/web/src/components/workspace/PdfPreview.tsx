import type { ProjectFile } from '@mai-habi/types';
import { useObjectUrl } from '../../lib/use-object-url';

export interface PdfPreviewProps {
  path: string;
  file: ProjectFile;
}

/**
 * The browser's own PDF viewer, pointed at a blob URL.
 *
 * Every target browser ships a complete viewer — pages, zoom, search, print,
 * text selection — and handing it the file is both better and smaller than
 * bundling a renderer. It also stays correct as the platform improves.
 *
 * An `<iframe>` rather than `<embed>`/`<object>`: the app's CSP sets
 * `object-src 'none'` (see proxy.ts), which blocks both of those outright.
 * Frames are unrestricted, and a blob URL carries an opaque origin anyway.
 */
export function PdfPreview({ path, file }: PdfPreviewProps) {
  const url = useObjectUrl(file, path);

  if (!url) {
    return (
      <div className="grid h-full place-items-center bg-background p-8 text-center">
        <p className="text-secondary font-light text-muted-foreground">
          This file could not be read as a PDF.
        </p>
      </div>
    );
  }

  return (
    <iframe
      key={url}
      src={url}
      title={path}
      className="h-full w-full border-0 bg-background"
    />
  );
}
