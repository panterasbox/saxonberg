/**
 * check-shopfronts — ⭐ **a counter that names its house is a place that
 * house trades.**
 *
 * A sale settles to the business found at the COUNTER's own path
 * (`EmploymentApi.settleSale(stock.getIdentityPath(), …)` → the operator
 * index over every Business row's `operatingLocations`). A counter row
 * whose `businessPath` names a house that does not list the counter is a
 * shop where nothing can be bought — and the refusal the buyer reads is
 * *"You can't cover …"*, which blames their purse. Nothing at runtime says
 * why. Found by the assembly drive: the Heart's Delight timber yard listed
 * only its room, and no stave, board or billet was ever sold.
 *
 * The rule: every template row that declares `businessPath` names an
 * authored Business row, and that row's `operatingLocations` lists the
 * counter's own path. (Listing the ROOM as well is the general store's
 * precedent and is what a supplier is found by; this gate asks only for
 * the half a sale needs.)
 */

import { relative } from "path";
import {
  CONTENT,
  SERVER_SRC,
  effectiveRow,
  inheritanceIndex,
  type TemplateRow,
} from "./pack-roots";

export interface ShopfrontFinding {
  where: string;
  detail: string;
}

/** The census over an already-read world — pure, so a test hands it fixtures. */
export function checkShopfronts(
  rows: ReadonlyMap<string, TemplateRow>,
): ShopfrontFinding[] {
  const out: ShopfrontFinding[] = [];
  for (const [path, row] of rows) {
    const data = effectiveRow(path, rows).data;
    const business = data.businessPath;
    if (typeof business !== "string" || business.length === 0) continue;
    const at = relative(CONTENT, row.file);
    const house = rows.get(business);
    if (!house) {
      out.push({ where: at, detail: `businessPath '${business}' names no authored row` });
      continue;
    }
    const where = effectiveRow(business, rows).data.operatingLocations;
    const listed = Array.isArray(where) ? where.map(String) : [];
    if (!listed.includes(path)) {
      out.push({
        where: at,
        detail:
          `${path} names ${business} as its house, which does not list it in ` +
          `operatingLocations — every sale here settles to nobody and the buyer ` +
          `is told they "can't cover" it. Add the counter's path.`,
      });
    }
  }
  return out;
}

function main(): void {
  const { rows } = inheritanceIndex(SERVER_SRC, CONTENT);
  const findings = checkShopfronts(rows);
  if (findings.length === 0) {
    console.info("check-shopfronts: ok — every counter that names a house is a place that house trades.");
    return;
  }
  for (const f of findings) console.error(`  ⚠ ${f.where}\n      ${f.detail}`);
  console.error(`\n✖ check-shopfronts: ${findings.length} finding(s).`);
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1].endsWith("check-shopfronts.ts")) {
  main();
}
