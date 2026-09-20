---
title: Backend services
description: Validate a Node.js API in Vercel Sandbox, deploy it to your own Vercel account, and call it through a HABI URL.
---

Backend Services turns a small JavaScript module into a real serverless API. HABI
checks the module in an isolated Vercel Sandbox, deploys it to **your** Vercel
account, and gives it a stable URL on the HABI domain.

Use [Mock API Lab](/mock-api) when you only need browser-side mock responses.
Use [Backend Services](/api-builder) when other applications need to call a
public API, even while your HABI tab is closed.

## Before you start

You need:

- a HABI account, with cloud features enabled;
- a Vercel account and a Vercel project;
- an access token scoped to the team that owns that project; and
- the matching Vercel Team ID and Project ID.

The Vercel Hobby plan is a free tier for personal, non-commercial use. Sandbox
validations and deployed functions count against the limits of your connected
Vercel account. Check [Vercel's current pricing](https://vercel.com/pricing)
before relying on the service for a larger workload.

:::caution
The access token can create deployments in its selected Vercel scope. Treat it
like a password. Never paste it into service source, commit it to Git, or share
it in a screenshot.
:::

## Get your Vercel credentials

All three values must refer to the same Vercel account or team.

### 1. Create an access token

1. Open your personal account in the Vercel dashboard.
2. Go to **Settings → Tokens** (or open the
   [Account Tokens page](https://vercel.com/account/settings/tokens)).
3. Select **Create**, give the token a descriptive name such as `HABI backend
services`, and choose the account or team scope that owns your project.
4. Create the token and copy it immediately. Vercel only shows it once.

See Vercel's [access-token guide](https://vercel.com/kb/guide/how-do-i-use-a-vercel-api-access-token)
for the current dashboard flow.

### 2. Copy the Team ID

1. Switch to the team that owns the project.
2. Open **Settings → General**.
3. Scroll to **Team ID** and copy the value beginning with `team_`.

Vercel also documents the location under
[Find your team ID](https://vercel.com/docs/accounts#find-your-team-id).

### 3. Copy the Project ID

1. Select the same team, then open the project you want to own the Sandbox
   usage.
2. Open **Settings → General**.
3. Scroll to **Project ID** and copy the value beginning with `prj_`.

See Vercel's [Project ID instructions](https://vercel.com/docs/project-configuration/general-settings#project-id)
if the field has moved.

### 4. Connect HABI

1. Open [Backend Services](/api-builder).
2. Select **Connect Vercel**.
3. Paste the access token, Team ID, and Project ID.
4. Select **Connect account**.

HABI verifies that the token can access the selected project. It encrypts the
connection into a server-managed, HTTP-only cookie and never returns the token
to browser JavaScript. The cookie lasts for up to 30 days in the current
browser.

## Write a service

Export one asynchronous function named `handle`. It receives every route and
returns the HTTP response:

```js
export async function handle(request) {
  if (request.method === "GET" && request.path === "/health") {
    return {
      status: 200,
      headers: { "X-Service": "my-api" },
      body: { ok: true },
    };
  }

  if (request.method === "POST" && request.path === "/echo") {
    return {
      status: 201,
      body: { received: request.body },
    };
  }

  return { status: 404, body: { error: "Route not found" } };
}
```

The request object contains:

| Field     | Value                                                    |
| --------- | -------------------------------------------------------- |
| `method`  | The HTTP method, such as `GET` or `POST`                 |
| `path`    | The path after the service base URL, beginning with `/`  |
| `query`   | An object containing query-string values                 |
| `headers` | The incoming request headers                             |
| `body`    | The parsed request body when available, otherwise `null` |

Return an object with an optional `status`, optional string-valued `headers`,
and a `body`. The body may be JSON-compatible data or a string. The default
status is `200`, and HABI uses JSON content type when you do not provide one.

The current service runtime is Node.js 24 with ES modules. Deployments contain
only your `service.mjs` and HABI's small request wrapper, so imported npm
packages are not installed. Use built-in Node.js and Web APIs, or keep any
helper code inside the module.

## Validate in Sandbox

Select **Run in Sandbox** before deploying. HABI creates a temporary,
non-persistent Vercel Sandbox with network access disabled, then:

1. checks the module's JavaScript syntax;
2. imports the `handle` export;
3. calls it with a synthetic `GET /health` request; and
4. verifies that the result is an object with a valid HTTP status.

The Sandbox stops when the check finishes. A successful validation proves that
the module loads and handles the test request; it does not test every route in
your service. Each run consumes Sandbox usage from the connected Vercel
project. Vercel explains the isolation and authentication model in the
[Sandbox documentation](https://vercel.com/docs/sandbox).

## Deploy and get your API URL

1. Sign in to HABI. Publishing the gateway requires a HABI account.
2. Choose a valid **Vercel project name** in the service panel.
3. Select **Deploy service**.
4. Wait for Sandbox validation and Vercel deployment to finish.
5. Copy the URL shown under **Public gateway**.

The URL has this shape:

```text
https://your-habi-domain.com/api/services/svc_your_service_id
```

Paths and query parameters are appended normally. For example:

```js
const base = "https://your-habi-domain.com/api/services/svc_your_service_id";

const health = await fetch(`${base}/health`).then((response) =>
  response.json(),
);

const echoed = await fetch(`${base}/echo`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Hello from my app" }),
}).then((response) => response.json());
```

This works from plain HTML, CSS, and JavaScript too:

```html
<button id="send">Call my API</button>
<pre id="result"></pre>

<script>
  const base = "https://your-habi-domain.com/api/services/svc_your_service_id";

  document.querySelector("#send").addEventListener("click", async () => {
    const response = await fetch(`${base}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ framework: "none" }),
    });

    document.querySelector("#result").textContent = JSON.stringify(
      await response.json(),
      null,
      2,
    );
  });
