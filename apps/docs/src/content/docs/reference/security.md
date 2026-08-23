---
title: Security
description: How your code is isolated from the application running it.
---

Project code is treated as untrusted, including your own.

## Never evaluated in the app

Compiled output is **never** run in the application's context. There is no
`eval`, no `new Function`, and no script injected into the editor's document.

It runs inside an iframe created with:

```html
<iframe sandbox="allow-scripts"></iframe>
```

That is the whole permission list. `allow-same-origin` is withheld, which gives
the document an **opaque origin**: it cannot reach the editor's DOM, its
`localStorage` or IndexedDB, its cookies, or any session it holds.

Also withheld: `allow-forms`, `allow-popups`, `allow-top-navigation`,
`allow-modals`. A practical consequence is that `alert()` and real form
submissions do not work inside a preview.

## Talking back

The frame reports console output, runtime errors and readiness over
`postMessage`.

Because the sandbox has an opaque origin, `event.origin` is the string `"null"`
and cannot identify anything. Messages are therefore matched on the **source
window** — proving they came from our own frame — and every payload is checked
against an expected shape before it is used.

## Imported projects

A ZIP or a folder from disk is untrusted input:

- paths that try to escape the project root are rejected outright
- Windows drive paths and absolute paths are rejected
- `node_modules`, `.git` and build folders are skipped
- file count, individual file size, total size and folder depth are capped

## Sharing

A self-contained share link carries the project in the URL **fragment**, which
browsers never transmit to a server. A short link stores an immutable snapshot,
so a share shows what was shared rather than whatever the project became later.

Unlisted means possession of the link is access. There is no listing and no
index — but treat a link as public once you have sent it.

## What we never ask for

HABI needs no package registry token and no shell. It asks for repository
access only when you sign in with GitHub, and only to read: see
[GitHub repositories](/guides/github/) for what that grant covers and how to
revoke it. If a page ever asks for credentials that are not GitHub's own OAuth
screen, it is not HABI.
