import type * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

/**
 * Feeds React's type declarations to Monaco.
 *
 * Projects have no node_modules, so the editor mounts the `.d.ts` files under
 * the paths TypeScript would have looked in. That is what makes `useState`,
 * `ReactNode` and `CSSProperties` resolve and autocomplete.
 */

const TYPE_FILES: Array<[url: string, virtualPath: string]> = [
  ['/types/@types/react/index.d.ts', 'file:///node_modules/@types/react/index.d.ts'],
  ['/types/@types/react/global.d.ts', 'file:///node_modules/@types/react/global.d.ts'],
  ['/types/@types/react/canary.d.ts', 'file:///node_modules/@types/react/canary.d.ts'],
  [
    '/types/@types/react/experimental.d.ts',
    'file:///node_modules/@types/react/experimental.d.ts',
  ],
  ['/types/@types/react/jsx-runtime.d.ts', 'file:///node_modules/@types/react/jsx-runtime.d.ts'],
  ['/types/@types/react-dom/index.d.ts', 'file:///node_modules/@types/react-dom/index.d.ts'],
  ['/types/@types/react-dom/client.d.ts', 'file:///node_modules/@types/react-dom/client.d.ts'],
  ['/types/@types/react-dom/canary.d.ts', 'file:///node_modules/@types/react-dom/canary.d.ts'],
  [
    '/types/@types/react-dom/experimental.d.ts',
    'file:///node_modules/@types/react-dom/experimental.d.ts',
  ],
  ['/types/csstype/index.d.ts', 'file:///node_modules/csstype/index.d.ts'],
];

/** Minimal package manifests, so bare `react` imports resolve to the types. */
const MANIFESTS: Array<[virtualPath: string, contents: string]> = [
  [
    'file:///node_modules/@types/react/package.json',
    JSON.stringify({ name: '@types/react', version: '19.0.0', types: 'index.d.ts' }),
  ],
  [
    'file:///node_modules/@types/react-dom/package.json',
    JSON.stringify({ name: '@types/react-dom', version: '19.0.0', types: 'index.d.ts' }),
  ],
  [
    'file:///node_modules/csstype/package.json',
    JSON.stringify({ name: 'csstype', version: '3.0.0', types: 'index.d.ts' }),
  ],
];

let loaded: Promise<void> | null = null;

export function loadReactTypes(instance: typeof monaco): Promise<void> {
  if (loaded) return loaded;

  loaded = (async () => {
    const defaults = instance.languages.typescript.typescriptDefaults;

    for (const [path, contents] of MANIFESTS) defaults.addExtraLib(contents, path);

    const sources = await Promise.all(
      TYPE_FILES.map(async ([url, virtualPath]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;
          return [await response.text(), virtualPath] as const;
        } catch {
          // IntelliSense degrades; editing still works.
          return null;
        }
      }),
    );

    for (const source of sources) {
      if (!source) continue;
      defaults.addExtraLib(source[0], source[1]);
    }

    /*
     * Resolution can only succeed once the declarations are mounted, so
     * semantic checking is switched on here rather than at editor creation.
     */
    defaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      // "Cannot find module './styles.css'" is noise: the compiler handles CSS.
      diagnosticCodesToIgnore: [2307, 7016, 2306],
    });
  })();

  return loaded;
}
