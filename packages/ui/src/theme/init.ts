import { THEME_STORAGE_KEY } from './controller';

/**
 * Runs before first paint, inline in the document head.
 *
 * Without this the browser paints the light stylesheet and then swaps to dark
 * once hydration catches up — the white flash the design rules forbid. It is a
 * string rather than a module because it has to execute synchronously, ahead of
 * any bundle.
 */
export const THEME_INIT_SCRIPT = `
  (function () {
    var mode = "system";

    try {
      mode =
        localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}) || "system";
    } catch (_) {}

    if (mode !== "light" && mode !== "dark") {
      mode = "system";
    }

    var isDark =
      mode === "dark" ||
      (mode === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    var root = document.documentElement;

    // Toggle rather than add, so the opposite class can never linger if this
    // runs against a root that already carries one. Mirrors the controller's
    // paint(), keeping the pre-hydration frame and the hydrated state identical.
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    root.dataset.themeMode = mode;
    root.dataset.theme = isDark ? "dark" : "light";
  })();
`;
