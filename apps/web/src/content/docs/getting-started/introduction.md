---
title: What HABI is
description: A browser code playground that compiles locally, runs in a sandbox and shares with a link.
---

HABI is a code playground. You open a tab, write HTML, CSS, JavaScript, React or
TypeScript, and the result runs immediately beside your code or in its own page.

The part that matters is where the work happens. HABI compiles your project **in
your browser**, using esbuild compiled to WebAssembly inside a Web Worker. There
is no build server, no container to start, and no queue to wait in. A hundred
people using HABI at once is a hundred compilers, one per browser.

## Two modules

HABI is deliberately split in two.

| Module | Route | What it is |
| --- | --- | --- |
| Editor | `/editor/:id` | Files, code, console, problems, project settings |
| Viewer | `/view/:id` | Only your running application |

The editor never gives half its screen to a preview. There is a small optional
preview panel next to the console, and the viewer is a separate page you open
when you want the application to have the screen to itself — or when you want to
send someone a link.

## What it is good for

- Components and interfaces you want to try before wiring them into a real project
- Reproductions and bug reports that a colleague can open in one click
- Teaching, where installing a toolchain is the part that goes wrong
- Sketching a layout, a hook or an animation quickly

## What it is not

These are choices, and they are the reason it starts instantly.

**No npm registry.** React and ReactDOM are provided by the platform. Any other
import is refused at compile time, by name. See
[Provided packages](/reference/packages/).

**No Node runtime.** There is no terminal, no `npm install`, no server process.
The console panel is your application's browser console — it never pretends to
accept commands.

**Frontend only.** Anything that needs a server of its own belongs somewhere
else.

## Accounts are optional

You can create, run, import, export and share projects without ever signing in.
Projects are stored in your browser with IndexedDB. Signing in adds cloud sync,
short share links and access from another device, and it never happens without
you asking. See [Storage and accounts](/reference/storage/).
