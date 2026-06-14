/**
 * ESLint rule: from-module-resolves
 *
 * Every concrete `FromModule('path#Export')` / `FromController(...)`
 * security-policy string — and every `*_MODULE_ID`-style const that
 * holds one — must resolve to a real module + export under
 * `packages/server/src/`. This catches stale call-security gates after
 * a rename (the surface-architecture refactor couples a logic
 * singleton's gate to its Api's module-id *as a string*, with no
 * compiler help on rename — slate Thread 8 mitigation #3).
 *
 * Heuristics, deliberately:
 *   - Glob patterns (containing `*`) are skipped — `ApiOnly` is
 *     `FromModule('mud/api/**')` and resolves to no single file.
 *   - Module-id form is `path#ExportName` (named) or bare `path`
 *     (default export). The file is `<serverSrc>/<path>.ts`.
 *   - Export existence is a source-text check (handles `export class`,
 *     `export const/function/interface/type/enum`, `export { X }`,
 *     `export { Y as X }`, `export … from` re-exports, and
 *     `export default` for the bare-path form). Source-text rather than
 *     a full parse keeps the rule fast and type-info-free.
 *
 * WARN-only during the surface-architecture sweep (so intermediate
 * commits don't red CI); flipped to error at the end of P3.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const POLICY_CALLEES = new Set(["FromModule", "FromController"]);

/** Find the `.../packages/server/src` root from a linted file path. */
function serverSrcRoot(filename) {
  const marker = `${path.sep}packages${path.sep}server${path.sep}src${path.sep}`;
  const idx = filename.indexOf(marker);
  if (idx === -1) return null;
  return filename.slice(0, idx + marker.length - 1);
}

/** Does `source` export a symbol named `name` (default-export aware)? */
function exportsName(source, name) {
  if (name === null) {
    // bare-path form → default export
    return /export\s+default\b/.test(source);
  }
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`export\\s+(?:default\\s+)?(?:abstract\\s+)?class\\s+${n}\\b`),
    new RegExp(`export\\s+(?:const|let|var|function|interface|type|enum)\\s+${n}\\b`),
    // export { X } / export { Y as X } / export type { X }
    new RegExp(`export\\s+(?:type\\s+)?\\{[^}]*\\b(?:as\\s+)?${n}\\b[^}]*\\}`),
  ];
  return patterns.some((re) => re.test(source));
}

/** Parse `path#Export` (or bare `path`) → { modulePath, exportName }. */
function parseModuleId(raw) {
  const hashAt = raw.indexOf("#");
  if (hashAt === -1) return { modulePath: raw, exportName: null };
  return {
    modulePath: raw.slice(0, hashAt),
    exportName: raw.slice(hashAt + 1),
  };
}

function checkLiteral(context, node, raw) {
  if (typeof raw !== "string" || raw.length === 0) return;
  // Skip globs and non-module-looking strings.
  if (raw.includes("*")) return;
  if (!raw.includes("/")) return;

  const filename = context.filename ?? context.getFilename();
  const srcRoot = serverSrcRoot(filename);
  if (!srcRoot) return;

  const { modulePath, exportName } = parseModuleId(raw);
  const fileBase = path.join(srcRoot, modulePath);
  const candidates = [`${fileBase}.ts`, `${fileBase}.tsx`, path.join(fileBase, "index.ts")];
  const found = candidates.find((p) => fs.existsSync(p));

  if (!found) {
    context.report({
      node,
      messageId: "noModule",
      data: { raw, modulePath },
    });
    return;
  }

  const source = fs.readFileSync(found, "utf8");
  if (!exportsName(source, exportName)) {
    context.report({
      node,
      messageId: "noExport",
      data: { raw, exportName: exportName ?? "default", modulePath },
    });
  }
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "FromModule / FromController policy strings must resolve to a real module + export",
    },
    schema: [],
    messages: {
      noModule:
        "FromModule policy '{{raw}}' references module '{{modulePath}}', which does not exist under packages/server/src.",
      noExport:
        "FromModule policy '{{raw}}' references export '{{exportName}}', which '{{modulePath}}' does not export.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee;
        const name =
          callee.type === "Identifier"
            ? callee.name
            : callee.type === "MemberExpression" &&
              callee.property.type === "Identifier"
            ? callee.property.name
            : null;
        if (!name || !POLICY_CALLEES.has(name)) return;
        for (const arg of node.arguments) {
          if (arg.type === "Literal" && typeof arg.value === "string") {
            checkLiteral(context, arg, arg.value);
          }
        }
      },
      // `const FOO_API_MODULE_ID = 'mud/api/foo#FooApi';`
      VariableDeclarator(node) {
        if (
          node.id.type === "Identifier" &&
          /MODULE_ID$/.test(node.id.name) &&
          node.init &&
          node.init.type === "Literal" &&
          typeof node.init.value === "string"
        ) {
          checkLiteral(context, node.init, node.init.value);
        }
      },
    };
  },
};
