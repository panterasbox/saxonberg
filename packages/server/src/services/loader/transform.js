/**
 * Source-level transform that appends a `ModuleApi.stamp(...)`
 * call to the bottom of every TS module in the codebase. Shared
 * between the Vitest plugin (`vite-plugin.js`) and the Node loader
 * hook (`loader-hook.js`) so production and test paths produce
 * identical instrumentation.
 *
 * Plain JS by necessity: the loader-hook runs in a Node worker thread
 * loaded by `module.register()`, which only accepts a JS module URL.
 * Keeping the shared transform in JS too avoids a parallel TS→JS build
 * step that the loader infra would otherwise need.
 *
 * Algorithm:
 *   1. Parse the source with the TypeScript compiler API.
 *   2. Walk the top-level statements for class exports.
 *   3. If any are found, append:
 *        import { ModuleApi as __callSecModuleApi } from '<rel>/api/module';
 *        __callSecModuleApi.stamp(import.meta.url, { Foo, Bar });
 *
 * Skipped:
 *   - Re-exports (`export { Foo } from './x'` / `export * from './x'`)
 *     — the originating module is what should be stamped.
 *   - Class expressions assigned to const (`export const Foo = class`).
 *   - Function-call results (`export const Bag = ContainerMixin(Thing)`).
 *   - The framework's own bootstrap files — `mud/lib/security/` and
 *     `mud/api/{execution-context,module,security,proxy}.ts` — which
 *     would form load-time cycles.
 *   - Any file with zero class exports.
 */

import * as ts from 'typescript';
import * as path from 'node:path';

/**
 * Compute the source-relative path used in the appended `import` to
 * reach `<src>/mud/api/module`. We can't bake an absolute path or
 * a bare specifier — both break either tsx or Vitest.
 *
 * @param {string} fileUrl
 * @returns {string}
 */
export function computeRegistryImportPath(fileUrl) {
  const rawPath = fileUrl.startsWith('file://')
    ? new URL(fileUrl).pathname
    : fileUrl;
  // The result is embedded as a string literal in generated source —
  // `from '../../api/module'`. Backslashes there would be parsed as
  // JS escape sequences (`\m` → `m`, collapsing the path). Force
  // forward slashes throughout so the emitted import is well-formed
  // on every platform.
  const filePath = rawPath.replace(/\\/g, '/');
  const fileDir = path.dirname(filePath);
  const srcRootIdx = filePath.indexOf('/mud/');
  if (srcRootIdx < 0) {
    // Outside the mud tree (shouldn't happen — we filter earlier).
    // Return a best-effort relative path; the stamp won't resolve
    // and the import will throw, surfacing the bad include rule.
    return './ModuleApi';
  }
  const srcRoot = filePath.slice(0, srcRootIdx);
  const registryPath = path.posix.join(srcRoot, 'mud/api/module');
  let rel = path.posix.relative(fileDir, registryPath);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel;
}

/**
 * Decide whether `fileUrl` should be transformed.
 *
 * @param {string} fileUrl
 * @returns {boolean}
 */
export function shouldTransform(fileUrl) {
  const rawPath = fileUrl.startsWith('file://')
    ? new URL(fileUrl).pathname
    : fileUrl;
  const filePath = rawPath.replace(/\\/g, '/');
  if (!filePath.endsWith('.ts')) return false;
  if (filePath.endsWith('.d.ts')) return false;
  if (filePath.includes('/node_modules/')) return false;
  if (filePath.includes('/mud/lib/security/')) return false;
  // The framework's own Api files — auto-stamping them would form a
  // load-time cycle since the auto-injected `ModuleApi.stamp(...)`
  // imports back into module.ts.
  if (/\/mud\/api\/(execution-context|module|security|proxy)\.ts$/.test(filePath)) return false;
  if (!filePath.includes('/mud/')) return false;
  return true;
}

