---
version: '0.7.0'
date: 2026-08-15
title: A REST client, fonts, and a friendlier first run
summary: Call any API from a new REST tool, add Google Fonts in a click, expand tags with Emmet, and meet a short tour on your first project.
kinds: ['added', 'improved']
---

The editor grew a proper tool alongside it, and the first few minutes got
gentler.

### Added

- **A built-in REST client**, at its own page. Compose a request — method, URL,
  params, headers — and send it. Requests travel through a small server-side
  proxy, so **CORS never blocks them**.

  - **Collections**: organise saved requests ("REST files") into folders.
  - **Environments**: store values once and reuse them anywhere with
    `{{variables}}`; the active environment fills them in on send.
  - **Auth**: Bearer, Basic and API key, entered once and applied for you.
    Credentials are masked, with a reveal toggle.
  - **Every body type**: form-data (with file uploads), x-www-form-urlencoded,
    raw (JSON / Text / XML / HTML, with a formatter), binary, and GraphQL.

- **A Google Fonts picker.** Choose a family in a dialog and it loads live into
  the preview. Set one as the default document font and the starter templates
  pick it up; reference the rest by name in your CSS.

- **Emmet in the editor.** Type an abbreviation and press Tab — `ul>li*3`,
  `.card`, `a[href]` — in HTML, CSS and JSX.

### Improved

- **A short tour on your first project.** The very first project you create
  offers a quick, skippable walkthrough of the files, editor, preview and share.
  It never appears again, and lives in the command palette afterwards.

- **A shared link now shows only your app.** The viewer's toolbar is for the
  author — it floats and hides behind a handle when you open your own project,
  and never appears for anyone you share a link with.
