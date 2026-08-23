---
title: Searching a project
description: Find a keyword across every file, not just the one that is open.
---

The editor has two kinds of find, and they do different jobs.

| Where | Shortcut | Scope |
| --- | --- | --- |
| Monaco's find | `Ctrl/Cmd + F` | The file you are editing |
| Project search | `Ctrl/Cmd + Shift + F` | Every file in the project |

`Ctrl/Cmd + F` belongs to the editor and is untouched. Project search lives in
the sidebar, beside the file tree.

## Reading the results

Results are grouped by the file they came from. Each heading shows the file
name, its folder and how many matches it holds; under it, every match shows its
line number with the hit marked in context.

Selecting a match opens that file and scrolls to the line.

Each file group folds shut, and **collapse all** turns the panel into exactly a
list of the files that matched, with their counts — useful when you care where
something lives rather than what the surrounding line says.

A new search reopens every group, so a file you folded earlier can never hide
fresh matches behind a count.

## Options

- **Match case** — off by default, so `createFolderBtn` finds `CreateFolderBtn`.
- **Regular expression** — the query becomes a pattern. A malformed one is
  reported under the field rather than throwing, and a pattern that can match
  nothing at all (`a*`, `^`) is refused rather than matching every position.

With regex off the query is taken literally, so searching `other()` finds that
text rather than being read as a call.

## What is searched

Every text file in the project, in path order. Binary files are skipped — a
`.png` whose bytes happen to contain your keyword is not a match — and so are
folders.

Results are capped at 500 matches, and 50 per file, so one very common word
cannot lock up the panel. The summary says when a result is partial.

Search runs over the files already in memory, so there is no index to build and
nothing to keep in sync; edit a file and the next search sees it.
