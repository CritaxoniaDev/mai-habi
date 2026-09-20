---
version: "0.9.0"
date: 2026-09-19
title: Backend services, project tools, and a larger GitHub workspace
summary: Build and deploy user-owned APIs, compare projects, mock endpoints, inspect design tokens, and browse repositories in a full-screen editor.
kinds: ["added", "improved", "fixed"]
---

HABI grew beyond a frontend editor without turning the browser workspace into a
remote machine. Local projects still compile locally; server work is explicit,
isolated, and connected to the account that owns it.

### Added

- **Backend services.** Create and keep multiple Node services just like
  projects. Each service has a full Monaco editor, validation, deployment state,
  and its own API base URL.

  - Validation runs in **Vercel Sandbox** before deployment.
  - Publishing uses **your own Vercel credentials and quota**, rather than a
    shared HABI account that another user could exhaust.
  - The setup guide now walks through access tokens, team and project IDs, the
    connection flow, validation, deployment, and calling the resulting URL.

- **Compare Projects.** Pick two projects and inspect added, removed and
  modified files with a side-by-side diff.

- **Mock API Lab.** Define endpoints, JSON responses, latency and failures. A
  service worker intercepts requests in the browser, so loading and error states
  can be tested without a deployed backend.

- **Design Token Explorer.** Colors, spacing, font families, radii and shadows
  are extracted from project CSS and arranged into a generated style guide.

- **Automatic language detection.** A new filename immediately selects its
  language, file mark and Monaco grammar. The detector covers the core web stack
  plus Python, Go, Rust, Java, C and C++, C#, PHP, Ruby, Vue, Svelte, GraphQL,
  Terraform, Solidity, Swift, Kotlin, SQL and more.

- **SVGL-powered marks.** Framework and language artwork now comes from the
  SVGL API instead of generated path data in the repository. Responses are
  cached, theme-specific routes are respected, and a neutral mark remains when
  the catalog is unavailable.

### Improved

- **GitHub is now a full-screen workspace.** The centered page became an
  edge-to-edge application shell. Opening a repository places its independently
  scrolling file tree beside a Monaco preview that fills the remaining height.

- **The API Builder now matches the editor and REST client.** Code, service
  navigation, validation and deployment controls share one full-height tool
  layout instead of living in a smaller form page.

- **Documentation search feels like a real command surface.** Opening and
  closing animate independently, the underlying page stays crisp, and the
  background cannot scroll or receive pointer interaction while search is open.

- **Typography is consistent across the product.** Geist is the global text
  face; headings use the custom `cal_habi-sans` family.

### Fixed

- Older cached logo catalogs without newly added fields no longer crash the UI.
  Catalog payloads are normalized at the boundary and schema versions bypass
  stale browser or CDN entries.
- The documentation search dialog now renders at the document root instead of
  inside the sticky header's blur context.
- Form controls no longer forward the internal `invalid` state as a non-boolean
  DOM attribute.
