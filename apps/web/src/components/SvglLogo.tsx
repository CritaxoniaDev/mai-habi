"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Code2 } from "lucide-react";
import { cn, useTheme } from "@mai-habi/ui";
import {
  EMPTY_SVGL_CATALOG,
  type SvglCatalog,
  type SvglIcon,
  type SvglThemeRoutes,
} from "../lib/svgl";

const SvglContext = createContext<SvglCatalog>(EMPTY_SVGL_CATALOG);
const CATALOG_SCHEMA_VERSION = 2;

let catalogRequest: Promise<SvglCatalog> | null = null;

function loadCatalog(): Promise<SvglCatalog> {
  catalogRequest ??= fetch(`/api/svgl?v=${CATALOG_SCHEMA_VERSION}`, {
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok)
        throw new Error(`Logo catalog request failed with ${response.status}`);
      const payload = (await response.json()) as Partial<SvglCatalog>;

      return {
        frameworks: Array.isArray(payload.frameworks) ? payload.frameworks : [],
        languages: Array.isArray(payload.languages) ? payload.languages : [],
        extras: Array.isArray(payload.extras) ? payload.extras : [],
      };
    })
    .catch((error) => {
      catalogRequest = null;
      throw error;
    });

  return catalogRequest;
}

export function SvglProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<SvglCatalog>(EMPTY_SVGL_CATALOG);

  useEffect(() => {
    let active = true;
    void loadCatalog()
      .then((nextCatalog) => {
        if (active) setCatalog(nextCatalog);
      })
      .catch(() => {
        // Generic code marks remain visible while the cached endpoint recovers.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <SvglContext.Provider value={catalog}>{children}</SvglContext.Provider>
  );
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

const TITLE_ALIASES: Record<string, string> = {
  bash: "Bash",
  dockerfile: "Docker",
  html: "HTML5",
  next: "Next.js",
  postgres: "PostgreSQL",
  shell: "Bash",
  sql: "PostgreSQL",
  tailwind: "Tailwind CSS",
};

function findIcon(catalog: SvglCatalog, name: string): SvglIcon | undefined {
  const wanted = normalized(TITLE_ALIASES[normalized(name)] ?? name);
  return [
    ...(catalog.languages ?? []),
    ...(catalog.frameworks ?? []),
    ...(catalog.extras ?? []),
  ].find((icon) => normalized(icon.title) === wanted);
}

function iconRoute(
  route: string | SvglThemeRoutes,
  theme: "light" | "dark",
): string {
  return typeof route === "string" ? route : route[theme];
}

export interface SvglLogoProps {
  name: string;
  className?: string;
  fallbackClassName?: string;
}

export function SvglLogo({
  name,
  className,
  fallbackClassName,
}: SvglLogoProps) {
  const catalog = useContext(SvglContext);
  const { resolved } = useTheme();
  const icon = useMemo(() => findIcon(catalog, name), [catalog, name]);
  const src = icon ? iconRoute(icon.route, resolved) : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <Code2
        className={cn("shrink-0", fallbackClassName, className)}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cn("shrink-0 object-contain", className)}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  );
}