/**
 * Parse `source` and return the names of every export that might be a
 * class. Includes:
 *
 *   - Raw-TS `export class Foo {}` declarations (vite-plugin path,
 *     sees pre-compilation source).
 *   - Compiled-JS `export { Foo, Bar }` clauses (loader-hook path,
 *     sees post-tsx output where decorated classes have been rewritten
 *     into `const _Foo = class { ... }; let Foo = _Foo;` form and
 *     `export class Foo {}` becomes `class Foo {} ... export { Foo }`
 *     at the bottom).
 *
 * The returned list is over-inclusive on purpose: we accept any
 * locally-defined binding that appears in an `export { ... }` clause,
 * not just things we can syntactically confirm are classes. The
 * downstream `ModuleApi.stamp()` filters by `typeof value !==
 * 'function'`, so non-class exports in the object literal are
 * harmlessly skipped at stamp time. The alternative — tracking the
 * alias chain through compiled output — was more code and less robust.
 *
 * Re-exports (`export { Foo } from './other'`) are still excluded —
 * those should be stamped at the originating module, not here.
 *
 * @param {string} source
 * @param {string} fileName
 * @returns {string[]}
 */
export function findExportedClassNames(source, fileName) {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, false);
  const exported = [];

  // Track local bindings (any kind) so we can reject re-exports later
  // and recognise default exports of locally-declared symbols.
  const localBindings = new Set();
  const localClasses = new Set();

  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      localBindings.add(stmt.name.text);
      localClasses.add(stmt.name.text);
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          localBindings.add(decl.name.text);
        }
      }
    }
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      localBindings.add(stmt.name.text);
    }
  }

  for (const stmt of sf.statements) {
    // `export class Foo { ... }` — direct named export (raw TS source).
    if (
      ts.isClassDeclaration(stmt) &&
      stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const isDefault = stmt.modifiers.some(
        (m) => m.kind === ts.SyntaxKind.DefaultKeyword
      );
      if (isDefault) {
        exported.push('default');
      } else if (stmt.name) {
        exported.push(stmt.name.text);
      }
      continue;
    }

    // `export { Foo, Bar as Baz }` — named export of locally-defined
    // bindings (covers both raw-TS re-exports of class declarations
    // AND compiled-JS bottom-of-file re-exports of decorated classes
    // that got rewritten into `let X = _X` aliases). Skip module-
    // specifier re-exports (`export { Foo } from './other'`).
    if (
      ts.isExportDeclaration(stmt) &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause) &&
      !stmt.moduleSpecifier
    ) {
      for (const spec of stmt.exportClause.elements) {
        const localName = spec.propertyName?.text ?? spec.name.text;
        const exportName = spec.name.text;
        // Include if it's any locally-defined binding. `ModuleApi.stamp`
        // filters non-functions at stamp time, so we don't have to
        // syntactically verify class-ness here.
        if (localBindings.has(localName)) {
          exported.push(exportName);
        }
      }
    }

    // `export default Foo` where Foo is a previously-declared class.
    if (
      ts.isExportAssignment(stmt) &&
      !stmt.isExportEquals &&
      ts.isIdentifier(stmt.expression) &&
      localClasses.has(stmt.expression.text)
    ) {
      exported.push('default');
    }
  }

  return exported;
}

/**
 * Rewrite RELATIVE `FromModule('./x' | '../x')` gate strings to their
 * absolute, mud-rooted form (`/obj/.../x`), resolved against the
 * **declaring file's own module directory**. Absolute globs (`/obj/…`)
 * and non-`FromModule` strings are untouched.
 *
 * This is what lets a narrow-entry gate be written relative to the file
 * it lives in — "a caller in my directory / subtree" — that survives a
 * directory rename, while the runtime matcher (`FromModule` →
 * `PathPatternApi`) only ever sees absolute globs. Resolution happens
 * here at transform time because the policy object is built once at
 * module load, detached from its declaring file; the file's own path is
 * in hand right here, so we bake the absolute form in and keep the
 * runtime dumb. Only `FromModule` supports relative — `FromTemplate` is
 * clone lineage, not file-relative.
 *
 * @param {string} source
 * @param {string} fileUrl
 * @returns {string}
 */
