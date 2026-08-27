/**
 * check-untitled-paths — every path a pack ships under a title root is
 * covered by some pack's claim (content-packs wave 3, D3/D10).
 *
 * With `core` gone, an untitled path is untitled: `ownerOf` answers null
 * and every `can` there fails closed. A row nobody claims is therefore
 * a row nobody can edit, broadcast over, or teleport within — silently.
 * This gate reads every shipped `pack.yaml`, collects the claims
 * (`requires.title[].extent`) and every path the packs ship (the
 * installer's template walk mirrored: every `content/**\/*.yaml` outside
 * the kind dirs, `cmd/` skipped at any depth; plus every document path —
 * `root + '/' + contentDir + '/' + key`, command views at `/cmd/**` and
 * `/domain/**\/cmd/**`), and reports any path under one of the eight
 * title roots with no claim as a prefix. Zero is green. It does not
 * import the mudlib (a script), so the walk rule is duplicated minimally.
 *
 * The `check-test-content.ts` shape: exported pure `classify`, a `--lint`
 * mode, a test beside it. CI-gating.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, dirname, relative, basename } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTENT = join(HERE, "..", "..", "content");

/** The title-bearing namespace roots (the installer's `TITLE_ROOTS`). */
export const TITLE_ROOTS = ["/obj", "/domain", "/cmd", "/compact", "/studio", "/wiki", "/home", "/corpo"];
/** The `content/` dirs that are NOT the template kind (settings, subjects, banks, quantity, the yaml document kinds). */
const NON_TEMPLATE_DIRS = new Set(["settings", "subjects", "descriptor-banks", "quantity", "emotes", "recipes", "blueprints", "name-banks", "releases", "cmd", "msh", "wiki"]);
/** The yaml document kinds and their content dirs (`DOCUMENT_KINDS`, mirrored). */
const DOCUMENT_DIRS = ["emotes", "recipes", "blueprints", "name-banks", "releases"];

export interface Untitled {
  path: string;
  pack: string;
}

function under(path: string, extent: string): boolean {
  return path === extent || path.startsWith(extent + "/");
}

/** The pure decision core: every shipped path under a title root with no claim as a prefix. */
export function classify(
  shipped: ReadonlyArray<{ pack: string; path: string }>,
  claims: readonly string[],
): Untitled[] {
  return shipped
    .filter((s) => TITLE_ROOTS.some((r) => under(s.path, r)))
    .filter((s) => !claims.some((c) => under(s.path, c)))
    .map((s) => ({ path: s.path, pack: s.pack }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function* walk(dir: string, skipCmd: boolean): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (skipCmd && entry === "cmd") continue;
      yield* walk(full, skipCmd);
    } else yield full;
  }
}

/** Every path a pack ships, the installer's rules mirrored. */
export function shippedPathsOf(packRoot: string, root: string): string[] {
  const content = join(packRoot, "content");
  const out: string[] = [];
  if (!existsSync(content)) return out;
  for (const entry of readdirSync(content)) {
    const full = join(content, entry);
    const isDir = statSync(full).isDirectory();
    if (isDir && NON_TEMPLATE_DIRS.has(entry)) {
      if (entry === "cmd") {
        for (const f of walk(full, false)) {
          if (f.endsWith(".yaml") && !f.includes("__tests__")) {
            out.push("/cmd/" + relative(full, f).replace(/\.yaml$/, "").split("\\").join("/"));
          }
        }
      } else if (DOCUMENT_DIRS.includes(entry)) {
        for (const f of walk(full, false)) {
          if (f.endsWith(".yaml")) out.push(`${root}/${entry}/` + relative(full, f).replace(/\.yaml$/, "").split("\\").join("/"));
        }
      } else if (entry === "msh") {
        for (const f of walk(full, false)) {
          if (f.endsWith(".msh")) out.push(`${root}/msh/` + relative(full, f).replace(/\.msh$/, "").split("\\").join("/"));
        }
      } else if (entry === "wiki") {
        // Zone rows (`wiki/<ns>.yaml`) are templates; pages (`wiki/<ns>/<slug>.md`) are documents.
        for (const f of walk(full, false)) {
          const rel = relative(content, f).split("\\").join("/");
          if (f.endsWith(".yaml")) out.push("/" + rel.replace(/\.yaml$/, ""));
          else if (f.endsWith(".md")) out.push("/" + rel.replace(/\.md$/, ""));
        }
      }
      continue;
    }
    if (isDir) {
      for (const f of walk(full, true)) {
        if (f.endsWith(".yaml")) out.push("/" + relative(content, f).replace(/\.yaml$/, "").split("\\").join("/"));
      }
      // A locality's views: `domain/**/cmd/*.yaml` → `/domain/**/cmd/<verb>`.
      for (const f of walk(full, false)) {
        const rel = relative(content, f).split("\\").join("/");
        if (f.endsWith(".yaml") && rel.split("/").slice(0, -1).includes("cmd")) out.push("/" + rel.replace(/\.yaml$/, ""));
      }
    } else if (entry.endsWith(".yaml")) {
      out.push("/" + basename(entry, ".yaml"));
    }
  }
  return out;
}

interface Manifest { id: string; root?: string; requires?: { title?: Array<{ extent: string }> } }

function scan(): { shipped: Array<{ pack: string; path: string }>; claims: string[] } {
  const shipped: Array<{ pack: string; path: string }> = [];
  const claims: string[] = [];
  if (!existsSync(CONTENT)) return { shipped, claims };
  for (const pack of readdirSync(CONTENT)) {
    const root = join(CONTENT, pack);
    const file = join(root, "pack.yaml");
    if (!existsSync(file)) continue;
    const m = YAML.parse(readFileSync(file, "utf8")) as Manifest;
    for (const t of m.requires?.title ?? []) claims.push(t.extent);
    for (const path of shippedPathsOf(root, m.root ?? `/${m.id}`)) shipped.push({ pack: m.id, path });
  }
  return { shipped, claims };
}

function main(): void {
  const { shipped, claims } = scan();
  const untitled = classify(shipped, claims);
  if (untitled.length === 0) {
    console.log(`check-untitled-paths: every shipped path under a title root is claimed (${shipped.length} paths, ${claims.length} claims).`);
    process.exit(0);
  }
  console.error(`check-untitled-paths: ${untitled.length} shipped path(s) under a title root that NO pack claims — untitled means nobody can edit, broadcast over or teleport within them:`);
  for (const u of untitled) console.error(`  ✗ ${u.path}  (shipped by ${u.pack})`);
  process.exit(1);
}

if (process.argv[1]?.includes("check-untitled-paths")) main();
