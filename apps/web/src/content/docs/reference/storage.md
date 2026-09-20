---
title: Storage and accounts
description: Local by default, cloud only if you ask.
---

## Guests

Without an account, everything lives in your browser:

| What | Where |
| --- | --- |
| Projects and files | IndexedDB |
| Editor preferences, open tabs | IndexedDB |
| Appearance | `localStorage` |

You get a local identifier and an ownership secret that never leaves the
browser. No placeholder user account is created on a server.

Projects survive refreshes and restarts. They do not follow you to another
browser or another device — that is what signing in is for.

## Saving

Nothing is sent per keystroke.

```
keystroke → local state → IndexedDB (debounced) → cloud (longer debounce)
```

The status in the header tells you which stage you are at: *Saved locally*,
*Saving*, *Syncing*, *Saved*.

## Signing in

Signing in is optional and never required to use the editor. It adds:

- projects available from another device
- short, durable share links
- cloud backup

Sign-in is with GitHub, when a backend is configured. It also unlocks the
[repository browser](/guides/github/), which is why the authorisation covers
your repositories.

## Bringing local projects with you

The first time you sign in with projects already in the browser, HABI offers to
copy them to your account. You choose which ones. Nothing is uploaded without
that choice, and the local copies are never deleted — the offer simply does not
come back once you have answered it.

## Without a backend

If no backend is configured, HABI runs in guest-only mode: the editor, the
viewer, import, export and self-contained share links all work, and the sign-in
control is hidden rather than offering something that cannot happen.
