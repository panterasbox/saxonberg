/**
 * MonacoInner — the actual Monaco editor mount. Imported ONLY through
 * the `React.lazy` dynamic import in {@link MonacoLazy}, so Monaco's large
 * bundle code-splits into its own Vite chunk loaded on first editor mount,
 * never on initial app load.
 *
 * Stock language support only (TypeScript / JSON / YAML defaults) — no
 * engine `.d.ts` feed in this build (deferred to the authoring-
 * intelligence slate). Themed to roughly match the dark cockpit surface
 * via a one-off custom theme derived from `tokens` (no hex literals at
 * the component layer).
 */

import React from "react";
import Editor, {
  loader,
  type BeforeMount,
  type OnChange,
} from "@monaco-editor/react";
import * as monaco from "monaco-editor";
// Vite-native Monaco web workers: `?worker` imports make Vite emit each
// worker as its own bundled asset. Without these, Monaco's language
// services fall back to the main thread and log a console warning. Only
// the workers for the languages this build supports are wired (JSON +
// TS/JS); everything else uses the generic editor worker.
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { tokens } from "../ui";

// Bundle Monaco locally rather than fetching it from a CDN at runtime
// (the `@monaco-editor/react` default). Pointing the loader at the
// installed `monaco-editor` makes Vite include it in THIS lazy chunk, so
// the whole editor — wrapper + engine — code-splits together and loads
// only when this module is first imported (the editor card mounting).
loader.config({ monaco });

// Route Monaco's worker requests to the Vite-bundled workers. `yaml`
// has no dedicated worker in stock monaco-editor (it's a TextMate-style
// grammar with no language service), so it falls through to the default.
(
  self as unknown as { MonacoEnvironment?: monaco.Environment }
).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === "json") return new JsonWorker();
    if (label === "typescript" || label === "javascript") {
      return new TsWorker();
    }
    return new EditorWorker();
  },
};

export interface MonacoInnerProps {
  language: string;
  value: string;
  onChange: (text: string) => void;
}

/**
 * ⚠⚠ **Monaco's theme API is a NON-CSS context**, and `tokens.color.*`
 * stopped being hex the day the civic palette landed — every one of them
 * is now a `var(--sx-…)` reference. `tokens.ts` warns about exactly this
 * ("do not write one into a non-CSS context … both break with no type
 * error"); this file's own comment still claimed *"our tokens are CSS
 * hex strings"*, which had quietly become false.
 *
 * The result was `#var(--sx-fg)` handed to `defineTheme`, Monaco
 * throwing `Illegal value for token color`, and — with no error boundary
 * above it — **the entire app unmounting to a white screen** the moment
 * a file was opened in the CMS. Found by driving the authoring card.
 *
 * So resolve the variable against the live document — the only place its
 * value exists — and refuse to emit anything that is not a literal
 * `#rrggbb`.
 *
 * ⭐ **A colour that will not resolve is OMITTED, not defaulted.** The
 * obvious repair was a table of fallback hexes, and `noHexLiterals`
 * rejects it — correctly: a literal here is a colour that cannot repaint
 * when the theme changes, which is the whole reason the palette became
 * `var()` in the first place. `inherit: true` means an unspecified key
 * takes `vs-dark`'s own value, so omitting is both safe and the only
 * option that cannot drift from the palette.
 */

/** A token resolved to a literal `#rrggbb`, or `null` if it cannot be. */
function resolveColor(token: string): string | null {
  const direct = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  if (direct.test(token)) return token;
  const name = /^var\(\s*(--[\w-]+)\s*\)$/.exec(token.trim());
  if (!name || typeof window === "undefined") return null;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name[1]!)
    .trim();
  return direct.test(value) ? value : null;
}

const THEME_NAME = "saxonberg-cms-dark";

const handleBeforeMount: BeforeMount = (monaco) => {
  const wanted: Record<string, string> = {
    "editor.background": tokens.color.surfaceSunken,
    "editor.foreground": tokens.color.fg,
    "editorLineNumber.foreground": tokens.color.fgMuted,
    "editorCursor.foreground": tokens.color.accent,
    "editor.selectionBackground": tokens.color.surfaceAlt,
  };
  const colors: Record<string, string> = {};
  for (const [key, token] of Object.entries(wanted)) {
    const resolved = resolveColor(token);
    if (resolved !== null) colors[key] = resolved;
  }
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors,
  });
};

const MonacoInner: React.FC<MonacoInnerProps> = ({
  language,
  value,
  onChange,
}) => {
  const handleChange: OnChange = (next) => {
    onChange(next ?? "");
  };

  return (
    <Editor
      language={language}
      value={value}
      onChange={handleChange}
      beforeMount={handleBeforeMount}
      theme={THEME_NAME}
      options={{
        fontFamily: tokens.font.mono,
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      }}
      height="100%"
      width="100%"
    />
  );
};

export default MonacoInner;
