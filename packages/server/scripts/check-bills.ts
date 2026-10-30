/**
 * check-bills — ⭐⭐ **a bill is one declaration with the recipe that makes
 * it**, and everything it names exists (assembly D11).
 *
 * A row's `bill:` says what a thing of that kind is made of; a recipe's
 * item slots say what a craft consumes. If the two drift, the craft mint
 * records parts the bill does not know and the bill promises parts no
 * recipe ever supplies — and nothing at runtime would say so: every read
 * of a bill is a resolve-on-read that answers *something*. So the
 * strictness lives here, on what a pack ships.
 *
 * The rules:
 *
 * 1. every `bill.parts[].template` names an authored row;
 * 2. every `bill.joints[].method` names an authored `Joint` row, and every
 *    `members` / `fastener` names a part of the same bill, and a
 *    `fastener` is a `role: fastener` part;
 * 3. ⭐ **every recipe whose output row has a bill covers each structural
 *    and fastener part by an item slot of the same `slot` name and
 *    `count`** — the "one declaration" acceptance criterion;
 * 4. ⛔ a row with `constructionForm: mail` has no bill (mail is a
 *    MATERIAL — a construction, not an assembly of rings), and neither do
 *    the containers on {@link REFUSED} (a hive is a box you put frames IN;
 *    containment already says that);
 * 6. ⛔ **the parts weigh no more than the whole** — salvage conserves
 *    mass, so a bill whose parts outweigh its row refused every take-apart
 *    with a conservation breach (the assembly drive: a 2.5 kg cask head
 *    of three 6 kg boards). A row with a bill states its mass.
 * 7. ⭐⭐ **the mixin composes on the FAMILIES, and a thing with no bill is
 *    one piece** (repair D4, D7 — the owner's ruling, 2026-10-16). Until
 *    then this arm held *a bill iff the class composes the mixin* and the
 *    mixin sat on nine narrow twins (`AssembledTool`, `Cask`, `Lantern`…):
 *    two classes for one kind of thing. What keeps the old failure — an
 *    `isAssembly()` guard on every caller — from coming back is not this
 *    gate but the mixin itself: **every method of it is total on a thing
 *    with no bill**. The arm holds what IS checkable:
 *    - 7a. a bill on a class that does not compose `AssembledMixin` is
 *      never read — an error;
 *    - 7b. a row whose class composes it, with no bill, made by a
 *      `tangible` recipe of TWO OR MORE distinct item slots — the mint
 *      would record a thing of parts nobody declared, so a crafted one is
 *      parts and a found one is one piece. Census-then-ratchet:
 *      {@link UNDECLARED_ASSEMBLIES} names the rows that are this today;
 *      a trade gives each a bill and takes it off the list;
 *    - 7c. a composing class's billless row is ONE PIECE and passes;
 *    - 7d. ⭐ the owner's rule made checkable — *the families we write
 *      recipes for*: a `tangible` recipe's output row whose class composes
 *      `Durable` composes `AssembledMixin` too. (A `bulk` recipe FILLS a
 *      vessel; it does not make one.) ⚠ Stock is exempt (a `Stackable`
 *      class — a stave is not a whole; it goes INTO one). This is what
 *      answers *is a mould a family?* the day a recipe makes one.
 * 8. ⭐ **every bill part is MADE by something** — its `template` is the
 *    `outputTemplate` of a shipped `tangible` recipe, so the trade that mends it is
 *    derivable (repair D1). Census-then-ratchet: {@link UNMADE_PARTS} names
 *    each part no recipe makes, with why; it may shrink, never grow, and a
 *    part that gains a recipe must leave it.
 * 5. ⛔ every `Joint` row's `competence.discipline` names a Discipline that
 *    exists — a joint gated on a Discipline nobody ships reads every
 *    salvager as a novice and nothing says why (found in the plan's
 *    once-over, 2026-10-09). A `competence: null` is legal only on a
 *    `portability: hand` row.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, relative } from "path";
import YAML from "yaml";
import {
  CONTENT,
  SERVER_SRC,
  composesMixin,
  effectiveRow,
  packSources,
  inheritanceIndex,
  walkYamlFiles,
  type TemplateRow,
} from "./pack-roots";

/** Containers refused a bill on the record (requirements D6, AC 16). */
export const REFUSED: ReadonlySet<string> = new Set([
  "/trade/apiculture/thing/hive",
  "/trade/apiculture/thing/thick-hive",
  "/trade/apiculture/thing/nuc",
  "/trade/apiculture/thing/super",
]);

