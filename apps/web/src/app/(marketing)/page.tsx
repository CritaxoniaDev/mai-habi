import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import EditorMock from "../../components/marketing/EditorMock";
import FeatureGrid from "../../components/marketing/FeatureGrid";
import HeroFloatingCards from "../../components/marketing/HeroFloatingCards";
import { getChangelog } from "../../lib/changelog";

// Everything is one app now: the playground at /projects, docs at /docs.
const appHref = "/projects";
const docsHref = "/docs";

export const metadata: Metadata = {
  title: { absolute: "HABI — build frontends and APIs from your browser" },
  description:
    "Write frontends, test APIs, inspect projects and publish backend services from one browser workspace. Frontend compilation stays local; optional services deploy through your own Vercel account.",
};

const pad = (n: number) => String(n).padStart(2, "0");

const steps = [
  {
    number: "01",
    title: "Type",
    body: "Monaco with real TypeScript checking, a file tree, tabs and a command palette. React types are loaded for you, so useState and ReactNode autocomplete without a node_modules folder anywhere.",
  },
  {
    number: "02",
    title: "Compile",
    body: "esbuild runs as WebAssembly in a Web Worker on your own device. It resolves imports against your project, transforms JSX and TypeScript, and gathers your CSS — a pause in typing later.",
  },
  {
    number: "03",
    title: "Run",
    body: "Output goes into a sandboxed iframe. Keep the small preview panel beside your code, or open the viewer as its own page and send that link to someone else.",
  },
];

const features = [
  {
    title: "Languages detected as you type",
    body: "Name a file and HABI selects its language, syntax highlighting and SVGL mark immediately. Start with HTML, CSS, JavaScript or React, or open Python, Rust, Go, Vue, Svelte, GraphQL and many more.",
  },
  {
    title: "Libraries without installing them",
    body: "React, Motion, Lenis, clsx and Zustand are served by the platform as real ES modules. Import one and it works — nothing to install, one shared React, and each is fetched only when a project actually uses it.",
  },
  {
    title: "Images that travel with the project",
    body: "Drop a picture into the file tree and import it, or point at it from CSS or an img tag. It is inlined into the build, so a shared link carries its own assets and needs no host.",
  },
  {
    title: "A REST client, built in",
    body: "Call any API without leaving the tab. Collections and folders, environments with {{variables}}, auth, and every body type — form-data, JSON, GraphQL, binary. Requests go through a server-side proxy, so CORS never gets in the way.",
  },
  {
    title: "Open a repository from GitHub",
    body: "Sign in and browse everything your account can reach, private repositories included. A full-screen explorer shows the tree beside a Monaco preview, the real language split and detected frameworks — then opens it here as a project.",
  },
  {
    title: "Find anything, across every file",
    body: "Cmd+Shift+F searches the whole project, not just the open file. Results group by the file they came from, fold away, and jump you to the line.",
  },
  {
    title: "Fonts without the copy and paste",
    body: "Pick from Google Fonts in a dialog and they load straight into the preview. Mark one the default and the starters follow; reference the rest by name in your CSS.",
  },
  {
    title: "Errors that say which kind they are",
    body: "A compilation failure gets a marker on the offending line and an entry in Problems. A runtime exception lands in the console with its stack. One never hides the other.",
  },
  {
    title: "A viewer that is only your app",
    body: "No file tree, no toolbar, no editor chrome. Device presets, fullscreen, and a URL a recipient can open without an account.",
  },
  {
    title: "Yours until you say otherwise",
    body: "Projects live in your browser through IndexedDB. Signing in with GitHub is optional and adds cloud sync, short links and your repositories; it never happens behind your back.",
  },
  {
    title: "Light, dark, system",
    body: "The product follows your operating system and switches with no reload. Monaco and your open tabs keep their state, and your project keeps its own appearance.",
  },
  {
    title: "Backend services, owned by you",
    body: "Create multiple Node services in a full Monaco workspace, validate them in Vercel Sandbox, then deploy with your own Vercel credentials. Each service receives an API base URL without drawing from a shared HABI quota.",
  },
  {
    title: "Mock an API without a backend",
    body: "Define routes, JSON responses, latency and deliberate failures. A service worker intercepts requests in the browser, making loading, error and retry states reproducible without deploying anything.",
  },
  {
    title: "Compare projects and inspect their design",
    body: "Select two projects to see added, removed and modified files in a side-by-side diff, or extract colors, spacing, fonts, radii and shadows into a generated design-token style guide.",
  },
];