export function resolveRelativeModuleGates(source, fileUrl) {
  const rawPath = fileUrl.startsWith('file://')
    ? new URL(fileUrl).pathname
    : fileUrl;
  const filePath = rawPath.replace(/\\/g, '/');
  const mudIdx = filePath.indexOf('/mud/');
  if (mudIdx < 0) return source;
  // The declaring module's own mud-rooted id (leading slash, no ext),
  // then its directory — the base for `./` / `../` resolution.
  const selfId =
    '/' +
    filePath.slice(mudIdx + '/mud/'.length).replace(/\.(ts|tsx|js|mjs|cjs)$/, '');
  const moduleDir = path.posix.dirname(selfId);
  return source.replace(
    /(FromModule\(\s*)(['"])(\.\.?\/[^'"]*)\2/g,
    (_m, pre, quote, rel) =>
      `${pre}${quote}${path.posix.resolve(moduleDir, rel)}${quote}`
  );
}

/**
 * Apply the transform. Returns the original source unchanged if there
 * are no class exports or the file is skipped.
 *
 * @param {string} source
 * @param {string} fileUrl
 * @returns {string}
 */
export function transformSource(source, fileUrl) {
  if (!shouldTransform(fileUrl)) return source;
  // Relative-gate rewrite is orthogonal to stamping and applies even to
  // files with no class exports — do it first, on the source everything
  // else sees.
  source = resolveRelativeModuleGates(source, fileUrl);
  const fileName = fileUrl.startsWith('file://')
    ? new URL(fileUrl).pathname
    : fileUrl;
  const exports = findExportedClassNames(source, fileName);
  if (exports.length === 0) return source;

  const registryPath = computeRegistryImportPath(fileUrl);
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, false);
  const fields = [];
  for (const exportName of exports) {
    if (exportName === 'default') {
      const local = findDefaultExportLocalName(sf);
      if (local) {
        fields.push(`default: ${local}`);
      }
    } else {
      const local = findLocalNameForExport(sf, exportName);
      fields.push(`${exportName}: ${local ?? exportName}`);
    }
  }
  if (fields.length === 0) return source;

  const importLine =
    `import { ModuleApi as __callSecModuleApi } from '${registryPath}';\n`;
  const stampLine =
    `\n\n// === call-security: auto-injected stamp call ===\n` +
    `__callSecModuleApi.stamp(import.meta.url, { ${fields.join(', ')} });\n`;
  return importLine + source + stampLine;
}

/**
 * @param {ts.SourceFile} sf
 * @returns {string | null}
 */
function findDefaultExportLocalName(sf) {
  for (const stmt of sf.statements) {
    if (
      ts.isClassDeclaration(stmt) &&
      stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
    ) {
      return stmt.name?.text ?? null;
    }
    if (
      ts.isExportAssignment(stmt) &&
      !stmt.isExportEquals &&
      ts.isIdentifier(stmt.expression)
    ) {
      return stmt.expression.text;
    }
  }
  return null;
}

/**
 * @param {ts.SourceFile} sf
 * @param {string} exportName
 * @returns {string | null}
 */
function findLocalNameForExport(sf, exportName) {
  for (const stmt of sf.statements) {
    if (
      ts.isClassDeclaration(stmt) &&
      stmt.name?.text === exportName &&
      stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      return exportName;
    }
  }
  for (const stmt of sf.statements) {
    if (
      ts.isExportDeclaration(stmt) &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause)
    ) {
      for (const spec of stmt.exportClause.elements) {
        if (spec.name.text === exportName) {
          return spec.propertyName?.text ?? spec.name.text;
        }
      }
    }
  }
  return exportName;
}