const ROLES = new Set(["structural", "fastener", "wear", "facing"]);

/**
 * ⭐ Arm 7b's census (repair W1): rows a `tangible` recipe makes from two
 * or more parts, with NO bill — a crafted one carries a record of lines
 * named for the recipe's slots, a found one is one piece. Found when the
 * families composed the mixin (the plan expected the billhook alone).
 * Each is its trade's to declare; it may shrink, never grow.
 */
export const UNDECLARED_ASSEMBLIES: ReadonlyMap<string, string> = new Map([
  ["/trade/mining/thing/shovel", "a blade forged and hafted in one recipe — mining's to declare"],
  ["/trade/mining/thing/sledge", "a head forged and hafted in one recipe — mining's to declare"],
  ["/trade/mining/thing/assay-kit", "a balance in a case — mining's to declare"],
  ["/trade/mining/thing/miners-dial", "a dial body in a case — mining's to declare"],
  ["/trade/drilling/thing/pressure-gauge", "a tube in a case — drilling's to declare"],
  ["/trade/drilling/thing/bailer", "a hide on a stave — drilling's to declare"],
]);

/**
 * ⭐ Arm 8's census (repair D7): bill parts no shipped recipe makes, each
 * with WHY. A part made by a verb that is not a recipe cannot be mended
 * under a known trade — such a line is mended as if competent, which is
 * honest only because this list names it. ⚠ It may shrink, never grow.
 */
export const UNMADE_PARTS: ReadonlyMap<string, string> = new Map([
  ["/stuff/thing/arms/nock", "the bow's nock — no fletcher's recipe yet"],
  ["/trade/apiculture/thing/bellows", "the smoker's bellows — no maker"],
  ["/trade/carpentry/thing/board", "a board is SAWN by the saw verb, not a recipe"],
  // ⭐ (ceramics W5) A fired-clay part is SHAPED (`shape` at the brick table,
  // the wheel, the hand) and FIRED by its material's heat transitions —
  // there is no recipe, by design (firing is one rule, M1). The trade that
  // mends it is the form row's discipline.
  ["/stuff/thing/firebrick", "a firebrick is moulded by `shape` at the brick table and fired — no recipe, by design"],
  ["/trade/ceramics/thing/handle", "a handle is pulled by `shape` and joined green with slip — no recipe, by design"],
  ["/trade/chandlery/thing/wick", "the lantern's wick — no maker"],
  ["/trade/glass/thing/pane", "a pane is made at the glass bench, not by a recipe"],
  ["/trade/mining/thing/compass-housing", "the compass's housing — no maker"],
  ["/trade/mining/thing/compass-needle", "the compass's needle — no maker"],
  ["/trade/mining/thing/compass-rose", "the compass's rose — no maker"],
  ["/trade/smithing/thing/canister", "the smoker's canister — no maker"],
  ["/trade/tailoring/thing/cushion-cover", "the cushion's cover — no maker"],
  ["/trade/tailoring/thing/stuffing", "the cushion's stuffing — no maker"],
  ["/trade/tanning/thing/bellows-gusset", "the bellows' gusset — no maker"],
  ["/trade/tanning/thing/hide-face", "the hide-faced shield's face — no maker"],
  ["/trade/textiles/thing/bowstring", "the bow's string — no maker"],
  ["/trade/textiles/thing/whorl", "the spindle's whorl — no maker"],
]);

export interface BillFinding {
  where: string;
  detail: string;
}

interface RecipeDoc {
  file: string;
  recipeId: string;
  outputTemplate: string;
  /** `tangible` makes a thing; anything else fills a vessel (default `bulk`). */
  application: string;
  slots: { slot: string; count: number; kind: string }[];
}

/**
 * The census over an already-read world — pure, so the test hands it
 * fixtures. `rows` is every template row by path; `recipes` every shipped
 * recipe document.
 */
