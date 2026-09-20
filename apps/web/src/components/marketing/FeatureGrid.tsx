"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowRight,
  Braces,
  Check,
  CircleAlert,
  Cloud,
  Code2,
  FileCode2,
  FolderGit2,
  GitCompareArrows,
  HardDrive,
  ImageIcon,
  Laptop,
  Monitor,
  Moon,
  Package,
  Play,
  Search,
  Send,
  ServerCog,
  Sun,
  Type,
  Waypoints,
} from "lucide-react";

export interface MarketingFeature {
  title: string;
  body: string;
}

interface FeatureGridProps {
  features: readonly MarketingFeature[];
  appHref: string;
}

const previewIcons: ComponentType<{ className?: string; "aria-hidden"?: boolean }>[] = [
  FileCode2,
  Package,
  ImageIcon,
  Send,
  FolderGit2,
  Search,
  Type,
  CircleAlert,
  Monitor,
  HardDrive,
  Sun,
  ServerCog,
  Waypoints,
  GitCompareArrows,
];

const interactiveFocus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

function PreviewFrame({
  label,
  meta,
  children,
}: {
  label: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mk-feature-preview relative min-h-48 overflow-hidden border-b border-border bg-surface-secondary/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
        <span>{label}</span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <div className="mk-feature-preview-inner">{children}</div>
    </div>
  );
}

