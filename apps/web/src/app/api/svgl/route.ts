import { NextResponse } from "next/server";
import { isSvglIcon, type SvglCatalog, type SvglIcon } from "../../../lib/svgl";

const SVGL_API = "https://api.svgl.app";
const CACHE_SECONDS = 86_400;

type SvglCategory =
  "database" | "devtool" | "framework" | "language" | "library";

async function category(name: SvglCategory): Promise<SvglIcon[]> {
  const response = await fetch(`${SVGL_API}/category/${name}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: CACHE_SECONDS },
  });

  if (!response.ok) {
    throw new Error(`SVGL ${name} request failed with ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload))
    throw new Error(`SVGL returned an invalid ${name} catalog`);

  return payload.filter(isSvglIcon);
}

export async function GET() {
  try {
    const [frameworks, languages, libraries, devtools, databases] =
      await Promise.all([
        category("framework"),
        category("language"),
        category("library"),
        category("devtool"),
        category("database"),
      ]);
    const extras = [...libraries, ...devtools, ...databases].filter(
      (icon, index, icons) =>
        icons.findIndex((candidate) => candidate.id === icon.id) === index,
    );
    const catalog: SvglCatalog = { frameworks, languages, extras };

    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 7}`,
      },
    });
  } catch (error) {
    console.error("Unable to load the SVGL catalog", error);
    return NextResponse.json(
      { error: "The logo catalog is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