export function checkBills(
  rows: ReadonlyMap<string, TemplateRow>,
  recipes: readonly RecipeDoc[],
  /** Does this class compose `AssembledMixin`? Arm 7; omitted, it is skipped. */
  assembled?: (classPath: string) => boolean,
  /** Composition probes for arm 7d; omitted, 7d is skipped. */
  probes?: {
    durable: (classPath: string) => boolean;
    stackable: (classPath: string) => boolean;
  },
  /** Arm 8's census; omitted, arm 8 is skipped. */
  unmade?: ReadonlyMap<string, string>,
  /** Arm 7b's census; omitted, every 7b finding is reported. */
  undeclared?: ReadonlyMap<string, string>,
): BillFinding[] {
  const out: BillFinding[] = [];
  const at = (row: TemplateRow): string => relative(CONTENT, row.file);

  // The joint vocabulary and the Discipline keys, by class.
  const joints = new Map<string, TemplateRow>();
  const disciplines = new Set<string>();
  for (const row of rows.values()) {
    const data = (row.raw.data ?? {}) as Record<string, unknown>;
    if (row.raw.class === "/platform/idea/Joint" && typeof data.key === "string") {
      joints.set(data.key, row);
    }
    if (row.path.includes("/idea/Discipline/") && typeof data.key === "string") {
      disciplines.add(data.key);
    }
  }

  // 5 — every joint's competence names a Discipline that exists.
  for (const [key, row] of joints) {
    const data = (row.raw.data ?? {}) as Record<string, unknown>;
    const comp = data.competence as { discipline?: unknown } | null | undefined;
    if (comp === null || comp === undefined) {
      if ((data.portability ?? "hand") !== "hand") {
        out.push({
          where: at(row),
          detail: `joint '${key}' carries no competence but is not a \`hand\` joint — only the hand rung may be ungated`,
        });
      }
      continue;
    }
    if (typeof comp.discipline !== "string" || !disciplines.has(comp.discipline)) {
      out.push({
        where: at(row),
        detail:
          `joint '${key}' is gated on Discipline '${String(comp.discipline)}', ` +
          `which no row ships — every salvager would read as a novice, silently. ` +
          `Ship the joint in the pack that ships the Discipline.`,
      });
    }
  }

  // 1, 2, 4 — every bill.
  const bills = new Map<string, Record<string, unknown>>();
  for (const [path, row] of rows) {
    const eff = effectiveRow(path, rows);
    const data = eff.data;
    const bill = data.bill as Record<string, unknown> | undefined | null;
    if (!bill) continue;
    bills.set(path, bill);
    if (data.constructionForm === "mail") {
      out.push({
        where: at(row),
        detail: `mail is a MATERIAL, not an assembly of rings — a mail row has no bill`,
      });
    }
    if (REFUSED.has(path)) {
      out.push({
        where: at(row),
        detail: `${path} is a container you put things IN — refused a bill on the record (assembly AC 16)`,
      });
    }
    const parts = Array.isArray(bill.parts) ? (bill.parts as Record<string, unknown>[]) : [];
    if (parts.length === 0) {
      out.push({ where: at(row), detail: `a bill with no parts` });
      continue;
    }
    const names = new Map<string, string>();
    for (const p of parts) {
      const name = String(p.part ?? "");
      if (!name) {
        out.push({ where: at(row), detail: `a bill part with no name` });
        continue;
      }
      names.set(name, String(p.role ?? ""));
      if (!ROLES.has(String(p.role))) {
        out.push({ where: at(row), detail: `part '${name}' has role '${String(p.role)}' — one of ${[...ROLES].join("|")}` });
      }
      if (typeof p.count !== "number" || p.count < 1) {
        out.push({ where: at(row), detail: `part '${name}' needs a positive count` });
      }
      if (typeof p.template !== "string" || !rows.has(p.template)) {
        out.push({ where: at(row), detail: `part '${name}' names template '${String(p.template)}', which no row ships` });
      }
      if (p.material !== undefined && (typeof p.material !== "string" || !rows.has(p.material))) {
        out.push({ where: at(row), detail: `part '${name}' names material '${String(p.material)}', which no row ships` });
      }
    }
    // 6 — the parts weigh no more than the whole.
    const own = Number(data.mass ?? 0);
    let partsKg = 0;
    for (const p of parts) {
      if (typeof p.template !== "string" || !rows.has(p.template)) continue;
      partsKg += Number(effectiveRow(p.template, rows).data.mass ?? 0) * Number(p.count ?? 1);
    }
    if (!(own > 0)) {
      out.push({ where: at(row), detail: `a row with a bill states its mass (its parts weigh ${partsKg.toFixed(2)} kg)` });
    } else if (partsKg > own * 1.0001) {
      out.push({
        where: at(row),
        detail:
          `its parts weigh ${partsKg.toFixed(2)} kg and the whole ${own} kg — salvage ` +
          `conserves mass, so taking it apart would be refused as a breach`,
      });
    }
    const js = Array.isArray(bill.joints) ? (bill.joints as Record<string, unknown>[]) : [];
    for (const j of js) {
      const key = String(j.key ?? "");
      const method = String(j.method ?? "");
      if (!joints.has(method)) {
        out.push({ where: at(row), detail: `joint '${key}' uses method '${method}', which no Joint row ships` });
      }
      const members = Array.isArray(j.members) ? j.members.map(String) : [];
      if (members.length === 0) {
        out.push({ where: at(row), detail: `joint '${key}' holds no members` });
      }
      for (const m of members) {
        if (!names.has(m)) out.push({ where: at(row), detail: `joint '${key}' names member '${m}', which is not a part of this bill` });
      }
      if (j.fastener !== undefined) {
        const f = String(j.fastener);
        if (!names.has(f)) {
          out.push({ where: at(row), detail: `joint '${key}' names fastener '${f}', which is not a part of this bill` });
        } else if (names.get(f) !== "fastener") {
          out.push({ where: at(row), detail: `joint '${key}' names fastener '${f}', whose role is '${names.get(f)}', not 'fastener'` });
        }
      }
    }
  }

  // 7 — the mixin on the families; a billless row is one piece.
  // The item-slot names of every recipe that makes a row, by output.
  const slotsByOutput = new Map<string, Set<string>>();
  const tangible = recipes.filter((r) => r.application === "tangible");
  for (const r of tangible) {
    const names = new Set(r.slots.filter((x) => x.kind === "item").map((x) => x.slot));
    const prior = slotsByOutput.get(r.outputTemplate);
    if (!prior || names.size > prior.size) slotsByOutput.set(r.outputTemplate, names);
  }
  if (assembled) {
    for (const [path, row] of rows) {
      const eff = effectiveRow(path, rows);
      if (!eff.class) continue;
      const billed = !!eff.data.bill;
      const composes = assembled(eff.class);
      // 7a — a bill nothing reads.
      if (billed && !composes) {
        out.push({
          where: at(row),
          detail:
            `a bill on a ${eff.class}, which does not compose AssembledMixin — the ` +
            `parts record would never be read. Name the family class (Tool, Vat, ` +
            `Lamp, Weapon…), or compose the mixin on this family.`,
        });
      }
      // 7b — made of parts by its recipe, but no bill declares them.
      const slots = slotsByOutput.get(path);
      if (composes && !billed && slots && slots.size >= 2 && !undeclared?.has(path)) {
        out.push({
          where: at(row),
          detail:
            `its recipe consumes ${slots.size} distinct parts (${[...slots].join(", ")}) ` +
            `but the row has no bill — the mint would record a thing of parts nobody ` +
            `declared. Give it a bill (repair D7 7b).`,
        });
      }
      // 7c — a composing class's billless row is one piece: nothing to say.
      if (undeclared?.has(path) && (billed || !slots || slots.size < 2)) {
        out.push({
          where: at(row),
          detail: `on UNDECLARED_ASSEMBLIES but it has a bill or is no longer made from parts — take it off the list (the ratchet only falls)`,
        });
      }
    }
    // 7d — the families we write recipes for: a recipe output that wears.
    if (probes) {
      const seen = new Set<string>();
      for (const r of tangible) {
        if (seen.has(r.outputTemplate) || !rows.has(r.outputTemplate)) continue;
        seen.add(r.outputTemplate);
        const eff = effectiveRow(r.outputTemplate, rows);
        if (!eff.class) continue;
        if (!probes.durable(eff.class) || probes.stackable(eff.class)) continue;
        if (assembled(eff.class)) continue;
        out.push({
          where: relative(CONTENT, r.file),
          detail:
            `recipe '${r.recipeId}' makes ${r.outputTemplate}, a ${eff.class} that ` +
            `wears (Durable) but does not compose AssembledMixin — a thing we write ` +
            `recipes for is parts or one piece (repair D4, D7 7d). Compose the mixin ` +
            `on the family.`,
        });
      }
    }
  }

  // 8 — every bill part is made by a recipe, or is named on the census.
  if (unmade) {
    const made = new Set(tangible.map((r) => r.outputTemplate));
    const parts = new Set<string>();
    for (const bill of bills.values()) {
      for (const p of (bill.parts as Record<string, unknown>[]) ?? []) {
        if (typeof p.template === "string") parts.add(p.template);
      }
    }
    for (const t of [...parts].sort()) {
      if (made.has(t) || unmade.has(t)) continue;
      out.push({
        where: t,
        detail:
          `a bill part no shipped recipe makes — the trade that mends it cannot be ` +
          `known. Write its recipe, or name it on UNMADE_PARTS with why (repair D7 8).`,
      });
    }
    for (const t of unmade.keys()) {
      if (made.has(t)) {
        out.push({
          where: t,
          detail: `on UNMADE_PARTS but a recipe now makes it — take it off the list (the ratchet only falls)`,
        });
      } else if (!parts.has(t)) {
        out.push({
          where: t,
          detail: `on UNMADE_PARTS but no bill names it any more — take it off the list`,
        });
      }
    }
  }

  // 3 — one declaration: the recipe's slots cover the bill.
  for (const r of recipes) {
    const bill = bills.get(r.outputTemplate);
    if (!bill) continue;
    const parts = (bill.parts as Record<string, unknown>[]) ?? [];
    for (const p of parts) {
      if (p.role !== "structural" && p.role !== "fastener") continue;
      const name = String(p.part);
      const slot = r.slots.find((s) => s.slot === name && s.kind === "item");
      if (!slot) {
        out.push({
          where: relative(CONTENT, r.file),
          detail:
            `recipe '${r.recipeId}' makes ${r.outputTemplate}, whose bill has a ` +
            `${String(p.role)} part '${name}' — and no item slot named '${name}' supplies it`,
        });
      } else if (slot.count !== p.count) {
        out.push({
          where: relative(CONTENT, r.file),
          detail:
            `recipe '${r.recipeId}' slot '${name}' takes ${slot.count}; the bill of ` +
            `${r.outputTemplate} says ${String(p.count)}`,
        });
      }
    }
  }
  return out;
}

