/**
 * `lint:institution-verbs` seen to FAIL: a flat view whose operand is a
 * book IS found, both ways the operand can be (declared, or implicit in the
 * controller's book write) — and the acts D9 keeps bare are not.
 */

import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { INSTITUTION_VERBS_CEILING, census } from "../check-institution-verbs";

/**
 * A throwaway pack tree: views under `p/content/trade/x/cmd/x/`, the pack's
 * controllers under `p/src/idea/cmd/x/` (the pack root is `/trade/x`).
 */
function tree(views: Record<string, string>, controllers: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "inst-"));
  const pack = join(root, "p");
  const vdir = join(pack, "content", "trade", "x", "cmd", "x");
  const cdir = join(pack, "src", "idea", "cmd", "x");
  mkdirSync(vdir, { recursive: true });
  mkdirSync(cdir, { recursive: true });
  writeFileSync(join(pack, "pack.yaml"), "id: p\nroot: /trade/x\n");
  for (const [name, body] of Object.entries(views)) writeFileSync(join(vdir, `${name}.yaml`), body);
  for (const [name, body] of Object.entries(controllers)) writeFileSync(join(cdir, `${name}.ts`), body);
  return root;
}

const SHELF_ARG = `args:
  - { name: shelf, type: object, requires: [ConsignmentShelfMixin] }
`;

describe("the classifier", () => {
  it("FINDS a flat view whose declared operand is a book", () => {
    const r = census(tree({ consign: `verbs: [consign]\ncontroller: /trade/x/idea/cmd/x/C\n${SHELF_ARG}` }));
    expect(r.map((f) => f.verb)).toEqual(["consign"]);
  });

  it("FINDS a flat view whose controller writes a book (the implicit operand)", () => {
    const r = census(
      tree(
        { appoint: "verbs: [appoint]\ncontroller: /trade/x/idea/cmd/x/AppointController\n" },
        { AppointController: "export class AppointController { async execute() { await house.appoint(p, 'cook'); } }" },
      ),
    );
    expect(r.map((f) => f.verb)).toEqual(["appoint"]);
  });

  it("⭐ the same transaction as a SUBCOMMAND of the book's noun is clean", () => {
    const r = census(
      tree({ shelf: `verbs: [shelf]\ncontroller: /trade/x/idea/cmd/x/S\nsubcommands:\n  consign:\n    ${SHELF_ARG.replace(/\n {2}/g, "\n      ")}` }),
    );
    expect(r).toEqual([]);
  });

  it("⚠ a `book` named arg that requires no book mixin (rent's hire book) is an act", () => {
    const r = census(
      tree({ rent: "verbs: [rent]\ncontroller: /x/R\nargs:\n  - { name: book, type: object, requires: [VisibleMixin] }\n" }),
    );
    expect(r).toEqual([]);
  });

  it("⚠ a sale settled through the bank is an act, not a book write", () => {
    const r = census(
      tree(
        { buy: "verbs: [buy]\ncontroller: /trade/x/idea/cmd/x/BuyController\n" },
        { BuyController: "export class BuyController { execute() { BankingApi.settleSale(a, b); } }" },
      ),
    );
    expect(r).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at or below the ceiling, above zero", () => {
    const n = census().length;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(INSTITUTION_VERBS_CEILING);
  });
});
