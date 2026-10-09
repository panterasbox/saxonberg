/**
 * check-lib-statics — ⭐⭐ **the ratchet for the value-object statics
 * sweep.**
 *
 * > Does this static answer a question about the **TYPE**, or about the
 * > **WORLD**?

 * Type-level statics — construction (`Quantity.of`, `Currency.parse`),
 * guards over the type's own closed vocabulary (`Construction.isForm`)
 * and lookups of it (`Currency.all`) — **stay on the value class**, and
 * the projection files them under a `value-static` kind.
 *
 * ⛔⛔ **That sentence used to end "…and they are visible now", and it is
 * NOT TRUE. Do not use it to justify a new static.** `value-static` is a
 * **catch-all**, not a curated admission:
 *
 * ```ts
 * const isValueStatic =
 *   !isStaticApi && !isStuffMethod && mod.name.startsWith("mud/") && !sealedSubdir;
 * ```
 *
 * Anything that is neither an Api static nor a Stuff instance method and
 * lives under `mud/` lands in it. So the label means *this member was
 * left over*, and citing the bucket that collects the invisible members
 * as proof of visibility is circular. The whiskey-styles build raised the
 * ceiling on exactly that reasoning before anyone checked (2026-10-06).
 *
 * ⭐⭐ **The question to ask instead is WHO CALLS IT.** The two places a
 * person searches are **public methods on Stuff/mixin classes** (most
 * arriving via a mixin) and **statics in the Api layer**. Both are
 * queryable; a static on an arbitrary `lib/` class is in neither, which
 * is the whole injury. So:
 *
 *   - **an author calls it** → it belongs on an **Api** (or is already
 *     reachable through one, in which case this static is plumbing);
 *   - **only `lib/` and `platform/idea/api/` call it** → it is not
 *     author surface at all, and the honest disposition is a class-level
 *     **`@internal`** — counted separately, excluded from the ceiling,
 *     invisible *because its author said so*.
 *
 * ⚠ **A ratchet rise wants a caller audit, not a doctrine quotation.**
 * Being type-level makes a static legitimate to EXIST; it does not make
 * it discoverable, and it is no argument for growing the population.
 *
 * ⭐ World-level statics are the sweep: `Freshness.growthRate`,
 * `Contamination.advance`, `CombatNarration.narrate` compute facts about
 * the world, which is a **logic singleton**'s job
 * (`platform/idea/api/<X>Logic.ts`, `@internal`, `FromModule`-gated,
 * HMR-able) with the subsystem Api forwarding. `CLAUDE.md` already calls
 * that split mandatory; these classes predate it.
 *
 * `scripts/project-author-surface.ts` admits exactly two things into the
 * consumer tier — public statics on an `*Api`, and public *instance*
 * methods on everything else:
 *
 * ```ts
 * const isStaticApi   =  apiClass && member.flags?.isStatic === true;
 * const isStuffMethod = !apiClass && member.flags?.isStatic !== true;
 * if (!isStaticApi && !isStuffMethod) continue;   // ← dropped
 * ```
 *
 * A static on a `lib/` class satisfies neither, so it never reaches the
 * generated docs. Its *instance* methods survive; only the statics
 * vanish — which is exactly what somebody goes looking for. That is a
 * direct breach of `CLAUDE.md`'s governing invariant,
 * **`callable == visible == cared-about`**.
 *
 * ## Census, then ratchet
 *
 * The count is the ceiling. It may fall and may never rise, which is
 * what stops the population growing while the sweep works through it
 * (`docs/lint-family.md § census-then-ratchet`, the pattern that took
 * `lint:object-verbs` from 338 to 0). A static's home is its subsystem
 * **Api** (construction, guards, lookups) or an
 * `platform/idea/api/<X>Logic.ts` **logic singleton** (domain logic) —
 * see `docs/slates/builds/value-object-statics-slate.md`.
 *
 * ## ⚠ What counts, stated exactly
 *
 * A **public static method** declared in the body of an **exported class
 * declaration** that does not end in `Api`, under the kernel's `lib/` or
 * `platform/`, or any capability pack's `src/`. Excluded, deliberately:
 *
 *   - `private` / `protected` / `#` statics — already invisible by
 *     intent, and the projection agrees;
 *   - `static readonly` fields and `_`-prefixed slots — data and
 *     framework seams, not a calling surface;
 *   - the framework declaration statics reached reflectively by name
 *     (`FRAMEWORK` below) — they can never move and are not surface;
 *   - ⚠ **statics inside a mixin factory's returned class expression.**
 *     They are equally invisible, but a mixin's statics are reached
 *     through the composed host and rehoming them is a different
 *     question from rehoming a value class's. Out of scope by
 *     definition, not by oversight — count them when that question is
 *     asked.
 *
 * Usage:
 *   tsx scripts/check-lib-statics.ts --lint      # CI gate
 *   tsx scripts/check-lib-statics.ts --report    # the roster
 */

