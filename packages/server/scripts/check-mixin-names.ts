/**
 * check-mixin-names — the gate on the **flat mixin namespace**.
 *
 * ⭐⭐ **Why this exists.** A mixin is addressed by a reserved name in
 * one global namespace — `static _mixinName = 'ContainerMixin'` — and
 * that namespace is the last flat one in a codebase that path-normalised
 * everything else (template paths, module ids, document trees). It
 * survived because it was the KERNEL's alone: one tree, one author, no
 * way to collide by accident.
 *
 * That stopped being true on 2026-09-14, when `requires:` was federated
 * so a capability pack can name its own mixin
 * (`MixinApi.registerComposedMixins`, and
 * `docs/slates/builds/content-packs-slate.md` § RESOLVED). Two packs may
 * now declare `_mixinName = 'DeskMixin'` with no common author to notice.
 * The second one silently takes the first's refusal phrase, and a
 * `requires:` in either pack matches BOTH packs' objects — a wrong menu
 * on a player's screen, arrived at with nothing logged.
 *
 * ⭐ **This gate is also the trigger the design decision is waiting on.**
 * Path-addressed mixins (`/trade/haulage/lib/ShipmentDesk`) were declined
 * for one specific reason — a TypeScript type predicate cannot be
 * path-addressed, and there are 156 irreducible `isX(o): o is Stuff & X`
 * narrowings — with the revisit trigger written down as *"two packs
 * collide on a `_mixinName`"*. So: the day this gate fails for real, the
 * flat namespace has actually broken and the reserved question reopens.
 * Until then it costs nothing and holds the line.
 *
 * ## What it checks
 *
 * 1. **No duplicate `_mixinName`** across the kernel tree and every
 *    pack's `src/`. Ceiling 0 — this has never happened and must not
 *    start.
 * 2. **Every declaration is READABLE.** The name may be a literal, a
 *    same-file `const`, or `Mixins.<Key>`; anything else is refused
 *    here rather than silently dropped, because the runtime's reader
 *    (`PackLogic.registerPackMixins`) resolves the same forms and a
 *    fourth would be a mixin no `requires:` could ever name.
 * 3. **Every KERNEL `_mixinName` is in the `Mixins` const.** CLAUDE.md
 *    already states the const is the single source of truth; without the
 *    census that claim was unverified, and two mixins
 *    (`BodyPlanSlotsMixin`, `SeatedDrivableMixin`) had been missing from
 *    it long enough that neither could be named by a `requires:` at all.
 *    ⚠ A PACK mixin is deliberately NOT required to be there — being
 *    unable to edit that list is the whole reason the federation exists.
 *
 * ## Usage
 *
 *   pnpm lint:mixin-names          the roster
 *   pnpm lint:mixin-names --lint   CI gate (exit 1 on any violation)
 */

import { declaredMixins, type MixinDeclaration } from "./pack-roots";
import { Mixins } from "../src/mud/lib/mixin";
import { relative } from "path";

const ROOT = new URL("../..", import.meta.url).pathname;
const rel = (f: string): string => relative(ROOT, f);

interface Findings {
  all: MixinDeclaration[];
  duplicates: Array<{ name: string; decls: MixinDeclaration[] }>;
  unregistered: MixinDeclaration[];
  unreadable: MixinDeclaration[];
}

export function findings(): Findings {
  const raw = declaredMixins();
  const unreadable = raw.filter((d) => d.name === "");
  const all = raw.filter((d) => d.name !== "");
  const byName = new Map<string, MixinDeclaration[]>();
  for (const d of all) byName.set(d.name, [...(byName.get(d.name) ?? []), d]);

  const duplicates: Findings["duplicates"] = [];
  for (const [name, decls] of byName) {
    // Same name, same file is one mixin the scanner saw twice (an
    // `override` re-declaration inside one factory); a collision is two
    // FILES claiming one name.
    if (new Set(decls.map((d) => d.file)).size > 1) duplicates.push({ name, decls });
  }

  const known = new Set<string>(Object.values(Mixins));
  const unregistered = all.filter((d) => d.owner === "kernel" && !known.has(d.name));

  return { all, duplicates, unregistered, unreadable };
}

function main(): void {
  const lint = process.argv.includes("--lint");
  const f = findings();
  const packs = f.all.filter((d) => d.owner !== "kernel");

  if (!lint) {
    console.log(
      `${f.all.length} mixin name(s) declared — ` +
        `${f.all.length - packs.length} kernel, ${packs.length} from packs\n`,
    );
    for (const d of packs) {
      console.log(
        `  ${d.name.padEnd(28)} ${d.owner}` +
          (d.refusal ? `\n      refusal: "${d.refusal}"` : "\n      ⚠ no _mixinRefusal"),
      );
    }
  }

  const problems: string[] = [];
  for (const { name, decls } of f.duplicates) {
    problems.push(
      `  ⛔ '${name}' is declared by ${decls.length} files:\n` +
        decls.map((d) => `       ${d.owner}: ${rel(d.file)}`).join("\n") +
        `\n     A mixin name is global. Rename one — and see\n` +
        `     content-packs-slate.md § RESOLVED: this is the trigger to\n` +
        `     reopen path-addressed mixins.`,
    );
  }
  for (const d of f.unreadable) {
    problems.push(
      `  ⛔ ${rel(d.file)} declares \`_mixinName = ${d.expr}\`, which this ` +
        `reader\n     cannot resolve — a literal, a same-file const, or ` +
        `\`Mixins.<Key>\`.\n     The runtime's reader resolves the same ` +
        `three, so nothing could name it.`,
    );
  }
  for (const d of f.unregistered) {
    problems.push(
      `  ⛔ kernel mixin '${d.name}' (${rel(d.file)}) is not in the Mixins ` +
        `const —\n     add it to lib/mixin.ts, or nothing can name it in a ` +
        `\`requires:\`.`,
    );
  }

  if (problems.length > 0) {
    console.error(`\n✖ lint:mixin-names — ${problems.length} violation(s):\n`);
    console.error(problems.join("\n\n"));
    if (lint) process.exit(1);
    return;
  }
  console.log(
    `✔ lint:mixin-names — ${f.all.length} declaration(s), ` +
      `${packs.length} from packs, no collisions.`,
  );
}

if (process.argv[1] && /check-mixin-names\.ts$/.test(process.argv[1])) main();
