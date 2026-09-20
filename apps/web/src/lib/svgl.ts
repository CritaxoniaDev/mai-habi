export interface SvglThemeRoutes {
  dark: string;
  light: string;
}

export interface SvglIcon {
  id: number;
  title: string;
  category: string | string[];
  route: string | SvglThemeRoutes;
  url: string;
  wordmark?: string | SvglThemeRoutes;
  brandUrl?: string;
}

export interface SvglCatalog {
  frameworks: SvglIcon[];
  languages: SvglIcon[];
  extras: SvglIcon[];
}

export const EMPTY_SVGL_CATALOG: SvglCatalog = {
  frameworks: [],
  languages: [],
  extras: [],
};

export function isSvglIcon(value: unknown): value is SvglIcon {
  if (!value || typeof value !== "object") return false;

  const icon = value as Partial<SvglIcon>;
  const routeIsValid =
    typeof icon.route === "string" ||
    (Boolean(icon.route) &&
      typeof icon.route === "object" &&
      typeof icon.route.light === "string" &&
      typeof icon.route.dark === "string");

  return (
    typeof icon.id === "number" &&
    typeof icon.title === "string" &&
    typeof icon.url === "string" &&
    routeIsValid
  );
}
