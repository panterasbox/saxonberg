/**
 * check-gate-strings — lint #1 of the surface-architecture lint family.
 *
 * Every concrete `FromModule('path#Export')` / `FromController(...)`
 * call-security policy string, and every `*_MODULE_ID`-style const that
 * holds one, must resolve to a real module + export under
 * `packages/server/src/` — or, for a path under a capability pack's
 * namespace root, under that pack's `src/` (content-packs, the
 * capability rung; `scripts/pack-roots.ts` is the table). This catches stale gates after a rename (the
 * refactor couples a logic singleton's gate to its Api's module-id *as
 * a string*, with no compiler help on rename — slate Thread 8
 * mitigation #3).
 *
 * Implemented as a standalone WARN script rather than an ESLint rule:
 * the repo is on ESLint 8 *legacy* (.eslintrc) config, where a local
 * rule can only be loaded via `--rulesdir` — which makes every ad-hoc
 * or editor `eslint` invocation that omits the flag error with "rule
 * not found". A script sidesteps that DX landmine and mirrors the
 * already-amended lint #2 (the projection's re-export report). The
 * sibling sealed-subdir check stays a real ESLint rule.
 *
 * Heuristics:
 *   - Glob patterns (containing `*`) are skipped — `ApiOnly` is
 *     `FromModule('mud/api/**')` and resolves to no single file.
 *   - Module-id form is `path#ExportName` (named) or bare `path`
 *     (default export). The file is `<serverSrc>/<path>.ts`.
 *   - Export existence is a source-text check (class / const / function
 *     / interface / type / enum / re-export / default).
 *
 * WARN-only during the sweep (exits 0); flip `EXIT_ON_FINDINGS` to true
 * at the end of P3 to make it CI-failing.
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, relative, resolve as resolvePath } from "path";
import { packSources, classFileOf, packOfClassPath, type PackSource } from "./pack-roots";

const EXIT_ON_FINDINGS = true; // CI-gating (flipped at end of P3)

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_SRC = join(here, "..", "src");
const MUD_ROOT = join(SERVER_SRC, "mud");

const POLICY_CALL = /\b(?:FromModule|FromController)\(\s*['"]([^'"]+)['"]/g;
const MODULE_ID_CONST = /\b\w*MODULE_ID\b\s*=\s*['"]([^'"]+)['"]/g;

interface Finding {
  file: string;
  raw: string;
  reason: string;
}

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      walk(p, out);
    } else if (
      entry.endsWith(".ts") &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".d.ts")
    ) {
      out.push(p);
    }
  }
}

function exportsName(source: string, name: string | null): boolean {
  if (name === null) return /export\s+default\b/.test(source);
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    new RegExp(`export\\s+(?:default\\s+)?(?:abstract\\s+)?class\\s+${n}\\b`),
    new RegExp(`export\\s+(?:const|let|var|function|interface|type|enum)\\s+${n}\\b`),
    new RegExp(`export\\s+(?:type\\s+)?\\{[^}]*\\b(?:as\\s+)?${n}\\b[^}]*\\}`),
  ].some((re) => re.test(source));
}

/**
 * The pure resolution: where a gate's module path lives, or why it
 * cannot. A relative gate string (`./x` / `../x`) resolves against the
 * DECLARING file's directory (the transform bakes it to absolute at
 * load time — see resolveRelativeModuleGates in the loader transform)
 * — except in a capability pack's file, where the transform leaves it
 * alone, so a relative gate there is unresolvable by rule: pack code
 * writes absolute gates. An absolute module id under a registered pack
 * root (`/system/arcana/idea/cmd/…`) resolves into that pack's `src/`; any
 * other is `mud`-rooted, leading-slash (`/platform/…`) — drop the slash
 * and resolve under src/mud/. Exported for the test beside this script.
 */
export function gateFileOf(
  modulePath: string,
  file: string,
  sources: readonly PackSource[],
  mudRoot: string = MUD_ROOT,
): { base: string } | { error: string } {
  const inPack = sources.some((p) => file.startsWith(p.srcDir + "/") || file.startsWith(p.srcDir + "\\"));
  if (modulePath.startsWith(".")) {
    if (inPack) {
      return {
        error: `relative gate '${modulePath}' in a capability pack file — pack code writes absolute gates (/<root>/…)`,
      };
    }
    return { base: resolvePath(dirname(file), modulePath) };
  }
  const owner = packOfClassPath(modulePath, sources);
  if (owner) {
    return { base: classFileOf(modulePath, sources, mudRoot).replace(/\.ts$/, "") };
  }
  return { base: join(mudRoot, modulePath.replace(/^\//, "")) };
}

function checkString(raw: string, file: string, findings: Finding[], sources: readonly PackSource[]): void {
  if (raw.includes("*") || !raw.includes("/")) return;
  const hashAt = raw.indexOf("#");
  const modulePath = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const exportName = hashAt === -1 ? null : raw.slice(hashAt + 1);

  const resolved = gateFileOf(modulePath, file, sources);
  if ("error" in resolved) {
    findings.push({ file, raw, reason: resolved.error });
    return;
  }
  const base = resolved.base;
  const candidates = [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")];
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    const owner = packOfClassPath(modulePath, sources);
    findings.push({
      file,
      raw,
      reason: owner
        ? `module '${modulePath}' does not exist under pack '${owner.pack.id}' src/ (${owner.pack.srcDir})`
        : `module '${modulePath}' does not exist under packages/server/src/mud`,
    });
    return;
  }
  if (!exportsName(readFileSync(found, "utf8"), exportName)) {
    findings.push({
      file,
      raw,
      reason: `export '${exportName ?? "default"}' not found in '${modulePath}'`,
    });
  }
}

function main(): void {
  const files: string[] = [];
  walk(MUD_ROOT, files);
  const sources = packSources();
  // A capability pack's src/ carries gates too (`/system/arcana/idea/cmd/…`).
  for (const pack of sources) walk(pack.srcDir, files);

  const findings: Finding[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const re of [POLICY_CALL, MODULE_ID_CONST]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(source)) !== null) {
        checkString(m[1]!, file, findings, sources);
      }
    }
  }

  if (findings.length === 0) {
    console.log(
      `check-gate-strings: all FromModule/FromController gate strings resolve (${files.length} files scanned).`
    );
    return;
  }

  console.warn(
    `\n[lint #1 — ${EXIT_ON_FINDINGS ? "ERROR" : "WARN"}] ${findings.length} ` +
      `unresolved call-security gate string(s):`
  );
  for (const f of findings) {
    console.warn(`  ${relative(SERVER_SRC, f.file)}: '${f.raw}' — ${f.reason}`);
  }
  if (EXIT_ON_FINDINGS) process.exit(1);
}

if (process.argv[1] && /check-gate-strings\.ts$/.test(process.argv[1])) main();
