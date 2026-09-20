import type { FileLanguage } from "@mai-habi/types";
import { basename, extname } from "./path";

export interface DetectedLanguage {
  id: string;
  label: string;
  logo: string;
  recognized: boolean;
}

interface LanguageDefinition {
  id: string;
  label: string;
  logo?: string;
}

const LANGUAGE_BY_EXTENSION: Record<string, LanguageDefinition> = {
  ".astro": { id: "html", label: "Astro" },
  ".bash": { id: "shell", label: "Bash" },
  ".c": { id: "cpp", label: "C" },
  ".cc": { id: "cpp", label: "C++" },
  ".cbl": { id: "plaintext", label: "Cobol" },
  ".cjs": { id: "javascript", label: "JavaScript" },
  ".cob": { id: "plaintext", label: "Cobol" },
  ".cpp": { id: "cpp", label: "C++" },
  ".cs": { id: "csharp", label: "C#" },
  ".css": { id: "css", label: "CSS" },
  ".cts": { id: "typescript", label: "TypeScript" },
  ".cxx": { id: "cpp", label: "C++" },
  ".dart": { id: "dart", label: "Dart" },
  ".f": { id: "plaintext", label: "Fortran" },
  ".f90": { id: "plaintext", label: "Fortran" },
  ".gleam": { id: "plaintext", label: "Gleam" },
  ".go": { id: "go", label: "Go" },
  ".graphql": { id: "graphql", label: "GraphQL" },
  ".gql": { id: "graphql", label: "GraphQL" },
  ".h": { id: "cpp", label: "C" },
  ".haskell": { id: "plaintext", label: "Haskell" },
  ".hbs": { id: "handlebars", label: "Handlebars" },
  ".hpp": { id: "cpp", label: "C++" },
  ".hs": { id: "plaintext", label: "Haskell" },
  ".htm": { id: "html", label: "HTML5" },
  ".html": { id: "html", label: "HTML5" },
  ".java": { id: "java", label: "Java" },
  ".js": { id: "javascript", label: "JavaScript" },
  ".json": { id: "json", label: "JSON" },
  ".jsonc": { id: "json", label: "JSON" },
  ".jsx": { id: "javascript", label: "React", logo: "React" },
  ".jl": { id: "julia", label: "Julia" },
  ".kt": { id: "kotlin", label: "Kotlin" },
  ".kts": { id: "kotlin", label: "Kotlin" },
  ".less": { id: "less", label: "Less" },
  ".lua": { id: "lua", label: "Lua" },
  ".m": { id: "plaintext", label: "MATLAB" },
  ".markdown": { id: "markdown", label: "Markdown" },
  ".md": { id: "markdown", label: "Markdown" },
  ".mdx": { id: "mdx", label: "MDX", logo: "Markdown" },
  ".mjs": { id: "javascript", label: "JavaScript" },
  ".mts": { id: "typescript", label: "TypeScript" },
  ".php": { id: "php", label: "PHP" },
  ".ps1": { id: "powershell", label: "PowerShell" },
  ".py": { id: "python", label: "Python" },
  ".pyw": { id: "python", label: "Python" },
  ".r": { id: "r", label: "R" },
  ".rb": { id: "ruby", label: "Ruby" },
  ".rs": { id: "rust", label: "Rust" },
  ".sass": { id: "scss", label: "Sass" },
  ".scala": { id: "scala", label: "Scala" },
  ".scss": { id: "scss", label: "Sass" },
  ".sh": { id: "shell", label: "Bash" },
  ".sol": { id: "solidity", label: "Solidity" },
  ".sql": { id: "sql", label: "SQL", logo: "PostgreSQL" },
  ".svelte": { id: "html", label: "Svelte" },
  ".svg": { id: "xml", label: "SVG" },
  ".swift": { id: "swift", label: "Swift" },
  ".tf": { id: "hcl", label: "Terraform" },
  ".tfvars": { id: "hcl", label: "Terraform" },
  ".ts": { id: "typescript", label: "TypeScript" },
  ".tsx": { id: "typescript", label: "React", logo: "React" },
  ".txt": { id: "plaintext", label: "Plain text", logo: "Code" },
  ".vue": { id: "html", label: "Vue" },
  ".xml": { id: "xml", label: "XML", logo: "Code" },
  ".yaml": { id: "yaml", label: "YAML", logo: "Code" },
  ".yml": { id: "yaml", label: "YAML", logo: "Code" },
  ".zig": { id: "plaintext", label: "Zig" },
  ".zsh": { id: "shell", label: "Bash" },
};

const MIME_BY_EXTENSION: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".jsx": "text/javascript",
  ".ts": "text/javascript",
  ".tsx": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/mp4",
  ".ogv": "video/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".wasm": "application/wasm",
};

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".bmp",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".ogv",
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".aac",
  ".flac",
  ".pdf",
  ".docx",
  ".zip",
  ".gz",
  ".wasm",
]);

/** JSX and TSX intentionally map onto the TS worker so React syntax resolves. */
export function languageForPath(path: string): string {
  return detectLanguageForPath(path).id;
}

/** Language metadata shared by Monaco, the explorer and the new-file preview. */
export function detectLanguageForPath(path: string): DetectedLanguage {
  const name = basename(path).toLowerCase();

  if (name.startsWith(".env")) {
    return {
      id: "shell",
      label: "Environment",
      logo: "Bash",
      recognized: true,
    };
  }
  if (name === "dockerfile") {
    return {
      id: "dockerfile",
      label: "Dockerfile",
      logo: "Docker",
      recognized: true,
    };
  }

  const definition = LANGUAGE_BY_EXTENSION[extname(path)];
  if (!definition) {
    return {
      id: "plaintext",
      label: "Plain text",
      logo: "Code",
      recognized: false,
    };
  }

  return {
    ...definition,
    logo: definition.logo ?? definition.label,
    recognized: true,
  };
}

const SCHEMA_LANGUAGE: Record<string, FileLanguage> = {
  ".js": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".jsx": "javascriptreact",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "typescriptreact",
  ".css": "css",
  ".html": "html",
  ".htm": "html",
  ".json": "json",
  ".md": "markdown",
};

/** The language name carried in the project schema. */
export function fileLanguage(path: string): FileLanguage {
  return SCHEMA_LANGUAGE[extname(path)] ?? "plaintext";
}

/** Files the compiler can read as source text. */
export function isCompilablePath(path: string): boolean {
  return [
    ".js",
    ".mjs",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".htm",
    ".json",
  ].includes(extname(path));
}

export function mimeForPath(path: string): string {
  return MIME_BY_EXTENSION[extname(path)] ?? "application/octet-stream";
}

export function isBinaryPath(path: string): boolean {
  return BINARY_EXTENSIONS.has(extname(path));
}

export function isImagePath(path: string): boolean {
  return mimeForPath(path).startsWith("image/");
}

export function isVideoPath(path: string): boolean {
  return mimeForPath(path).startsWith("video/");
}

export function isAudioPath(path: string): boolean {
  return mimeForPath(path).startsWith("audio/");
}

export function isPdfPath(path: string): boolean {
  return mimeForPath(path) === "application/pdf";
}

/**
 * Word documents only. The legacy `.doc` binary format is a different thing
 * entirely and is not claimed here.
 */
export function isDocxPath(path: string): boolean {
  return (
    mimeForPath(path) ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

/** Anything the editor previews rather than opening as text. */
export function isPreviewablePath(path: string): boolean {
  return (
    isImagePath(path) ||
    isVideoPath(path) ||
    isAudioPath(path) ||
    isPdfPath(path) ||
    isDocxPath(path)
  );
}
