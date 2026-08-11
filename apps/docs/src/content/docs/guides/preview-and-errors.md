---
title: Preview, console and errors
description: Where your application runs, and where each kind of failure shows up.
---

## Where your app runs

Your compiled project runs inside a sandboxed iframe. There are two places to
look at it:

- **Preview panel** — a tab in the bottom panel of the editor, beside Console and
  Problems.
- **Viewer** — a separate page at `/view/:id` with device presets and fullscreen.

The preview frame stays alive even while you are looking at another tab, which
is why console output keeps arriving when the Console tab is in front.

## The console

The Console panel is the browser console **of your application**. It captures
`console.log`, `info`, `warn`, `error` and `debug` from inside the preview and
shows each entry with its level and a timestamp.

It is not a shell. There is no Node, no npm and no package installation in HABI,
so the panel never offers a prompt.

## Two kinds of failure

Compilation and runtime errors mean different things, so they are kept apart.

### Compilation errors

The bundle was never produced. Nothing new ran; the last working version stays
on screen.

```
src/App.tsx:8:13
Expected "}" but found ")"
```

These appear as a red marker on the offending line in the editor, and under
**Problems** with the file, line and column.

Typical causes: a syntax error, an import that does not resolve, or an import of
a package HABI does not provide.

### Runtime errors

The bundle compiled and then threw while running.

```
ReferenceError: user is not defined
```

These appear in the **Console**, tagged as runtime errors and carrying their
stack. The editor itself is unaffected — you can keep typing.

### Editor diagnostics

TypeScript's own findings — a wrong prop type, an unused variable — appear under
**Problems** in their own section. They do not stop your project from running,
because the compiler strips types rather than checking them.

## Rebuilding

Compilation is debounced: it waits for a pause in typing rather than racing
every keystroke. To force it:

- `Ctrl/Cmd + R` — rebuild
- `Ctrl/Cmd + S` — save and rebuild
- The rebuild button in the header

You can turn automatic compilation off entirely in **Project settings →
Compile as I type**.
