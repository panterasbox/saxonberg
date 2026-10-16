/**
 * check-pack-extends — a row that `extends:` another pack's row DEPENDS on
 * that pack.
 *
 * The installer enforces this at boot (`PackLogic.assertParentsResolve`,
 * step `requires-kernel`) and refuses the WHOLE pack when it fails — which
 * is the right rule and the wrong moment to learn it: the assembly build's
 * first drive never reached a checkpoint because `trade-brewing`'s cask
 * gained `extends: /stuff/thing/vessel/cask` (a generic-objects row) and
 * brewing did not depend on generic-objects. Every test was green; the
 * boot was not. This is the same check, read off the checkout, so it fails
 * where the change is made.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { CONTENT, SERVER_SRC, inheritanceIndex } from "./pack-roots";

function depsOf(pack: string): Set<string> {
  try {
    const pj = JSON.parse(readFileSync(join(CONTENT, pack, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
    };
    return new Set(
      Object.keys(pj.dependencies ?? {})
        .filter((d) => d.startsWith("@saxonberg/content-"))
        .map((d) => d.slice("@saxonberg/content-".length)),
    );
  } catch {
    return new Set();
  }
}

function main(): void {
  const { rows } = inheritanceIndex(SERVER_SRC, CONTENT);
  const findings: string[] = [];
  const deps = new Map<string, Set<string>>();
  for (const row of rows.values()) {
    const parent = row.raw.extends;
    if (typeof parent !== "string" || parent.length === 0) continue;
    const owner = rows.get(parent)?.pack;
    if (!owner || owner === row.pack || owner === "kernel" || row.pack === "kernel") continue;
    if (!deps.has(row.pack)) deps.set(row.pack, depsOf(row.pack));
    if (!deps.get(row.pack)!.has(owner)) {
      findings.push(
        `${row.pack}: ${row.path} extends ${parent}, which '${owner}' ships — ` +
          `add "@saxonberg/content-${owner}" to ${row.pack}'s package.json dependencies`,
      );
    }
  }
  if (findings.length === 0) {
    console.info("check-pack-extends: ok — every cross-pack extends: names a dependency.");
    return;
  }
  for (const f of findings) console.error(`  ⚠ ${f}`);
  console.error(
    `\n✖ check-pack-extends: ${findings.length} finding(s) — the installer refuses the whole pack at boot for each.`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-pack-extends.ts")) {
  main();
}
