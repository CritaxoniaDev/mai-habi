import { useEffect, useMemo, useState } from 'react';
import type { ProjectFile } from '@mai-habi/types';
import { mimeForPath } from '@mai-habi/filesystem';

/**
 * Turns a stored file into an object URL for the preview components.
 *
 * Binary files are held base64-encoded. A `data:` URL of the whole payload is
 * both enormous and unseekable — browsers will not range-request one, so a
 * video scrubber does nothing and a PDF viewer cannot jump pages. A blob URL is
 * a real resource, and it is revoked as soon as the file changes so a session
 * spent clicking through assets does not leak them.
 */
export function useObjectUrl(file: ProjectFile, path: string): string | null {
  const bytes = useMemo(() => {
    if (file.encoding !== 'base64') return null;

    try {
      const binary = atob(file.content);
      const out = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        out[index] = binary.charCodeAt(index);
      }
      return out;
    } catch {
      return null;
    }
  }, [file.content, file.encoding]);

  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!bytes) {
      setUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeForPath(path) }));
    setUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [bytes, path]);

  return url;
}
