/**
 * ⭐ `lint:mixin-files` — **a mixin factory `FooMixin` lives in `Foo.ts`.**
 *
 * CLAUDE.md § File Naming Conventions: a mixin file is named for its mixin,
 * without the suffix (`Propertied.ts` exports `PropertiedMixin`). The rule
 * is what lets a reader find a mixin from its name — and every exception
 * is a mixin you cannot find: `ToolMixin` in `Tooled.ts`, `ReservedMixin`
 * in `reserve.ts`, two factories sharing `Consignment.ts`.
 *
 * **What it counts**: each `export function <Name>Mixin` declared in the
 * kernel's `lib/**` and `world/**` and every pack's `src/lib/**`, whose
 * file's basename is not `<Name>.ts` (controllers-are-io D7b). The census
 * is the twelve moves in the plan's § Fault lines; W3 makes them and drives
 * the ceiling to 0.
 *
 * ⭐ Census, then ratchet: the ceiling is this gate's own count; it may
 * fall, never rise.
 */

import { readFileSync } from "fs";
import { basename, join, relative, resolve } from "path";
import { pathToFileURL } from "url";
import { CONTENT, MUD, mudSourceFiles, packSources, ratchet, stripComments } from "./pack-roots";

export const MIXIN_FILES_CEILING = 0;

const FACTORY = /^export\s+function\s+([A-Za-z_$][\w$]*)Mixin\s*[<(]/gm;

/** The factories in one module whose file is not named for them. */
export function misfiled(file: string, src: string): string[] {
  const stem = basename(file).replace(/\.ts$/, "");
  const out: string[] = [];
  for (const m of stripComments(src).matchAll(FACTORY)) {
    if (m[1] !== stem) out.push(`${m[1]}Mixin`);
  }
  return out;
}

export function census(contentDir: string = CONTENT, mudDir: string = MUD): string[] {
  const repo = join(mudDir, "..", "..", "..", "..");
  const srcOf = new Map(packSources(contentDir).map((p) => [p.id, p.srcDir]));
  /** Is this module in a home the rule governs? */
  const governed = (file: string, owner: string): boolean => {
    if (owner === "kernel") {
      const rel = relative(mudDir, file);
      return rel.startsWith("lib/") || rel.startsWith("world/");
    }
    const src = srcOf.get(owner);
    return !!src && relative(src, file).startsWith("lib/");
  };
  const out: string[] = [];
  for (const { file, owner } of mudSourceFiles(contentDir, mudDir)) {
    if (!governed(file, owner)) continue;
    for (const name of misfiled(file, readFileSync(file, "utf8"))) {
      out.push(`${relative(repo, file)}  ${name}`);
    }
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-mixin-files",
    "mixin factories not in a file named for them",
    findings.length,
    MIXIN_FILES_CEILING,
    findings,
    "⭐ `export function FooMixin` lives in `<subsystem>/Foo.ts` — one factory,\n" +
      "  one file, named for it (CLAUDE.md § File Naming Conventions).",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
