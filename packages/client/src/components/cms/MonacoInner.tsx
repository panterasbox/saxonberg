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

// Strip the leading '#' Monaco's theme API wants raw 6-hex with no hash;
// our tokens are CSS hex strings. This keeps the token file the single
// color source rather than re-hardcoding hexes here.
function hex(token: string): string {
  return token.replace(/^#/, "");
}

const THEME_NAME = "saxonberg-cms-dark";

const handleBeforeMount: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": `#${hex(tokens.color.surfaceSunken)}`,
      "editor.foreground": `#${hex(tokens.color.fg)}`,
      "editorLineNumber.foreground": `#${hex(tokens.color.fgMuted)}`,
      "editorCursor.foreground": `#${hex(tokens.color.accent)}`,
      "editor.selectionBackground": `#${hex(tokens.color.surfaceAlt)}`,
    },
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
