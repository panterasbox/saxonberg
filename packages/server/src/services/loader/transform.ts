/**
 * Source-level transform that appends a `ModuleApi.stamp(...)`
 * call to the bottom of every TS module in the codebase. Shared
 * between the Vitest plugin (`vite-plugin-callsec.ts`) and the Node
 * loader hook (`loader-hook.ts`) so production and test paths produce
 * identical instrumentation.
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
 *   - Class expressions assigned to const (`export const Foo = class`)
 *     — uncommon; would require evaluating to know it's a class.
 *   - Function-call results (`export const Bag = ContainerMixin(Thing)`)
 *     — same reason.
 *   - The framework's own `mud/lib/security/` directory — those files
 *     bootstrap the registry and would form circular imports.
 *   - Any file with zero class exports.
 *
 * The transform is intentionally minimal: it only knows about TS class
 * declarations and the limited export forms above. Anything more
 * complex passes through unchanged and just won't be stamped (callers
 * of un-stamped classes fail closed in identity-keyed policies, which
 * is the desired tamper-resistant default).
 */

import * as ts from 'typescript';
import * as path from 'node:path';

/**
 * Compute the source-relative path used in the appended `import` to
 * reach `<src>/mud/api/module`. We can't bake an absolute path or
 * a bare specifier — both break either tsx or Vitest. Relative path
 * computed from `fileUrl`.
 */
export function computeRegistryImportPath(fileUrl: string): string {
  const rawPath = fileUrl.startsWith('file://')
    ? new URL(fileUrl).pathname
    : fileUrl;
  // The result is embedded as a string literal in generated source —
  // `from '../../api/module'`. Backslashes there would be parsed as
  // JS escape sequences (`\m` → `m`, collapsing the path). Force
  // forward slashes throughout so the emitted import is well-formed
  // on every platform.
  const filePath = rawPath.replace(/\\/g, '/');
  // Locate the source root anywhere in the path. `ModuleApi` lives
  // at `<srcRoot>/mud/api/module`. Build a relative path from the
  // importing file's directory to that module.
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
 * Decide whether `fileUrl` should be transformed. Files inside the
 * security framework itself (mud/lib/security/) and the framework's
 * own Api modules (ExecutionContextApi, ModuleApi) are skipped because
 * they bootstrap the registry — wrapping them would mean a module
 * stamping itself before its own `ModuleApi` import has finished
 * loading. Declaration files and node_modules are also skipped.
 */
export function shouldTransform(fileUrl: string): boolean {
  const rawPath = fileUrl.startsWith('file://')
    ? new URL(fileUrl).pathname
    : fileUrl;
  // Match the forward-slash includes() probes below regardless of
  // whether the loader handed us a Windows-style path.
  const filePath = rawPath.replace(/\\/g, '/');
  if (!filePath.endsWith('.ts')) return false;
  if (filePath.endsWith('.d.ts')) return false;
  if (filePath.includes('/node_modules/')) return false;
  if (filePath.includes('/mud/lib/security/')) return false;
  // The framework's own Api files — auto-stamping them would form a
  // load-time cycle since the auto-injected `ModuleApi.stamp(...)`
  // imports back into module.ts. SecurityApi is in the same boat —
  // module.ts imports SecurityApi.getFinalMethods, so stamping
  // security.ts would push its module.ts import into a tighter cycle
  // and leave `ModuleApi` undefined when the stamp call fires.
  if (/\/mud\/api\/(execution-context|module|security|proxy)\.ts$/.test(filePath)) return false;
  // Only transform files inside the mud tree. The backend layer can
  // be added later if it needs class-identity matching; today it
  // doesn't, and skipping it avoids over-instrumenting auth/HTTP
  // boilerplate.
  if (!filePath.includes('/mud/')) return false;
  return true;
}

/**
 * Parse `source` as TypeScript and return the names of every class
 * exported by the module. Uses the `typescript` package's parser so
 * generics, decorators, and modern syntax are all handled.
 *
 * Returns the export *name* (not the local class name) — for
 * `export { Foo as Bar }`, returns `Bar`. For `export default class
 * Foo`, returns `default`. The caller chooses how to format the
 * canonical id.
 */
export function findExportedClassNames(source: string, fileName: string): string[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, false);
  const exported: string[] = [];
  // Track local class declarations so `export { Foo }` patterns can
  // verify that the local Foo really is a class (we don't want to
  // stamp non-class values).
  const localClasses = new Set<string>();

  for (const stmt of sf.statements) {
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      localClasses.add(stmt.name.text);
    }
  }

  for (const stmt of sf.statements) {
    // `export class Foo { ... }` — direct named export.
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
    // bindings. Skip re-exports (`export { Foo } from './other'`) —
    // those have a `moduleSpecifier`.
    if (
      ts.isExportDeclaration(stmt) &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause) &&
      !stmt.moduleSpecifier
    ) {
      for (const spec of stmt.exportClause.elements) {
        const localName = spec.propertyName?.text ?? spec.name.text;
        const exportName = spec.name.text;
        if (localClasses.has(localName)) {
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
 * Apply the transform. Returns the original source unchanged if there
 * are no class exports or the file is skipped. Otherwise returns the
 * source with import + stamp call appended.
 *
 * The appended snippet uses a synthetic identifier (`__callSecStamp`)
 * to avoid colliding with anything the source might already use.
 * `import.meta.url` is set by the loader, never by user code.
 */
export function transformSource(source: string, fileUrl: string): string {
  if (!shouldTransform(fileUrl)) return source;
  const fileName = fileUrl.startsWith('file://')
    ? new URL(fileUrl).pathname
    : fileUrl;
  const exports = findExportedClassNames(source, fileName);
  if (exports.length === 0) return source;

  const registryPath = computeRegistryImportPath(fileUrl);
  // Build the object literal for stamping. `default` exports are
  // referenced via the local class binding; we need to dig that out
  // from the AST again — but for v1 simplicity, we re-parse and look
  // for the local name backing the default.
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2022, false);
  const fields: string[] = [];
  for (const exportName of exports) {
    if (exportName === 'default') {
      const local = findDefaultExportLocalName(sf);
      if (local) {
        fields.push(`default: ${local}`);
      }
    } else {
      // For `export { Foo as Bar }` exportName is the export side; the
      // local binding is the class declaration's name. Resolve it.
      const local = findLocalNameForExport(sf, exportName);
      fields.push(`${exportName}: ${local ?? exportName}`);
    }
  }
  if (fields.length === 0) return source;

  // ESM allows top-level imports anywhere in the source, but some
  // tools — and most readers — expect them at the top. Inject the
  // import at the top, the stamp call at the bottom (where every
  // class binding it references is guaranteed to exist).
  const importLine =
    `import { ModuleApi as __callSecModuleApi } from '${registryPath}';\n`;
  const stampLine =
    `\n\n// === call-security: auto-injected stamp call ===\n` +
    `__callSecModuleApi.stamp(import.meta.url, { ${fields.join(', ')} });\n`;
  return importLine + source + stampLine;
}

function findDefaultExportLocalName(sf: ts.SourceFile): string | null {
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

function findLocalNameForExport(
  sf: ts.SourceFile,
  exportName: string
): string | null {
  // Direct `export class Foo` — local name === export name.
  for (const stmt of sf.statements) {
    if (
      ts.isClassDeclaration(stmt) &&
      stmt.name?.text === exportName &&
      stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      return exportName;
    }
  }
  // `export { Foo as Bar }` — find the spec, return its propertyName.
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