/** Every pack-shipped recipe document, read. */
export function readRecipes(contentDir: string = CONTENT): RecipeDoc[] {
  const out: RecipeDoc[] = [];
  if (!existsSync(contentDir)) return out;
  for (const pack of readdirSync(contentDir).sort()) {
    const dir = join(contentDir, pack, "content", "recipes");
    if (!existsSync(dir)) continue;
    for (const file of walkYamlFiles(dir)) {
      let doc: Record<string, unknown>;
      try {
        doc = (YAML.parse(readFileSync(file, "utf8")) ?? {}) as Record<string, unknown>;
      } catch {
        continue;
      }
      const slots = Array.isArray(doc.inputSlots)
        ? (doc.inputSlots as Record<string, unknown>[]).map((s) => ({
            slot: String(s.slot ?? ""),
            count: typeof s.count === "number" ? s.count : 1,
            kind: String(s.kind ?? "bulk"),
          }))
        : [];
      out.push({
        file,
        recipeId: String(doc.recipeId ?? ""),
        outputTemplate: String(doc.outputTemplate ?? ""),
        application:
          doc.outputApplication === "tangible" || doc.outputApplication === "edible"
            ? String(doc.outputApplication)
            : "bulk",
        slots,
      });
    }
  }
  return out;
}

function main(): void {
  const { rows } = inheritanceIndex(SERVER_SRC, CONTENT);
  const sources = packSources();
  const cache = new Map<string, boolean>();
  const mixinCache = new Map<string, Map<string, boolean>>();
  const probe = (mixin: string) => (c: string): boolean => {
    let m = mixinCache.get(mixin);
    if (!m) mixinCache.set(mixin, (m = new Map()));
    return composesMixin(c, mixin, sources, m);
  };
  const findings = checkBills(
    rows,
    readRecipes(),
    (c) => composesMixin(c, "AssembledMixin", sources, cache),
    { durable: probe("DurableMixin"), stackable: probe("StackableMixin") },
    UNMADE_PARTS,
    UNDECLARED_ASSEMBLIES,
  );
  let billCount = 0;
  for (const path of rows.keys()) {
    if (effectiveRow(path, rows).data.bill) billCount++;
  }
  if (findings.length === 0) {
    console.info(`check-bills: ok — ${billCount} bill(s), every part, joint and recipe slot agrees.`);
    return;
  }
  for (const f of findings) console.error(`  ⚠ ${f.where}\n      ${f.detail}`);
  console.error(
    `\n✖ check-bills: ${findings.length} finding(s). A bill and the recipe that ` +
      `makes it are ONE declaration (assembly D11); every name in a bill must exist.`,
  );
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-bills.ts")) {
  main();
}