import { readFileSync } from 'fs';
import { join, relative } from 'path';
import { MUD, packSources, packSrcFiles } from './pack-roots';

const REPO_ROOT = join(MUD, '../../../..');

/**
 * ⭐ **The ceiling. It may fall; it may never rise.**
 *
 * ⚠ The slate quotes **461**, which was this script's first pass — and
 * that pass read only the FIRST exported class in each file, so every
 * file declaring a value class beside its mixin was undercounted (11
 * such files under the kernel's `lib/` alone) and it required a static
 * to sit at exactly two spaces of indent. W0 corrected that to
 * **159 classes · 535 statics**, every pair verified to exist.
 *
 * ⭐ W1 then widened the SCOPE to `mud/platform/` as well (D2): the
 * projection's own report showed 31 equally-invisible statics there —
 * `VisionModality.canSee` among them — and the invariant is about
 * visibility, not about which directory a class sits in. **564.**
 * Lowering it is the sweep's whole job.
 *
 * ⭐ Glass build (W0) +2 → 337 → 339: two TYPE-level statics on the
 * `Colour` value object — `fromTag` (a palette WORD → its transmittance
 * position, the inverse of `nearestTag`) and `normalised` (a Colour from
 * raw, unclamped channel sums, scaled so the largest is 1). Both are
 * construction/lookup OF the type — the category this gate's own body
 * documents as belonging here as a value-static, not world logic that
 * wants a `*Logic` singleton. Caller audit: `fromTag` is called by
 * `Window.lightTransmittance` (author word → filter) and the colour
 * tests; `normalised` by the light walk and `Light.add` (chroma →
 * hue). An Api home would be wrong for a value-object factory. The
 * ratchet still only falls from here.
 */
/**
 * ⚠ **Raised 337 → 342 by the whiskey build (2026-10-04), and the
 * arithmetic is the whole justification.** Five statics, each one the
 * twin of a static this census already counts:
 *
 *   - `DissolvedToxins.blend` / `.isClean` / `.surviving` — the fourth
 *     member of a family of four. `Freshness.blendLoads`,
 *     `WaterActivity.blend` and `Contamination.blend`/`.isClean` are
 *     already here, and a toxin concentration that blended by a different
 *     rule from the microbial load riding the same matter would be a bug
 *     waiting to be found. ⭐ The generalisation this family actually
 *     wants is the participant hook `bulk.md` and `maturation.md` both
 *     name — the transfer primitive is at EIGHT domain insertions now —
 *     and that refactor is filed as a slate entry rather than done
 *     inside a feature build.
 *   - `FractionSchedule.byKey` / `.forMaterial` — the roster lookups,
 *     verbatim the `MaturationProfile` pair two subsystems over, with
 *     `all()` private for `lint:whole-table`.
 *
 * ⭐ This is the shape memory warns about: *a ratchet over a figure that
 * scales with CONTENT refuses an author for doing it right.* A new
 * subsystem's value object and row class are growth, not drift, and the
 * number to watch is whether the family of four becomes a family of five
 * — which is the hook's job, not a ceiling's.
 */
