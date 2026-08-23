import type { ProjectFile } from '@mai-habi/types';
import { isAudioPath, isVideoPath } from '@mai-habi/filesystem';
import { useObjectUrl } from '../../lib/use-object-url';

export interface MediaViewerProps {
  path: string;
  file: ProjectFile;
}

/**
 * Plays a video or audio file from the project.
 *
 * Native elements rather than a custom transport: the browser's own controls
 * bring keyboard support, captions, picture-in-picture and playback rate for
 * free, and they follow the platform the person is already used to.
 */
export function MediaViewer({ path, file }: MediaViewerProps) {
  const url = useObjectUrl(file, path);
  const video = isVideoPath(path);

  if (!url) {
    return (
      <div className="grid h-full place-items-center bg-background p-8 text-center">
        <p className="text-secondary font-light text-muted-foreground">
          This file could not be read as media.
        </p>
      </div>
    );
  }

  if (video) {
    return (
      <div className="grid h-full place-items-center bg-background p-4">
        <video
          key={url}
          src={url}
          controls
          playsInline
          preload="metadata"
          className="max-h-full max-w-full rounded-md"
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center bg-background p-8">
      <div className="w-full max-w-md">
        <p className="truncate text-center text-secondary font-light text-muted-foreground">
          {path}
        </p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- audio, no captions track to offer */}
        <audio key={url} src={url} controls preload="metadata" className="mt-3 w-full" />
      </div>
    </div>
  );
}

export function isMediaPath(path: string): boolean {
  return isVideoPath(path) || isAudioPath(path);
}