</script>
```

The gateway handles browser CORS preflight requests and adds
`Access-Control-Allow-Origin: *` when your service does not set its own value.
It removes cookies before forwarding a request and never forwards `Set-Cookie`
from the response.

## Update or unpublish

Edit the source and select **Deploy changes** to create a new Vercel deployment
and move the HABI gateway to it.

**Unpublish gateway** removes the public HABI mapping. It does not delete the
project or deployment in your Vercel account. Delete those separately in the
Vercel dashboard if you no longer need them. Your source draft stays in this
browser.

## Cost and quotas

HABI does not charge for Backend Services. The work runs against the connected
user's Vercel account:

- each validation uses Vercel Sandbox;
- each deployed API request uses the user's Vercel Function; and
- each gateway request also uses the HABI host's function and bandwidth.

At the time of writing, Vercel lists included monthly Hobby allowances for
Sandbox CPU, memory, creations, transfer, concurrency, and Function usage.
Hobby normally pauses an exhausted feature until its usage window resets rather
than starting a paid bill, and it is restricted to personal, non-commercial
use. Limits and plan terms can change, so use the
[Hobby plan documentation](https://vercel.com/docs/plans/hobby) and
[pricing page](https://vercel.com/pricing) as the source of truth.

## Troubleshooting

### Vercel rejected those credentials or the selected project

Check that the token is scoped to the same team as both IDs, that the Team ID
starts with `team_`, and that the Project ID starts with `prj_`. Create a new
token if the original was revoked or copied incompletely.

### Connect a Vercel account first

The encrypted connection cookie is missing or expired. Reconnect Vercel in the
same browser. Blocking all cookies also prevents the connection from being
saved.

### Sandbox validation failed

Read **Sandbox output** for the syntax or runtime error. Confirm that the file
exports `async function handle(request)` and that the synthetic `/health`
request does not depend on external network access.

### Backend service not found or disabled

The gateway has not been published, was unpublished, or the host cannot read
its cloud mapping. Sign in and deploy the service again.

### A custom HABI deployment cannot connect or publish

Apply the latest `supabase/schema.sql`, configure the public Supabase variables,
set `NEXT_PUBLIC_APP_ORIGIN`, and add a server-only
`VERCEL_CONNECTION_SECRET` containing at least 32 characters.
