/**
 * ⭐⭐ `lint:institution-verbs` — **a transaction with an institution's book
 * is a subcommand of the institution's noun** (controllers-are-io D9, as
 * command-taxonomy wrote it).
 *
 * *An act on the world is a bare verb; a transaction with an institution's
 * book is a subcommand of its noun.* `store` is the model: the book is the
 * operand, and every subcommand binds it. A FLAT `consign` or `appoint`
 * hides which book it writes, and puts the institution's vocabulary into
 * the global verb space where it collides with acts (`draw` a card, `check`
 * a pulse).
 *
 * ## What it counts — a FLAT view (no `subcommands:`) whose operand is a book
 *
 * The plan's rule, *"the view's operand is the book"*, read two ways,
 * because half the shipped institution verbs take the book IMPLICITLY (the
 * house you run, the job you hold, the parcel registry) and so carry no
 * operand arg to read:
 *
 *   1. **Declared operand** — an object arg named for a book (`BOOK_ARGS`)
 *      that requires a book mixin (`BOOK_MIXINS`). ⚠ The name alone is
 *      not enough: `rent`'s and `charter`'s `book` requires only
 *      `VisibleMixin` (a hire book is read, not written — the hire is an
 *      act on the boat), and `sell`'s counter is not named for a book.
 *   2. **Implicit operand** — the view's controller writes a book through
 *      one of its book methods (`BOOK_WRITES`): the roster
 *      (`.appoint`/`.dismiss`/`.quitJob`), the operating account
 *      (`payDraw`), the shelf and the rack (`recordListing`/
 *      `removeHolding`/`recordHolding`), the contract board
 *      (`ContractApi.fulfill`), the title registry (`ParcelApi.transfer`/
 *      `subdivide`). ⚠ Buying, selling, paying and tipping settle through
 *      the bank (`settle`/`settleSale`) — the bookkeeping FOLLOWS an act
 *      on a good or a person, and they are deliberately not here.
 *
 * ⚠ `ACTS_WHOSE_BOOKKEEPING_FOLLOWS` names the flat views the classifier
 * catches that D9 decides are acts, each with its reason — never a
 * to-do: `stake` and `stall` write a book as a side effect of an act on
 * the ground or a stall; `lease`/`provision` are domain-local wizard verbs
 * the wizard-axis build retires.
 *
 * ⭐ Census, then ratchet: the ceiling is this gate's census — D9's eleven
 * (`appoint`/`dismiss`/`draw` → `house`; `apply`/`quit`/`fulfill` → `job`;
 * `consign`/`reclaim` → `shelf`, `check` → `rack`; `transfer`/`subdivide`
 * → `title`) — driven to title's two at W7 and to 0 at W8.
 */

import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import {
  CONTENT,
  classFileOf,
  commandViews,
  controllerPathOf,
  packSources,
  ratchet,
  stripComments,
} from "./pack-roots";

export const INSTITUTION_VERBS_CEILING = 2; // W7: 11 → 2 — `house`, `job`, `shelf`, `rack` took nine; title's `transfer`/`subdivide` are W8's.

/** Arg names that name a book. */
const BOOK_ARGS = new Set(["book", "shelf", "rack", "organization", "registry", "register", "ledger"]);

/** Mixins whose instance IS a book (a written record an institution keeps). */
const BOOK_MIXINS = new Set([
  "ConsignmentShelfMixin",
  "HeldGoodsMixin",
  "OrganizationMixin",
  "BusinessMixin",
  "RegistrarMixin",
  "StoreBookMixin",
]);

/** A controller writing a book. */
const BOOK_WRITES =
  /\.(?:appoint|dismiss|quitJob|payDraw|recordListing|removeHolding|recordHolding)\s*\(|\bContractApi\.fulfill\s*\(|\bParcelApi\.(?:transfer|subdivide)\s*\(/;

/** Flat views the classifier catches that D9 decides are acts. */
const ACTS_WHOSE_BOOKKEEPING_FOLLOWS: Record<string, string> = {
  stake: "mining: an act on the ground; the claim's parcel is filed as a consequence (D9: acts).",
  stall: "the market: taking a stall appoints its keeper in passing — the act is the stall's.",
  lease: "domain-local wizard verb (mayfield-row); the wizard-axis build retires it.",
  provision: "domain-local wizard verb (duncan-hall); the wizard-axis build retires it.",
};

function requiresOf(arg: Record<string, unknown>): string[] {
  const r = arg.requires;
  const list = Array.isArray(r) ? r : typeof r === "string" ? [r] : [];
  return list.flatMap((x) => (typeof x === "string" ? x.split("|") : [])).map((x) => x.trim());
}

export interface InstitutionFinding {
  verb: string;
  view: string;
  why: string;
}

export function census(contentDir: string = CONTENT): InstitutionFinding[] {
  const sources = packSources(contentDir);
  const out: InstitutionFinding[] = [];
  for (const v of commandViews(contentDir)) {
    if (v.doc.subcommands) continue;
    const verb = Array.isArray(v.doc.verbs) ? String(v.doc.verbs[0]).toLowerCase() : "?";
    if (verb in ACTS_WHOSE_BOOKKEEPING_FOLLOWS) continue;
    const view = `${v.pack}/${v.rel}`;
    const args = Array.isArray(v.doc.args) ? (v.doc.args as Array<Record<string, unknown>>) : [];
    const declared = args.find(
      (a) =>
        (a.type === "object" || a.type === "objects") &&
        typeof a.name === "string" &&
        BOOK_ARGS.has(a.name) &&
        requiresOf(a).some((m) => BOOK_MIXINS.has(m)),
    );
    if (declared) {
      out.push({ verb, view, why: `operand '${String(declared.name)}' requires ${requiresOf(declared).join("|")}` });
      continue;
    }
    const ctrl = controllerPathOf(v.rel, v.doc.controller);
    if (!ctrl) continue;
    const file = classFileOf(ctrl, sources);
    if (!existsSync(file)) continue;
    const hit = BOOK_WRITES.exec(stripComments(readFileSync(file, "utf8")));
    if (hit) out.push({ verb, view, why: `controller writes a book: ${hit[0].trim()}` });
  }
  return out;
}

function main(): void {
  const findings = census();
  const ok = ratchet(
    "check-institution-verbs",
    "flat views whose operand is an institution's book",
    findings.length,
    INSTITUTION_VERBS_CEILING,
    findings.map((f) => `${f.verb}  ${f.view}  — ${f.why}`),
    "⭐ D9: a transaction with an institution's book is a subcommand of the\n" +
      "  institution's noun (`store` is the model — `house appoint`, `shelf\n" +
      "  consign`), binding the book as its operand.",
  );
  if (!ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
