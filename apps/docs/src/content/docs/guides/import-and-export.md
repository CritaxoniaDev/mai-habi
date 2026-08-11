---
title: Import and export
description: Bring a project in from disk, and take it out again.
---

## Import

When you create a project, choose **Import existing project**. You can bring in:

- individual files
- a whole folder
- a ZIP archive
- anything dropped onto the drop zone

Folder structure is preserved exactly — nested directories are not flattened.

### What is skipped

These are ignored automatically, because they are either large, generated, or
not yours to carry around:

`node_modules`, `.git`, `dist`, `build`, `out`, `.cache`, `.next`, `.astro`,
`.turbo`, `.vercel`, `coverage`, `.DS_Store`, `.env`

### Limits

Imported archives are untrusted input, so they are validated before anything is
kept. Paths that try to escape the project root are rejected, and file count,
individual file size, total size and folder depth are all capped.

### After importing

An imported project has no npm step to run. If it imports packages HABI does not
provide, those imports will be reported as compile errors — see
[Provided packages](/reference/packages/).

## Export

**Export as ZIP** from the header menu, or from the command palette.

You get exactly the files you wrote. There are no installed dependencies to
leave out, because there never were any: React comes from the platform.

Individual files can be downloaded from the file tree's context menu.
