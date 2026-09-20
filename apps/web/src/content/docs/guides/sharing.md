---
title: Sharing
description: Send a link that opens your running application, not your editor.
---

Press **Share** in the editor. You get a viewer link.

Whoever opens it sees the running application. They do not see your file tree,
your editor or your settings, and they need no account and nothing installed.

## Two kinds of link

**Self-contained link.** With no backend configured, the whole project is
compressed into the link's fragment — the part after `#`, which browsers never
send to a server. The page works with nothing behind it at all. These links are
long, and there is a size limit; a large project will be refused rather than
silently truncated.

**Short link.** With Supabase configured, the project is stored and you get a
short link such as `/view/Km9Qp2Xa`. A share stores its own snapshot, so later
edits do not silently change what you shared.

## Access

| Option | What the recipient can do |
| --- | --- |
| Anyone with the link | Run the application |
| Anyone with the link, plus source | Run it, and read the files in a read-only panel |

Unlisted means exactly that: possession of the link is access. There is no
listing, and no search.

## Expiry

Links can expire after 7 days, 30 days, or never. Guests default to 30 days;
signing in makes *never* the sensible default because you can revoke it later.

## What the recipient downloads

Your application, not the playground. The viewer is its own small module: it
does not load Monaco, the file explorer or the editor's state management. It
compiles your project in their browser and renders it.

## The viewer toolbar

A **shared link shows only your application** — no toolbar, no chrome. Whoever
opens it sees the running app and nothing else.

The viewer's controls — refresh, device presets, fullscreen — appear only when
you open the viewer of your *own* project, in a small toolbar that floats at the
top and hides itself behind a handle. You can turn even that off in **Project
settings → Viewer → Viewer toolbar**.
