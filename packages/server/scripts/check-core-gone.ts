/**
 * check-core-gone — the `core` group is dead (content-packs wave 3, D1).
 *
 * `core` did five jobs: rung 3 of `ownerOf` (the untitled default), the
 * fail-open behind every `can`, `broadcast`'s gate, the soul catalogue's
 * gate, the "author tier" and `:admin`. Every one is gone: an untitled
 * path is untitled (`ownerOf` → null, `can` fails closed), forced
 * messaging and the emote catalogue are title, capability is title over
 * a resource, and resolving MQL is never a permission. This gate keeps it
 * dead:
 *
 *   1. No source, script, content or e2e line names the literal
 *      (`'core'` / `"core"` / `name: core` / `coreMemberIds`) — except a
 *      line carrying the `migration-note:` marker (the one `grant`
 *      branch that hands a `core`-held title over, deleted in wave 4).
 *   2. `ParcelOwner` is exactly the kinds `group`, `player`, `organization`.
 *   3. `pack-installers` appears in no pack.yaml and no source — the
 *      committee folded into the executive.
 *   4. `requiresCoreAccess.ts` and `requiresAuthor.ts` do not exist.
 *   5. No `isAuthor(` on `AccessApi` / `AccessLogic` / `AccessRegistry`
 *      (the composition predicate `MixinApi.isAuthor` is a mixin check
 *      and stays).
 *
 * The `check-test-content.ts` shape: a walk, an exported pure `classify`,
 * a `--lint` mode, and a test beside it. CI-gating.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = join(HERE, "..");
const REPO_ROOT = join(SERVER_DIR, "..", "..");
const SCAN_ROOTS = [
  join(SERVER_DIR, "src"),
  join(SERVER_DIR, "scripts"),
  join(REPO_ROOT, "packages", "content"),
  join(REPO_ROOT, "e2e"),
];
const EXT_RE = /\.(ts|mjs|yaml)$/;

/** A line that names the dead group. */
export const CORE_RE = /'core'|"core"|\bname:\s*core\b|\bcoreMemberIds\b/;
/** The one exemption: a marked migration branch (deleted in wave 4). */
export const MARKER = "migration-note:";
export const PACK_INSTALLERS_RE = /pack-installers/;
export const DEAD_FILES = [
  "packages/server/src/mud/lib/command/validators/requiresCoreAccess.ts",
  "packages/server/src/mud/lib/command/validators/requiresAuthor.ts",
];
export const AUTHOR_TIER_FILES = [
  "packages/server/src/mud/api/access.ts",
  "packages/server/src/mud/obj/api/AccessLogic.ts",
  "packages/server/src/mud/obj/AccessRegistry.ts",
];
export const PARCEL_OWNER_FILE = "packages/server/src/mud/lib/parcel/ParcelRecord.ts";
export const PARCEL_OWNER_KINDS = ["group", "player", "organization"];

export interface Finding {
  path: string;
  line: number;
  rule: string;
  text: string;
}

/** The pure decision core over `{path, text}` files (repo-relative paths). */
export function classify(
  files: ReadonlyArray<{ path: string; text: string }>,
): Finding[] {
  const out: Finding[] = [];
  const byPath = new Map(files.map((f) => [f.path, f.text]));
  for (const f of files) {
    const lines = f.text.split("\n");
    lines.forEach((text, i) => {
      if (CORE_RE.test(text) && !text.includes(MARKER)) {
        out.push({ path: f.path, line: i + 1, rule: "core-literal", text: text.trim() });
      }
      if (PACK_INSTALLERS_RE.test(text)) {
        out.push({ path: f.path, line: i + 1, rule: "pack-installers", text: text.trim() });
      }
    });
    if (DEAD_FILES.includes(f.path)) {
      out.push({ path: f.path, line: 0, rule: "dead-file", text: "must not exist" });
    }
    if (AUTHOR_TIER_FILES.includes(f.path)) {
      lines.forEach((text, i) => {
        if (/\bisAuthor\s*\(/.test(text)) {
          out.push({ path: f.path, line: i + 1, rule: "author-tier", text: text.trim() });
        }
      });
    }
  }
  const record = byPath.get(PARCEL_OWNER_FILE);
  if (record !== undefined) {
    const m = /export type ParcelOwner =([\s\S]*?\});/.exec(record);
    const kinds = m ? [...m[1]!.matchAll(/kind:\s*"([a-z]+)"/g)].map((k) => k[1]!) : [];
    if (kinds.length !== PARCEL_OWNER_KINDS.length || PARCEL_OWNER_KINDS.some((k) => !kinds.includes(k))) {
      out.push({
        path: PARCEL_OWNER_FILE,
        line: 0,
        rule: "parcel-owner-kinds",
        text: `ParcelOwner kinds are [${kinds.join(", ")}]; expected exactly [${PARCEL_OWNER_KINDS.join(", ")}]`,
      });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXT_RE.test(entry)) out.push(full);
  }
  return out;
}

function scan(): Array<{ path: string; text: string }> {
  const out: Array<{ path: string; text: string }> = [];
  for (const root of SCAN_ROOTS) {
    for (const full of walk(root)) {
      const rel = relative(REPO_ROOT, full).split("\\").join("/");
      // This gate names the literal it hunts.
      if (rel.endsWith("scripts/check-core-gone.ts") || rel.endsWith("scripts/__tests__/check-core-gone.test.ts")) continue;
      out.push({ path: rel, text: readFileSync(full, "utf8") });
    }
  }
  return out;
}

function main(): void {
  const findings = classify(scan());
  if (findings.length === 0) {
    console.log("check-core-gone: the core group is dead — no literal, no author tier, no pack-installers.");
    process.exit(0);
  }
  console.error(`check-core-gone: ${findings.length} finding(s):`);
  for (const f of findings) console.error(`  ✗ ${f.path}:${f.line} [${f.rule}] ${f.text}`);
  process.exit(1);
}

if (process.argv[1]?.includes("check-core-gone")) main();
