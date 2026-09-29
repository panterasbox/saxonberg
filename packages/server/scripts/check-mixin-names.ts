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
 * 4. ⭐⭐ **Every mixin name written in CONTENT names a declared mixin.**
 *    A command view's `args[].requires` and its MQL `default:` strings
 *    carry mixin names as plain text, invisible to the compiler and to
 *    every other gate. A view naming a mixin that no longer exists
 *    refuses every target at the BINDER — before any controller runs,
 *    with no error and no test able to see it. The `Surfaced` → `Placing`
 *    rename had four such occurrences, one of them inside an MQL string
 *    (`reachable:[mixin.SurfacedMixin and …]`), and this clause is what
 *    would have failed on all four the day the rename landed.
 *
 * ## Usage
 *
 *   pnpm lint:mixin-names          the roster
 *   pnpm lint:mixin-names --lint   CI gate (exit 1 on any violation)
 */

import {
  CONTENT,
  declaredMixins,
  walkYamlFiles,
  type MixinDeclaration,
} from "./pack-roots";
import { Mixins } from "../src/mud/lib/mixin";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, relative } from "path";

/** A mixin name written in a command view, and where. */
interface ContentMixinRef {
  name: string;
  file: string;
  where: string;
}

/**
 * Every `<Name>Mixin` token written inside a command view's `requires:`
 * entries or `default:` strings.
 *
 * ⭐ Deliberately a TEXT scan over the view files rather than a parse of
 * the arg model: `requires: [A|B]` is an alternation, `default:` is MQL,
 * and both are strings the binder reads at dispatch. What matters is
 * that every mixin NAME in them is real — the grammar around it is
 * other gates' business.
 *
 * A view lives at `<root>/cmd/<category>/<verb>.yaml`; `<root>/idea/cmd/`
 * is controllers, not views, so it is skipped.
 */
function contentMixinRefs(contentDir: string = CONTENT): ContentMixinRef[] {
  const out: ContentMixinRef[] = [];
  if (!existsSync(contentDir)) return out;
  for (const pack of readdirSync(contentDir).sort()) {
    const root = join(contentDir, pack, "content");
    if (!existsSync(root)) continue;
    for (const file of walkYamlFiles(root)) {
      const rel = file.split("\\").join("/");
      if (!/\/cmd\//.test(rel) || /\/idea\/cmd\//.test(rel)) continue;
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (!/^\s*(-\s*)?(requires|default)\s*:/.test(line)) continue;
        const where = /requires/.test(line) ? "requires:" : "default:";
        for (const m of line.matchAll(/\b[A-Z][A-Za-z]+Mixin\b/g)) {
          out.push({ name: m[0], file, where });
        }
      }
    }
  }
  return out;
}

const ROOT = new URL("../..", import.meta.url).pathname;
const rel = (f: string): string => relative(ROOT, f);

interface Findings {
  all: MixinDeclaration[];
  duplicates: Array<{ name: string; decls: MixinDeclaration[] }>;
  unregistered: MixinDeclaration[];
  unreadable: MixinDeclaration[];
  undeclaredInContent: ContentMixinRef[];
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

  // Clause 4: kernel names ∪ every declared `_mixinName` (packs
  // included — a pack's view may name its own pack's mixin).
  const declarable = new Set<string>([...known, ...all.map((d) => d.name)]);
  const undeclaredInContent = contentMixinRefs().filter(
    (r) => !declarable.has(r.name),
  );

  return { all, duplicates, unregistered, unreadable, undeclaredInContent };
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

  for (const r of f.undeclaredInContent) {
    problems.push(
      `  ⛔ ${rel(r.file)} names '${r.name}' in a \`${r.where}\`, and no ` +
        `mixin\n     declares that name. The binder reads this string at ` +
        `dispatch, so the\n     verb refuses every target — closed and ` +
        `silent, with no test able to see it.\n     Fix the name, or ` +
        `declare the mixin.`,
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
      `${packs.length} from packs, no collisions; every mixin named in ` +
      `a command view is declared.`,
  );
}

if (process.argv[1] && /check-mixin-names\.ts$/.test(process.argv[1])) main();
