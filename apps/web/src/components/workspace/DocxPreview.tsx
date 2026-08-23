'use client';

import type { ProjectFile } from '@mai-habi/types';
import { Spinner, useTheme } from '@mai-habi/ui';
import { useObjectUrl } from '../../lib/use-object-url';
import { clientOnly } from '../../lib/client-only';

/*
 * The DOCX viewer pulls in a Word rendering engine and a virtualiser — far too
 * much to load for a project that never opens one. It arrives only when a
 * .docx is actually previewed.
 */
const DocxViewerPreview = clientOnly(
  () =>
    import('@mai-habi/ui/components/extend/docx-viewer').then((module) => ({
      default: module.DocxViewerPreview,
    })),
  <div className="grid h-full place-items-center bg-background">
    <Spinner label="Loading the document viewer" />
  </div>,
);

export interface DocxPreviewProps {
  path: string;
  file: ProjectFile;
}

function basename(path: string): string {
  const index = path.lastIndexOf('/');
  return index === -1 ? path : path.slice(index + 1);
}

/**
 * Renders a Word document from the project.
 *
 * The viewer takes a URL rather than bytes, so the stored base64 becomes a blob
 * URL — the same route the video and PDF previews take.
 */
export function DocxPreview({ path, file }: DocxPreviewProps) {
  const url = useObjectUrl(file, path);
  const { resolved } = useTheme();

  if (!url) {
    return (
      <div className="grid h-full place-items-center bg-background p-8 text-center">
        <p className="text-secondary font-light text-muted-foreground">
          This file could not be read as a Word document.
        </p>
      </div>
    );
  }

  return (
    <DocxViewerPreview
      key={url}
      className="h-full"
      fileName={basename(path)}
      src={url}
      // The document follows the editor's appearance rather than always burning white.
      isDark={resolved === 'dark'}
      onIsDarkChange={() => undefined}
      showUpload={false}
      showDownload={false}
    />
  );
}
