import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { THEME_INIT_SCRIPT } from "@mai-habi/ui/theme-init";
import { SvglProvider } from "../components/SvglLogo";

// The variable fonts are bundled with the app rather than fetched from a CDN.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";

import "../styles/global.css";

// Global tour styles (driver.js, then our overrides). They only take effect once
// the editor starts the guided tour, but global CSS must live in a layout.
import "driver.js/dist/driver.css";
import "../styles/tour.css";

export const metadata: Metadata = {
  title: {
    default: "Playground",
    template: "%s — Playground",
  },
  description: "Create, run and share browser projects.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The middleware stamps a per-request nonce here; every script the app emits
  // carries it so the nonce-based CSP allows them. Reading headers() opts the
  // whole app into per-request rendering, which a nonce inherently requires.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // The inline script below sets the theme class, `color-scheme` and data
    // attributes on <html> before hydration. The server cannot know the visitor's
    // stored theme, so its markup differs from the mutated DOM — `suppressHydration
    // Warning` tells React to accept that difference instead of reverting <html> to
    // the server's (themeless, light) version and flashing the wrong appearance.
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background font-light text-foreground antialiased">
        {/* Published for client code (the preview iframe) that needs the nonce. */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
        {/*
          Resolves the theme before the first paint. Next injects a
          beforeInteractive script into the initial document head, ahead of
          hydration, so a client effect cannot cause a light frame first.

          suppressHydrationWarning: the browser blanks a script's `nonce`
          attribute in the DOM once it has validated it (so scripts can't read
          each other's nonces), so the hydrating client sees nonce="" where the
          server sent the real value. The nonce already did its job at parse
          time; there is nothing to reconcile.
        */}
        <Script
          id="habi-theme-init"
          strategy="beforeInteractive"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <SvglProvider>{children}</SvglProvider>
      </body>
    </html>
  );
}
