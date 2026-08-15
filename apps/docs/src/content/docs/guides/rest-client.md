---
title: REST client
description: Call any API from inside HABI — collections, environments, auth and every body type.
---

HABI has a built-in REST client, on its own page. Open it from the **command
palette** (search "REST client") or the **⋯ menu** in the editor header. It is a
standalone tool, not tied to any project.

Compose a request — method, URL, query params, headers — and press **Send**.
Everything you compose, plus your collections and history, is saved in your
browser.

## Why a proxy

A browser refuses to read most cross-origin responses (CORS). So requests are
not sent from the page — they go through a small **server-side proxy**
(`/api/proxy`), which makes the call and returns the result. That is why any API
works, whether or not it sets CORS headers.

The proxy blocks obviously dangerous targets (loopback, private and cloud
metadata addresses). If you self-host, treat it as an open relay and put it
behind sign-in before exposing it publicly — see [Self-hosting](/reference/self-hosting/).

## Collections

The left sidebar holds **folders** and **saved requests**. Each saved request is
shown by its name with a coloured method tag.

- **Save** stores the current request. Give it a name and, optionally, a folder.
- Click a saved request to load it back into the composer.
- Use the row menu to **rename**, **move** to a folder, or **delete**.
- Deleting a folder keeps its requests — they move to the root.

## Environments and `{{variables}}`

Open **Environments** (the layers button in the header). Create one or more
environments, each a set of variables, and pick the active one.

Then reference a variable anywhere — URL, params, headers, body, or auth — with
double braces:

```
{{baseUrl}}/users/{{userId}}
```

On send, the active environment fills them in. Unknown names are left untouched
so you can spot them.

## Auth

The **Auth** tab applies an `Authorization` header (or a query key) for you, so
you enter a token once rather than typing the header by hand.

| Type | What it sends |
| --- | --- |
| Bearer token | `Authorization: Bearer <token>` |
| Basic | `Authorization: Basic <base64 user:pass>` |
| API key | a header or query parameter you name |

Credential fields are masked like passwords, with a reveal toggle.

## Request body

The **Body** tab supports the same shapes as a full API client:

- **form-data** — multipart fields, each **text or a file upload**.
- **x-www-form-urlencoded** — key/value pairs.
- **raw** — a text body typed as JSON, Text, XML or HTML. JSON has a **Format**
  button.
- **binary** — send a file as-is, with its own content type.
- **GraphQL** — a query and a JSON variables editor.

The matching `Content-Type` is set automatically. Files are not saved between
sessions, so re-attach them after a reload, and keep uploads modest — they
travel through the proxy and are bounded by its request size limit.

## Response

The response pane shows the **status**, **time** and **size**, then the body and
headers. JSON is pretty-printed; switch to **Raw** to see it verbatim, or
**Copy** it to the clipboard. **History** (the clock button) lists recent
requests to re-run.

## What is stored where

Collections, environments, saved requests and history live in this browser's
local storage. That includes any tokens you enter — convenient, but not a secret
vault. Clearing site data clears them.