/**
 * ⭐⭐ **LOWERED 342 → 339 by the whiskey-styles build (2026-10-06), and
 * the first draft of that build raised it to 347 instead.** Recording
 * both numbers because the wrong one is the instructive one.
 *
 * The build added five statics (`Concentration.blend`/`.isClean`,
 * `DissolvedAromatics.isAroma`/`.thresholdFor`/`.render`) and raised the
 * ceiling to fit them, justified as *"type-level statics, which this
 * file's own doctrine says stay on the value class and which the
 * projection documents as `value-static`."*
 *
 * ⚠⚠ **That justification was wrong, and wrong in a way worth writing
 * down.** The `value-static` kind is a **catch-all**, not a curated
 * admission:
 *
 * ```ts
 * const isValueStatic =
 *   !isStaticApi && !isStuffMethod && mod.name.startsWith("mud/") && !sealedSubdir;
 * ```
 *
 * Anything that is neither an Api static nor a Stuff instance method and
 * lives under `mud/` lands in it. So "the projection documents them" means
 * *they appear in a JSON file under a residual label* — **not** that
 * anybody can find them. And finding them is the entire point: the two
 * places a person searches are **public methods on Stuff/mixin classes**
 * (most arriving via a mixin) and **statics in the Api layer**. Both are
 * queryable. A static on an arbitrary `lib/` class is in neither, which is
 * the invisibility this gate exists to stop — and citing the bucket that
 * collects the invisible ones as proof of visibility is circular.
 *
 * ⭐ **The honest disposition was already here and went unused:
 * class-level `@internal`** (see `statsOf`). It is counted separately,
 * excluded from the ceiling, and means *invisible because its author said
 * so*. So the five were re-examined by CALLER, which is the question that
 * settles it:
 *
 * | class | every caller | author surface? |
 * |---|---|---|
 * | `Concentration` | `DissolvedToxins`, `DissolvedAromatics`, `BulkableLogic`, `Fractionating` | no |
 * | `DissolvedAromatics` | `Recipe` (row validation), `Palatable`, `Fractionating` | no |
 * | `DissolvedToxins` | `BulkableLogic`, `Fractionating`, `Metabolic` | no |
 *
 * Not one is author surface. What an author actually reaches is
 * `BulkableApi.blendPayloads` — an Api static — and the readings, which
 * arrive through `smell` / `taste` on a mixin. Both queryable, both
 * unchanged. All three classes are `@internal` now, which takes the
 * surface count to **339: three BELOW where this build found it**,
 * because `DissolvedToxins` predated the sibling and had never been
 * marked.
 *
 * ⚠ Three routes considered and declined, recorded so they are not
 * re-proposed:
 *
 *   - **instance methods instead of statics** — moves them out of this
 *     count and into the `stuff-method` bucket, but that bucket means
 *     *an author calls this on an object*, which would be a lie here.
 *     Gaming the gate rather than answering it.
 *   - **a new Api** — a per-concept Api, which the project does not mint;
 *     there is no metabolism Api to host a vocabulary guard.
 *   - **folding the arithmetic into `BulkableLogic`** — puts a metabolism
 *     vocabulary inside the bulk logic singleton, restoring the exact
 *     `lib/bulk` → `lib/metabolism` edge the payload decomposition
 *     removed.
 *
 * ⭐ The standing lesson: **a ratchet rise wants a caller audit, not a
 * doctrine quotation.** Five rises had landed on this branch before
 * anybody asked who calls the things.
 */
/**
 * ⭐ **Glass build, merged onto the whiskey-styles 339 (2026-10-08): +2 →
 * 341.** The two `Colour` TYPE-level statics (`fromTag`, `normalised`)
 * were authored against the pre-whiskey 337 (see the glass note above),
 * so on this branch the rise read 337 → 339; rebased over master's
 * independent 342 → 339 lowering, the same two statics now sit on top of
 * 339 and take it to 341. The caller audit stands: `fromTag` is reached
 * by `Window.lightTransmittance` + the colour tests, `normalised` by the
 * light walk + `Light.add` — a value-object factory/lookup, the category
 * this file's own doctrine admits, not world logic wanting a `*Logic`.
 */
export const LIB_STATICS_CEILING = 341;