function MiniButton({
  active = false,
  children,
  onClick,
  ariaLabel,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={`${interactiveFocus} rounded-md border px-2.5 py-1.5 font-mono text-[10px] transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface text-muted-foreground hover:border-border-strong hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function LanguagePreview() {
  const [file, setFile] = useState<"App.tsx" | "api.py">("App.tsx");
  return (
    <PreviewFrame label="Language intelligence" meta={file === "App.tsx" ? "TypeScript React" : "Python"}>
      <div className="flex gap-1.5">
        {(["App.tsx", "api.py"] as const).map((name) => (
          <MiniButton key={name} active={file === name} onClick={() => setFile(name)}>
            {name}
          </MiniButton>
        ))}
      </div>
      <div className="mk-feature-code mt-3 rounded-lg border border-border bg-background/80 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
        {file === "App.tsx" ? (
          <>
            <p><span className="text-foreground">export</span> function App() &#123;</p>
            <p className="pl-3"><span className="text-foreground">return</span> &lt;main&gt;Hello<span className="habi-caret ml-0.5 inline-block h-3 w-px bg-foreground align-middle" />&lt;/main&gt;</p>
            <p>&#125;</p>
          </>
        ) : (
          <>
            <p><span className="text-foreground">from</span> flask <span className="text-foreground">import</span> Flask</p>
            <p className="mt-1"><span className="text-foreground">def</span> status():</p>
            <p className="pl-3">return &#123;&quot;ok&quot;: True&#125;</p>
          </>
        )}
      </div>
    </PreviewFrame>
  );
}

function LibraryPreview() {
  const libraries = ["React", "Motion", "Zustand"] as const;
  const [library, setLibrary] = useState<(typeof libraries)[number]>("React");
  const imports = {
    React: "import { useState } from 'react'",
    Motion: "import { motion } from 'motion/react'",
    Zustand: "import { create } from 'zustand'",
  };
  return (
    <PreviewFrame label="Module shelf" meta="Zero installs">
      <div className="mk-feature-packages grid grid-cols-3 gap-2">
        {libraries.map((name) => (
          <button
            type="button"
            key={name}
            onClick={() => setLibrary(name)}
            className={`${interactiveFocus} rounded-lg border p-2 text-left transition-all ${
              library === name
                ? "border-foreground bg-surface shadow-sm"
                : "border-border bg-background/60 hover:border-border-strong"
            }`}
          >
            <Package className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="mt-2 block font-mono text-[10px] text-foreground">{name}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 truncate rounded-md border border-border bg-background/80 px-3 py-2 font-mono text-[10px] text-muted-foreground">
        {imports[library]}
      </p>
    </PreviewFrame>
  );
}

function ImagePreview() {
  const [optimized, setOptimized] = useState(false);
  return (
    <PreviewFrame label="Asset pipeline" meta={optimized ? "Ready · 42 KB" : "Original · 184 KB"}>
      <div className="grid grid-cols-[1.25fr_0.75fr] gap-3">
        <div className="relative h-28 overflow-hidden rounded-lg border border-border bg-[#171717]">
          <div className="mk-feature-float absolute left-5 top-4 size-16 rotate-6 border border-white/20 bg-[#ff754a]" />
          <div className="mk-feature-float-alt absolute bottom-3 right-5 size-14 -rotate-12 border border-white/20 bg-[#b8d45a]" />
          <div className="absolute inset-x-3 bottom-2 h-px bg-white/20" />
        </div>
        <button
          type="button"
          onClick={() => setOptimized((value) => !value)}
          className={`${interactiveFocus} flex flex-col items-center justify-center rounded-lg border border-dashed border-border-strong bg-background/60 text-center transition-colors hover:bg-surface`}
        >
          {optimized ? <Check className="size-5 text-foreground" /> : <ImageIcon className="size-5 text-muted-foreground" />}
          <span className="mt-2 font-mono text-[10px] text-muted-foreground">
            {optimized ? "Inlined" : "Optimize"}
          </span>
        </button>
      </div>
    </PreviewFrame>
  );
}

function RestPreview() {
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [sent, setSent] = useState(false);
  return (
    <PreviewFrame label="Request workspace" meta={sent ? (method === "GET" ? "200 · 86 ms" : "201 · 112 ms") : "Environment: Local"}>
      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMethod(method === "GET" ? "POST" : "GET"); setSent(false); }}
              className={`${interactiveFocus} rounded-md border border-border bg-background px-2.5 font-mono text-[10px] font-semibold text-foreground`}
            >
              {method}
            </button>
            <div className="min-w-0 flex-1 truncate rounded-md border border-border bg-background px-3 py-2 font-mono text-[10px] text-muted-foreground">
              &#123;&#123;baseUrl&#125;&#125;/users
            </div>
            <button
              type="button"
              onClick={() => setSent(true)}
              className={`${interactiveFocus} inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 font-mono text-[10px] text-background transition-opacity hover:opacity-80`}
            >
              <Play className="mk-feature-send size-3" fill="currentColor" aria-hidden="true" /> Send
            </button>
          </div>
          <div className="mt-3 flex gap-4 border-b border-border pb-2 font-mono text-[10px] text-muted-foreground">
            <span className="text-foreground">Params</span><span>Auth</span><span>Headers <b className="font-normal">3</b></span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background/80 p-3 font-mono text-[10px] leading-5 text-muted-foreground">
          {sent ? (
            <><span className="text-foreground">&#123;</span><br /><span className="pl-3">&quot;status&quot;: &quot;ok&quot;,</span><br /><span className="pl-3">&quot;items&quot;: 24</span><br /><span className="text-foreground">&#125;</span></>
          ) : (
            <span className="flex h-full items-center justify-center text-center">Send the request to inspect its response.</span>
          )}
        </div>
      </div>
    </PreviewFrame>
  );
}

function GithubPreview() {
  const [branch, setBranch] = useState<"main" | "feature/api">("main");
  const files = branch === "main" ? ["app", "components", "package.json"] : ["api", "middleware.ts", "vercel.json"];
  return (
    <PreviewFrame label="Repository explorer" meta="private/repo">
      <button
        type="button"
        onClick={() => setBranch(branch === "main" ? "feature/api" : "main")}
        className={`${interactiveFocus} flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 font-mono text-[10px] text-foreground`}
      >
        <span className="inline-flex items-center gap-2"><FolderGit2 className="size-3.5" /> {branch}</span>
        <span className="text-muted-foreground">change</span>
      </button>
      <div className="mk-feature-list mt-2 overflow-hidden rounded-lg border border-border bg-background/60">
        {files.map((file, index) => (
          <div key={file} className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
            {index < 2 ? <span className="text-muted-foreground">›</span> : <Code2 className="size-3 text-muted-foreground" />}
            <span className="font-mono text-[10px] text-foreground">{file}</span>
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}

function SearchPreview() {
  const [query, setQuery] = useState("user");
  const results = ["src/store/user.ts", "src/api/users.ts", "src/UserCard.tsx"].filter((item) =>
    item.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <PreviewFrame label="Project search" meta={`${results.length} files`}>
      <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
        <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Search preview files</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-foreground outline-none placeholder:text-subtle-foreground"
          placeholder="Search every file"
        />
        <kbd className="font-mono text-[9px] text-subtle-foreground">⌘⇧F</kbd>
      </label>
      <div className="mk-feature-list mt-2 space-y-1">
        {results.length ? results.map((result, index) => (
          <div key={result} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface">
            <span className="truncate font-mono text-[10px] text-muted-foreground">{result}</span>
            <span className="font-mono text-[9px] text-subtle-foreground">{12 + index * 7}</span>
          </div>
        )) : <p className="px-2 py-3 text-center font-mono text-[10px] text-subtle-foreground">No matches</p>}
      </div>
    </PreviewFrame>
  );
}

function FontPreview() {
  const fonts = ["Geist", "Cal Sans", "Geist Mono"] as const;
  const [font, setFont] = useState<(typeof fonts)[number]>("Cal Sans");
  const fontFamily = font === "Geist Mono" ? "var(--font-mono)" : font === "Cal Sans" ? "var(--font-heading)" : "var(--font-sans)";
  return (
    <PreviewFrame label="Font library" meta="Google Fonts">
      <div className="flex flex-wrap gap-1.5">
        {fonts.map((name) => <MiniButton key={name} active={font === name} onClick={() => setFont(name)}>{name}</MiniButton>)}
      </div>
      <div className="mt-3 rounded-lg border border-border bg-background/70 px-4 py-4">
        <p style={{ fontFamily }} className="mk-feature-type text-2xl text-foreground transition-all">Make it unmistakable.</p>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">font-family: &quot;{font}&quot;;</p>
      </div>
    </PreviewFrame>
  );
}

function ErrorPreview() {
  const [kind, setKind] = useState<"compile" | "runtime">("compile");
  return (
    <PreviewFrame label="Diagnostics" meta={kind === "compile" ? "1 problem" : "Console"}>
      <div className="flex gap-1.5">
        <MiniButton active={kind === "compile"} onClick={() => setKind("compile")}>Compile</MiniButton>
        <MiniButton active={kind === "runtime"} onClick={() => setKind("runtime")}>Runtime</MiniButton>
      </div>
      <div className="mt-3 rounded-lg border border-border bg-background/80 p-3">
        <div className="flex gap-2">
          <CircleAlert className="mk-feature-pulse mt-0.5 size-3.5 shrink-0 text-red-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-foreground">{kind === "compile" ? "Cannot find name 'usre'." : "TypeError: data.map is not a function"}</p>
            <p className="mt-1 font-mono text-[9px] text-muted-foreground">{kind === "compile" ? "App.tsx · 14:9 · TypeScript" : "UserList.tsx · render · line 22"}</p>
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}

function ViewerPreview() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <PreviewFrame label="Viewer" meta={device === "desktop" ? "1440 × 900" : "390 × 844"}>
      <div className="flex gap-1.5">
        <MiniButton active={device === "desktop"} onClick={() => setDevice("desktop")} ariaLabel="Desktop preview"><Monitor className="size-3.5" /></MiniButton>
        <MiniButton active={device === "mobile"} onClick={() => setDevice("mobile")} ariaLabel="Mobile preview"><Laptop className="size-3.5" /></MiniButton>
      </div>
      <div className="mt-3 flex h-24 items-center justify-center rounded-lg border border-border bg-background/60 p-2">
        <div style={{ width: device === "desktop" ? "100%" : "34%" }} className="mk-feature-device h-full overflow-hidden rounded border border-border-strong bg-surface transition-[width] duration-300">
          <div className="h-2 border-b border-border bg-surface-secondary" />
          <div className="grid h-[calc(100%_-_0.5rem)] place-items-center"><div className="h-2 w-1/2 rounded-full bg-foreground/20" /></div>
        </div>
      </div>
    </PreviewFrame>
  );
}

function StoragePreview() {
  const [cloud, setCloud] = useState(false);
  return (
    <PreviewFrame label="Project storage" meta={cloud ? "Synced now" : "Saved locally"}>
      <div className="relative mt-1 flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 p-4">
        <div className="grid size-11 place-items-center rounded-lg border border-border bg-surface">
          {cloud ? <Cloud className="size-5 text-foreground" /> : <HardDrive className="size-5 text-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-foreground">portfolio-v4</p>
          <p className="mt-1 font-mono text-[9px] text-muted-foreground">12 files · 348 KB</p>
        </div>
        <button type="button" onClick={() => setCloud((value) => !value)} className={`${interactiveFocus} rounded-md border border-border px-2.5 py-1.5 font-mono text-[9px] text-muted-foreground hover:text-foreground`}>
          {cloud ? "Use local" : "Enable sync"}
        </button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-border"><div className={`mk-feature-progress h-full bg-foreground transition-[width] duration-500 ${cloud ? "w-full" : "w-2/3"}`} /></div>
    </PreviewFrame>
  );
}

function ThemePreview() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const dark = theme === "dark" || theme === "system";
  return (
    <PreviewFrame label="Appearance" meta={theme}>
      <div className="flex gap-1.5">
        <MiniButton active={theme === "light"} onClick={() => setTheme("light")} ariaLabel="Light theme"><Sun className="size-3.5" /></MiniButton>
        <MiniButton active={theme === "dark"} onClick={() => setTheme("dark")} ariaLabel="Dark theme"><Moon className="size-3.5" /></MiniButton>
        <MiniButton active={theme === "system"} onClick={() => setTheme("system")} ariaLabel="System theme"><Laptop className="size-3.5" /></MiniButton>
      </div>
      <div className={`mt-3 overflow-hidden rounded-lg border p-3 transition-colors ${dark ? "border-zinc-700 bg-zinc-950" : "border-zinc-200 bg-white"}`}>
        <div className="flex gap-2"><span className={`h-2 flex-1 rounded-full ${dark ? "bg-zinc-700" : "bg-zinc-200"}`} /><span className="mk-feature-pulse h-2 w-8 rounded-full bg-[#ff754a]" /></div>
        <div className={`mt-3 h-10 rounded border ${dark ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-zinc-50"}`} />
      </div>
    </PreviewFrame>
  );
}

function BackendPreview() {
  const [status, setStatus] = useState<"draft" | "validated" | "live">("draft");
  const next = status === "draft" ? "validated" : status === "validated" ? "live" : "draft";
  return (
    <PreviewFrame label="Service control" meta={status === "live" ? "api.habi.app/notes" : "Vercel Sandbox"}>
      <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-border bg-background/70 p-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs text-foreground"><ServerCog className="size-4" /> notes-api</span>
            <span className={`mk-feature-pulse size-2 rounded-full ${status === "live" ? "bg-emerald-500" : status === "validated" ? "bg-amber-500" : "bg-muted-foreground"}`} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[9px] text-muted-foreground">
            <div className="rounded border border-border p-2"><b className="block font-normal text-foreground">3</b>routes</div>
            <div className="rounded border border-border p-2"><b className="block font-normal text-foreground">128 MB</b>memory</div>
          </div>
        </div>
        <div className="flex flex-col rounded-lg border border-border bg-[#111] p-3 font-mono text-[10px] text-zinc-400">
          <p><span className="text-zinc-600">$</span> npm run validate</p>
          <p className="mt-2 text-zinc-200">{status === "draft" ? "Ready to validate in Sandbox" : status === "validated" ? "✓ 3 routes passed" : "✓ Deployment is live"}<span className="habi-caret ml-1 inline-block h-3 w-px bg-zinc-400 align-middle" /></p>
          <button type="button" onClick={() => setStatus(next)} className={`${interactiveFocus} mt-auto self-start rounded bg-white px-3 py-1.5 text-[9px] text-black hover:bg-zinc-200`}>
            {status === "draft" ? "Validate" : status === "validated" ? "Deploy" : "Reset demo"}
          </button>
        </div>
      </div>
    </PreviewFrame>
  );
}

function MockPreview() {
  const [failure, setFailure] = useState(false);
  const [latency, setLatency] = useState(320);
  return (
    <PreviewFrame label="Mock route" meta={`GET /api/profile · ${latency} ms`}>
      <div className="rounded-lg border border-border bg-background/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-foreground">Response behavior</span>
          <button type="button" onClick={() => setFailure((value) => !value)} aria-pressed={failure} className={`${interactiveFocus} relative h-5 w-9 rounded-full transition-colors ${failure ? "bg-red-500" : "bg-foreground"}`}>
            <span className={`absolute top-0.5 size-4 rounded-full bg-background transition-transform ${failure ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            <span className="sr-only">Toggle deliberate failure</span>
          </button>
        </div>
        <label className="mt-4 block font-mono text-[9px] text-muted-foreground">
          Latency · {latency} ms
          <input className="mt-2 block w-full accent-current" type="range" min="0" max="2000" step="40" value={latency} onChange={(event) => setLatency(Number(event.target.value))} />
        </label>
      </div>
      <div className={`mk-feature-status mt-2 rounded-md border px-3 py-2 font-mono text-[10px] ${failure ? "border-red-500/30 bg-red-500/10 text-red-600" : "border-border bg-surface text-muted-foreground"}`}>
        {failure ? "503 · deliberate_failure" : "200 · { user: 'Ada' }"}
      </div>
    </PreviewFrame>
  );
}

function ComparePreview() {
  const [view, setView] = useState<"diff" | "tokens">("diff");
  return (
    <PreviewFrame label="Project inspector" meta={view === "diff" ? "3 files changed" : "18 tokens found"}>
      <div className="mb-3 flex gap-1.5">
        <MiniButton active={view === "diff"} onClick={() => setView("diff")}>Project diff</MiniButton>
        <MiniButton active={view === "tokens"} onClick={() => setView("tokens")}>Design tokens</MiniButton>
      </div>
      {view === "diff" ? (
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-background/80 font-mono text-[9px]">
          <div className="border-r border-border p-3 text-muted-foreground"><p className="mb-2 text-foreground">before.css</p><p className="bg-red-500/10 text-red-600">- padding: 16px;</p><p>- radius: 8px;</p></div>
          <div className="p-3 text-muted-foreground"><p className="mb-2 text-foreground">after.css</p><p className="bg-emerald-500/10 text-emerald-600">+ padding: 24px;</p><p>+ radius: 12px;</p></div>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_0.8fr] gap-3">
          <div className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-background/70 p-3">
            {["#111111", "#FF754A", "#B8D45A", "#F4F2ED"].map((color) => <div className="mk-feature-swatch" key={color}><div style={{ backgroundColor: color }} className="aspect-square rounded border border-black/10" /><span className="mt-1 block truncate font-mono text-[8px] text-muted-foreground">{color}</span></div>)}
          </div>
          <div className="rounded-lg border border-border bg-background/70 p-3 font-mono text-[9px] text-muted-foreground"><p className="text-foreground">Radii</p><p className="mt-2">sm · 6px</p><p>md · 10px</p><p>xl · 16px</p></div>
        </div>
      )}
    </PreviewFrame>
  );
}

function FeaturePreview({ index }: { index: number }) {
  switch (index) {
    case 0: return <LanguagePreview />;
    case 1: return <LibraryPreview />;
    case 2: return <ImagePreview />;
    case 3: return <RestPreview />;
    case 4: return <GithubPreview />;
    case 5: return <SearchPreview />;
    case 6: return <FontPreview />;
    case 7: return <ErrorPreview />;
    case 8: return <ViewerPreview />;
    case 9: return <StoragePreview />;
    case 10: return <ThemePreview />;
    case 11: return <BackendPreview />;
    case 12: return <MockPreview />;
    default: return <ComparePreview />;
  }
}

export default function FeatureGrid({ features, appHref }: FeatureGridProps) {
  const pad = (number: number) => String(number).padStart(2, "0");
  const wideCards = new Set([3, 11, 13]);

  return (
    <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => {
        const Icon = previewIcons[index] ?? Braces;
        return (
          <article
            key={feature.title}
            className={`mk-feature-card group flex min-w-0 flex-col bg-surface transition-colors duration-[--duration-fast] hover:bg-surface-hover ${wideCards.has(index) ? "lg:col-span-2" : ""}`}
          >
            <FeaturePreview index={index} />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-micro text-subtle-foreground">{pad(index + 1)}</span>
                <span className="grid size-8 place-items-center rounded-md border border-border bg-surface-secondary text-muted-foreground transition-colors group-hover:border-border-strong group-hover:text-foreground">
                  <Icon className="size-3.5" aria-hidden={true} />
                </span>
              </div>
              <h3 className="mt-4 text-panel font-normal text-foreground">{feature.title}</h3>
              <p className="mt-2 text-secondary font-light leading-relaxed text-foreground-secondary">{feature.body}</p>
            </div>
          </article>
        );
      })}

      <a
        href={appHref}
        className={`group relative flex min-h-72 flex-col justify-between overflow-hidden bg-foreground p-6 text-background transition-opacity hover:opacity-90 sm:col-span-2 lg:col-span-1 ${interactiveFocus} focus-visible:-outline-offset-2`}
      >
        <div className="mk-feature-ring absolute -right-10 top-12 size-44 rounded-full border border-background/15 transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
        <div className="mk-feature-ring-alt absolute right-2 top-24 size-24 rounded-full border border-background/20" aria-hidden="true" />
        <span className="relative font-mono text-micro text-background/55">{pad(features.length + 1)}</span>
        <div className="relative">
          <span className="font-mono text-micro uppercase tracking-[0.16em] text-background/55">Ready when you are</span>
          <span className="mt-3 flex items-end justify-between gap-4 text-panel font-normal">
            Open the editor
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-background/25 transition-transform duration-300 group-hover:translate-x-1">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </span>
        </div>
      </a>
    </div>
  );
}