const templates = [
  "HTML, CSS & JavaScript",
  "React + TypeScript",
  "React + JavaScript",
  "React + Motion",
  "React + Tailwind CSS",
  "Blank",
];

const limits = [
  {
    title: "No npm registry",
    body: "A curated shelf is provided — React, Motion, Lenis and a couple of utilities. Any other import is reported as a compile error, by name, instead of failing somewhere confusing at runtime.",
  },
  {
    title: "The editor is not a remote machine",
    body: "Frontend projects still have no terminal or npm install. The console is your application's browser console; backend validation is an explicit, separate action inside the service builder.",
  },
  {
    title: "Bring your own deployment account",
    body: "Published backend services use your Vercel credentials and quota. HABI does not hide a pooled hosting account behind the product, so one user cannot consume everyone else's resources.",
  },
];

/*
 * The "How it works" diagram, kept as verbatim SVG. Its animations live in
 * global.css (the `.habi-*` classes); the CSP constrains scripts only, so the
 * inline style attributes here are allowed. Tailwind still scans the class names
 * inside this string, so the utility classes on the <svg> are generated.
 */
const PIPELINE_SVG = `<svg
  viewBox="0 0 640 380"
  role="img"
  aria-labelledby="pipeline-title pipeline-desc"
  class="mx-auto h-auto w-full max-w-2xl"
>
  <title id="pipeline-title">How HABI runs your code on your own device</title>
  <desc id="pipeline-desc">
    Your keystrokes go into a Web Worker that runs esbuild-wasm on your CPU. The
    result is handed to a sandboxed iframe that is allowed to run scripts and
    nothing else.
  </desc>

  <defs>
    <linearGradient id="habi-sheen-grad" class="text-foreground" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="currentColor" stop-opacity="0"></stop>
      <stop offset="50%" stop-color="currentColor" stop-opacity="0.16"></stop>
      <stop offset="100%" stop-color="currentColor" stop-opacity="0"></stop>
    </linearGradient>
    <clipPath id="habi-clip-build">
      <rect x="236" y="132" width="168" height="76" rx="10"></rect>
    </clipPath>
  </defs>

  <g class="text-muted-foreground" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none">
    <line x1="320" y1="80" x2="320" y2="122"></line>
    <line x1="192" y1="170" x2="226" y2="170"></line>
    <line x1="404" y1="170" x2="438" y2="170"></line>
    <line x1="320" y1="208" x2="320" y2="241"></line>
  </g>
  <g class="text-muted-foreground" fill="currentColor">
    <path d="M315 122 L325 122 L320 131 Z"></path>
    <path d="M226 165 L226 175 L235 170 Z"></path>
    <path d="M438 165 L438 175 L447 170 Z"></path>
    <path d="M315 241 L325 241 L320 250 Z"></path>
  </g>

  <g class="text-foreground" fill="var(--habi-accent)">
    <rect class="habi-drop" style="--habi-run: 66px; animation-delay: 0s" x="318.5" y="66" width="3" height="14" rx="1.5"></rect>
    <rect class="habi-slide" style="--habi-run: 58px; animation-delay: .5s" x="178" y="168.5" width="14" height="3" rx="1.5"></rect>
    <rect class="habi-slide" style="--habi-run: 58px; animation-delay: 1.5s" x="390" y="168.5" width="14" height="3" rx="1.5"></rect>
    <rect class="habi-drop" style="--habi-run: 70px; animation-delay: 2.4s" x="318.5" y="194" width="3" height="14" rx="1.5"></rect>
  </g>

  <g class="text-border-strong" stroke="currentColor" stroke-width="1.25" style="fill: var(--surface-secondary)">
    <rect x="210" y="24" width="220" height="56" rx="12"></rect>
    <rect x="24" y="132" width="168" height="76" rx="10"></rect>
    <rect x="236" y="132" width="168" height="76" rx="10"></rect>
    <rect x="448" y="132" width="168" height="76" rx="10"></rect>
    <rect x="180" y="264" width="280" height="88" rx="14"></rect>
  </g>

  <g clip-path="url(#habi-clip-build)">
    <rect class="habi-sheen" style="--habi-run: 220px; animation-delay: 1.1s" x="196" y="132" width="64" height="76" fill="url(#habi-sheen-grad)"></rect>
  </g>

  <g class="text-foreground" fill="none" stroke="var(--habi-accent)">
    <g class="habi-live" style="animation-delay: 0s">
      <rect x="210" y="24" width="220" height="56" rx="12" stroke-width="6" stroke-opacity=".14"></rect>
      <rect x="210" y="24" width="220" height="56" rx="12" stroke-width="1.5"></rect>
    </g>
    <g class="habi-live" style="animation-delay: .35s">
      <rect x="24" y="132" width="168" height="76" rx="10" stroke-width="6" stroke-opacity=".14"></rect>
      <rect x="24" y="132" width="168" height="76" rx="10" stroke-width="1.5"></rect>
    </g>
    <g class="habi-live" style="animation-delay: .95s">
      <rect x="236" y="132" width="168" height="76" rx="10" stroke-width="6" stroke-opacity=".14"></rect>
      <rect x="236" y="132" width="168" height="76" rx="10" stroke-width="1.5"></rect>
    </g>
    <g class="habi-live" style="animation-delay: 1.95s">
      <rect x="448" y="132" width="168" height="76" rx="10" stroke-width="6" stroke-opacity=".14"></rect>
      <rect x="448" y="132" width="168" height="76" rx="10" stroke-width="1.5"></rect>
    </g>
    <g class="habi-live" style="animation-delay: 2.85s">
      <rect x="180" y="264" width="280" height="88" rx="14" stroke-width="6" stroke-opacity=".14"></rect>
      <rect x="180" y="264" width="280" height="88" rx="14" stroke-width="1.5"></rect>
    </g>
  </g>

  <g class="text-border-strong" fill="none" stroke="currentColor">
    <rect class="habi-march" x="196" y="278" width="248" height="62" rx="10" stroke-width="1" stroke-dasharray="3 6" stroke-opacity=".85"></rect>
  </g>
  <g class="text-border-strong" stroke="currentColor" stroke-width="1.25">
    <circle cx="320" cy="264" r="14" style="fill: var(--surface-secondary)"></circle>
  </g>
  <g class="text-muted-foreground" stroke="currentColor" stroke-width="1.2" fill="none">
    <path d="M316.5 263 v-2.5 a3.5 3.5 0 0 1 7 0 v2.5" stroke-linecap="round"></path>
    <rect x="313.5" y="263" width="13" height="10" rx="2" style="fill: var(--surface-secondary)"></rect>
  </g>

  <g class="font-mono" fill="currentColor" text-anchor="middle" dominant-baseline="central">
    <text class="text-foreground" x="320" y="52" font-size="15">your keystrokes<tspan class="habi-caret" dx="3">|</tspan></text>

    <text class="text-foreground" x="108" y="161" font-size="14">Web Worker</text>
    <text class="text-muted-foreground" x="108" y="185" font-size="11">off the main thread</text>

    <text class="text-foreground" x="320" y="161" font-size="14">esbuild-wasm</text>
    <text class="text-muted-foreground" x="320" y="185" font-size="11">bundles as you type</text>

    <text class="text-foreground" x="532" y="161" font-size="14">your CPU</text>
    <text class="text-muted-foreground" x="532" y="185" font-size="11">no network hop</text>

    <text class="text-foreground" x="320" y="302" font-size="15">sandboxed iframe</text>
    <text class="text-muted-foreground" x="320" y="324" font-size="11.5">allow-scripts, nothing else</text>
  </g>
</svg>`;

