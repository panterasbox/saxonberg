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
  effectiveRow,
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

export interface BillFinding {
  where: string;
  detail: string;
}

interface RecipeDoc {
  file: string;
  recipeId: string;
  outputTemplate: string;
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
        slots,
      });
    }
  }
  return out;
}

function main(): void {
  const { rows } = inheritanceIndex(SERVER_SRC, CONTENT);
  const findings = checkBills(rows, readRecipes());
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