const STATIC =
  /^\s*(?:public\s+)?static\s+(?:async\s+)?(?!readonly\b|get\b|set\b|_)([a-zA-Z]\w*)\s*[(<]/;

/**
 * Statics the framework reaches **by name**, reflectively — so they can
 * never move, and they are not author surface either. They are the
 * mixin-side equivalent of an `@hook`: the class declares them and the
 * framework calls them.
 *
 * ⚠ The full set is found by grepping the framework for reflective
 * access (`hasOwnProperty.call(c, '…')`). ⭐ `cleanupOnDestruct` was
 * being counted as a movable static — making it private would have
 * silently broken destruct cleanup, because `StuffApi` finds it with
 * `hasOwnProperty`, not with an import.
 *
 * ⚠⚠ **Re-derived from that grep on 2026-10-05, and it had drifted** —
 * which is this file's own documented failure class (*a ratchet with a
 * hole in it*, *gates ship broken and silently pass*). The hydration
 * build added two names the framework reads by name
 * (`MixinApi.getPersistenceContributors`, `api/mixin.ts`) and the list
 * was never updated:
 *
 *   - **`hydrateFromSource`** — *fill the newborn from what the world
 *     remembered about it*, run by `StuffApi.#hydrateFromSources`
 *     between the content step and `onCreate`. It cannot be anything
 *     but a static read by name, and there is no compliant alternative
 *     shape to fold it into.
 *   - **`hydrateSlice`** — the restore half of the persistence slice.
 *     Note the list said **`restoreSlice`**, which the framework does
 *     not read by that name at all; the stale entry is kept because
 *     removing it would be a second change and it exempts nothing.
 *
 * `hydrationSource` and `_mixinName` are static FIELDS, and
 * `__validateComposition__` is `_`-adjacent — none matches the
 * method-shaped `STATIC` regex, so none can reach the census.
 */
const FRAMEWORK = new Set([
  'fieldMeta',
  'subscribableFields',
  'markupAugmenters',
  'cleanupOnDestruct',
  'captureSlice',
  'restoreSlice',
  'hydrateSlice',
  'hydrateFromSource',
  'settings',
]);

export interface StaticRow {
  file: string;
  cls: string;
  statics: string[];
}

/**
 * The names a module exports through a *statement* rather than inline —
 * `export default Provision;` / `export { Foo, Bar };`. ⚠ Ten files
 * under `lib/` and `platform/` declare their class bare and export it on
 * a later line, and none of them carries a static TODAY. A ratchet with
 * a hole in it is the documented failure class (*gates ship broken and
 * silently pass*), so the hole is closed while it is still empty.
 */
function deferredExportNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const m of source.matchAll(/^export\s+default\s+(\w+)\s*;/gm)) {
    names.add(m[1]!);
  }
  for (const m of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1]!.split(',')) {
      const name = part.trim().split(/\s+as\s+/)[0]?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

/**
 * Every exported class declaration in a source file, with the exact
 * extent of its body — brace-matched, so a nested class expression (a
 * mixin factory's return) is inside its OWN extent and never attributed
 * to the enclosing declaration.
 */
export function exportedClasses(
  source: string,
): { cls: string; body: string; internal: boolean }[] {
  const out: { cls: string; body: string; internal: boolean }[] = [];
  const deferred = deferredExportNames(source);
  const decl = /^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+(\w+)/gm;
  for (const m of source.matchAll(decl)) {
    if (!m[0].startsWith('export') && !deferred.has(m[1]!)) continue;
    // ⭐ A CLASS-level `@internal` is the honest disposition for a `lib/`
    // helper whose every caller sits in one subsystem: the class is that
    // subsystem's private collaborator, TypeDoc drops it whole, and the
    // cohesion that made it a class in the first place survives — which
    // folding its methods into a 5,000-line logic singleton would not.
    const before = source.slice(0, m.index);
    const lastDoc = before.lastIndexOf('/**');
    const internal =
      lastDoc !== -1 &&
      before.indexOf('*/', lastDoc) !== -1 &&
      before.slice(lastDoc, before.indexOf('*/', lastDoc)).includes('@internal') &&
      before.slice(before.indexOf('*/', lastDoc) + 2).trim().length === 0;
    const open = source.indexOf('{', m.index + m[0].length);
    if (open === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = open; i < source.length; i++) {
      const c = source[i];
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    out.push({ cls: m[1]!, body: source.slice(open + 1, end), internal });
  }
  return out;
}

/**
 * The public static methods declared directly in a class body — depth 1
 * only, so a static whose implementation contains a nested class or an
 * object literal contributes once and its innards contribute nothing.
 */
export function publicStaticsOf(body: string): string[] {
  return statsOf(body).surface;
}

/**
 * Split a class body's public statics into the ones that breach the
 * invariant and the ones that **declare** they do not.
 *
 * ⭐ `@internal` is the honest escape: TypeDoc drops it, so the member is
 * invisible *because its author said so*, not silently. That is not the
 * breach — the breach was invisibility nobody chose. But it is an escape
 * hatch, so the gate counts it separately and prints it: a rising
 * `declaredInternal` is a reviewable fact, not a hidden one.
 */
export function statsOf(body: string): {
  surface: string[];
  declaredInternal: string[];
} {
  const surface: string[] = [];
  const declaredInternal: string[] = [];
  let depth = 0;
  let inDoc = false;
  let docIsInternal = false;
  let sawDocRecently = false;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (depth === 0) {
      if (line.startsWith('/*')) {
        inDoc = true;
        docIsInternal = line.includes('@internal');
        if (line.includes('*/')) {
          inDoc = false;
          sawDocRecently = true;
        }
      } else if (inDoc) {
        if (line.includes('@internal')) docIsInternal = true;
        if (line.includes('*/')) {
          inDoc = false;
          sawDocRecently = true;
        }
      } else {
        const m = STATIC.exec(raw);
        if (m && !FRAMEWORK.has(m[1]!)) {
          (sawDocRecently && docIsInternal ? declaredInternal : surface).push(m[1]!);
        }
        if (line) {
          sawDocRecently = false;
          docIsInternal = false;
        }
      }
    }
    if (!inDoc) {
      for (const c of line) {
        if (c === '{') depth++;
        else if (c === '}') depth = Math.max(0, depth - 1);
      }
    }
  }
  return {
    surface: [...new Set(surface)],
    declaredInternal: [...new Set(declaredInternal)],
  };
}

function sourceFiles(): string[] {
  const files = [...packSrcFiles(join(MUD, 'lib')), ...packSrcFiles(join(MUD, 'platform'))];
  for (const pack of packSources()) files.push(...packSrcFiles(pack.srcDir));
  return files.filter((f) => f.endsWith('.ts') && !f.includes('__tests__'));
}

function census(): { rows: StaticRow[]; internal: number } {
  const rows: StaticRow[] = [];
  let internal = 0;
  for (const file of sourceFiles()) {
    const source = readFileSync(file, 'utf8');
    for (const { cls, body, internal: classInternal } of exportedClasses(source)) {
      if (cls.endsWith('Api')) continue;
      const { surface, declaredInternal } = statsOf(body);
      internal += declaredInternal.length;
      if (classInternal) {
        internal += surface.length;
        continue;
      }
      if (surface.length) rows.push({ file: relative(REPO_ROOT, file), cls, statics: surface });
    }
  }
  rows.sort((a, b) => b.statics.length - a.statics.length || a.cls.localeCompare(b.cls));
  return { rows, internal };
}

function main(): void {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--lint';
  const { rows, internal } = census();
  const total = rows.reduce((n, r) => n + r.statics.length, 0);

  if (mode === '--report') {
    console.log(`${rows.length} non-Api classes with public static methods\n`);
    for (const r of rows) {
      console.log(`${String(r.statics.length).padStart(2)}  ${r.cls.padEnd(24)} ${r.statics.join(', ')}`);
      console.log(`    ${r.file}`);
    }
    console.log(`\n${total} public statics in total`);
    console.log(`${internal} more are declared @internal (dropped by TypeDoc)`);
    return;
  }

  if (total > LIB_STATICS_CEILING) {
    console.error(
      `\n✖ lint:lib-statics — ${total} public static(s) on ${rows.length} ` +
        `non-Api class(es); the ceiling is ${LIB_STATICS_CEILING}.\n\n` +
        `  ⭐ Ask WHO CALLS IT, not what shape it is. The two places a ` +
        `person searches are public methods on Stuff/mixin classes and ` +
        `statics in the Api layer; a static on an arbitrary lib/ class ` +
        `is in neither, which is the whole injury.\n\n` +
        `    an author calls it   -> it belongs on an Api (or is already ` +
        `reachable through one, in which case this static is plumbing)\n` +
        `    only lib/ + platform/idea/api/ call it -> it is NOT author ` +
        `surface: give the CLASS a @internal doc tag, which is counted ` +
        `separately and excluded from this ceiling\n\n` +
        `  ⛔ Do NOT justify it as "a type-level static, documented as a ` +
        `value-static". That bucket is the projection's CATCH-ALL ` +
        `(!isStaticApi && !isStuffMethod && mud/ && !sealed), so it ` +
        `collects exactly the members nobody classified — citing it as ` +
        `proof of visibility is circular, and it is what justified five ` +
        `ceiling rises on one branch.\n\n` +
        `  ⚠ Being the right shape for the class says the member may ` +
        `EXIST; it says nothing about whether the population may grow ` +
        `while the sweep runs. World-level logic belongs on a ` +
        `platform/idea/api/<X>Logic.ts logic singleton with the ` +
        `subsystem's Api forwarding. The ceiling may fall; it may never ` +
        `rise.\n`,
    );
    for (const r of rows.slice(0, 20)) {
      console.error(`  ${String(r.statics.length).padStart(2)}  ${r.cls.padEnd(24)} ${r.file}`);
    }
    if (rows.length > 20) console.error(`  … and ${rows.length - 20} more (--report for all)`);
    process.exit(1);
  }

  console.log(
    `✔ lint:lib-statics — ${total} public static(s) on non-Api classes ` +
      `(ceiling ${LIB_STATICS_CEILING}); ${internal} declared @internal.`,
  );
}

if (process.argv[1] && /check-lib-statics\.ts$/.test(process.argv[1])) main();