/** A numbered, monospace section header — the editorial spine of the page. */
function SectionHead({
  index,
  label,
  title,
  lead,
  className = "",
}: {
  index: string;
  label: string;
  title: string;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3 font-mono text-micro uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-foreground">{index}</span>
        <span aria-hidden="true" className="h-px w-8 bg-border-strong" />
        <span>{label}</span>
      </div>
      <h2 className="mt-5 text-headline font-light text-foreground">{title}</h2>
      {lead ? (
        <p className="mt-3 max-w-2xl text-body font-light text-muted-foreground">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  const latest = getChangelog()[0];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div
          aria-hidden="true"
          className="mk-hero-grid pointer-events-none absolute inset-0"
        />
        <HeroFloatingCards />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pt-24">
          <div className="mk-hero-copy mx-auto flex max-w-5xl flex-col items-center text-center">
            {latest ? (
              <a
                href="/changelog"
                className="group inline-flex items-center gap-2.5 rounded-md border border-border bg-surface px-1.5 py-1.5 pr-3.5 transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                <span className="rounded-sm bg-accent px-2 py-0.5 font-mono text-micro text-accent-foreground">
                  {latest.version}
                </span>
                <span className="text-label font-light text-muted-foreground transition-colors group-hover:text-foreground">
                  See what&rsquo;s new
                </span>
                <ArrowRight
                  className="mk-nudge size-3.5 text-subtle-foreground"
                  aria-hidden="true"
                />
              </a>
            ) : null}

            <p className="mt-9 font-mono text-micro uppercase tracking-[0.2em] text-muted-foreground">
              Local-first browser workspace
            </p>

            <h1 className="mt-5 max-w-4xl text-balance text-display font-light text-foreground">
              Build frontends and APIs,
              <span className="block">without leaving the browser.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-balance text-lead font-light text-foreground-secondary">
              Write code in Monaco, preview it instantly, test REST requests,
              mock endpoints, and publish backend services through your own
              Vercel account.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={appHref}
                className="group inline-flex h-11 items-center gap-2 rounded-md bg-accent pl-5 pr-4 text-body font-normal text-accent-foreground transition-colors duration-[--duration-fast] hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Start building
                <ArrowRight
                  className="mk-nudge size-4 opacity-80"
                  aria-hidden="true"
                />
              </a>
              <a
                href={docsHref}
                className="group inline-flex h-11 items-center gap-2 rounded-md border border-border bg-surface px-5 text-body font-normal text-foreground transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                Explore the docs
                <ArrowRight
                  className="mk-nudge size-4 opacity-60"
                  aria-hidden="true"
                />
              </a>
            </div>

            <ul
              aria-label="Workspace capabilities"
              className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-micro text-subtle-foreground"
            >
              <li className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Compiles on your device
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                No account required
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Deploys stay yours
              </li>
            </ul>
          </div>

          {/* The real product is the hero illustration. */}
          <div className="mk-hero-product mt-14 sm:mt-16">
            <div className="mb-3 flex items-center justify-between gap-4 px-1 font-mono text-micro uppercase tracking-[0.14em] text-subtle-foreground">
              <span>Workspace preview</span>
              <span className="hidden items-center gap-2 sm:inline-flex">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
                Browser native · Ready
              </span>
            </div>
            <div className="rounded-2xl border border-border bg-surface-secondary/70 p-2 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.45)] sm:p-3">
              <EditorMock />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead
            index="01"
            label="How it works"
            title="Three steps, all of them local"
            lead="The server sends you an application and some static files. Everything after that happens on your device."
          />

          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step) => (
              <li key={step.number}>
                <span className="inline-grid size-9 place-items-center rounded-md border border-border bg-surface font-mono text-label text-foreground">
                  {step.number}
                </span>
                <h3 className="mt-4 text-section font-light text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-secondary font-light leading-relaxed text-foreground-secondary">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <figure className="habi-pipeline mt-14 rounded-xl border border-border bg-surface p-6 sm:p-8">
            <div dangerouslySetInnerHTML={{ __html: PIPELINE_SVG }} />

            <figcaption className="mt-6 border-t border-border pt-5 text-label font-light text-muted-foreground">
              A hundred people using HABI is a hundred compilers, one per
              browser. The server never compiles anything.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead index="02" label="Features" title="What you get" />

          <FeatureGrid features={features} appHref={appHref} />
        </div>
      </section>

      {/* Templates */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <SectionHead
              index="03"
              label="Templates"
              title="Start from something"
              lead="Pick a starter and edit it. Or import a folder or a ZIP — the structure is preserved, and build folders are skipped."
              className="lg:pt-2"
            />

            <ul className="overflow-hidden rounded-xl border border-border">
              {templates.map((template, i) => (
                <li
                  key={template}
                  className="flex items-center gap-4 border-b border-border bg-surface px-5 py-4 transition-colors duration-[--duration-fast] last:border-b-0 hover:bg-surface-hover"
                >
                  <span className="font-mono text-micro text-subtle-foreground">
                    {pad(i + 1)}
                  </span>
                  <span className="text-body font-light text-foreground">
                    {template}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sharing */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <SectionHead
              index="04"
              label="Sharing"
              title="Send a link, not a repository"
              className="lg:pt-2"
              lead={
                <>
                  Share opens the viewer for whoever receives it. They see the
                  running application, not your editor, and they need no account
                  and no install. With no backend configured the project travels
                  inside the link itself, so the page works with nothing behind
                  it at all.
                </>
              }
            />

            <div>
              {/* An inspector panel, echoing the editor illustration's chrome. */}
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="flex h-9 items-center gap-2 border-b border-border px-3">
                  <span className="size-2 rounded-full bg-border-strong" />
                  <span className="size-2 rounded-full bg-border-strong" />
                  <span className="size-2 rounded-full bg-border-strong" />
                  <span className="ml-2 font-mono text-micro text-muted-foreground">
                    viewer
                  </span>
                  <span className="ml-auto rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-micro text-muted-foreground">
                    shared link
                  </span>
                </div>

                <div className="p-5">
                  <p className="break-all font-mono text-code text-foreground">
                    https://app-playground-habi.vercel.app/view/Km9Qp2Xa
                  </p>
                  <hr className="my-5 border-border" />
                  <dl className="grid grid-cols-2 gap-y-3 text-label">
                    <dt className="text-muted-foreground">Recipient needs</dt>
                    <dd className="text-right text-foreground sm:text-left">
                      A browser
                    </dd>
                    <dt className="text-muted-foreground">They download</dt>
                    <dd className="text-right text-foreground sm:text-left">
                      Your app, not the editor
                    </dd>
                    <dt className="text-muted-foreground">Expiry</dt>
                    <dd className="text-right text-foreground sm:text-left">
                      7 days, 30 days or never
                    </dd>
                  </dl>
                </div>
              </div>

              <a
                href={`${docsHref}/guides/sharing`}
                className="group mt-5 inline-flex items-center gap-1.5 rounded-sm text-secondary font-normal text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              >
                How sharing works
                <ArrowUpRight
                  className="size-3.5 opacity-50"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Limits */}
      <section id="limits" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <SectionHead
            index="05"
            label="Constraints"
            title="What HABI is not"
            lead="These are choices rather than gaps. They are the reason it starts instantly and costs nothing to run."
          />

          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {limits.map((limit) => (
              <article key={limit.title} className="bg-surface p-6">
                <span className="inline-flex size-6 items-center justify-center rounded-md border border-border text-subtle-foreground">
                  <Minus className="size-3.5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-panel font-normal text-foreground">
                  {limit.title}
                </h3>
                <p className="mt-2 text-secondary font-light leading-relaxed text-foreground-secondary">
                  {limit.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Close */}
      <section>
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-secondary/50 px-6 py-16 text-center sm:py-20">
            <div
              aria-hidden="true"
              className="mk-hero-grid pointer-events-none absolute inset-0"
            />

            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-headline font-light text-foreground">
                Open a tab and start
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-body font-light text-muted-foreground">
                Nothing to sign up for, nothing to install, nothing to wait for.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href={appHref}
                  className="group inline-flex h-10 items-center gap-1.5 rounded-md bg-accent pl-5 pr-4 text-body font-normal text-accent-foreground transition-colors duration-[--duration-fast] hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  Start coding
                  <ArrowRight
                    className="mk-nudge size-4 opacity-80"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href={`${docsHref}/getting-started/quick-start`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-md border border-border bg-surface px-5 text-body font-normal text-foreground transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                >
                  Quick start
                  <ArrowUpRight
                    className="size-4 opacity-50"
                    aria-hidden="true"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
