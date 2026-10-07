/**
 * ⭐⭐ `lint:reachability` seen to FAIL — `docs/lint-family.md:71-78`.
 *
 * A gate nobody watched fail is a gate nobody can trust, and this family
 * has shipped gates that passed because they were not looking (the
 * census went blind on 322 of 462 refs after a field rename and went on
 * reporting green). So every arm runs here over a synthetic pack tree
 * holding one of each violation class, and every assertion is a
 * **POSITIVE**: the arm FINDS the thing.
 *
 * The fixture tree is `scripts/__fixtures__/reachability/`; each file in
 * it says in a comment which class it is.
 */

import { describe, expect, it } from "vitest";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  SERVER_SRC,
  run,
  phraseShapeOf,
  articleShapesOf,
  viewKey,
  isThingPath,
} from "../check-reachability";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, "..", "__fixtures__", "reachability");
const CONTENT = join(FIXTURES, "content");
const SLATES = join(FIXTURES, "docs", "slates");
// ⚠ A directory that does not exist, deliberately: the kernel's own
// literals must not leak into the fixture run and confer a fixture view.
const NO_MUD = join(FIXTURES, "no-such-mud");

const report = run(CONTENT, SERVER_SRC, NO_MUD, SLATES);

const view = (key: string) => report.views.find((v) => v.key.endsWith(key));
const row = (path: string) => report.rows.find((r) => r.path === path);
const findings = (where: string) =>
  report.findings.filter((f) => f.where.includes(where));

describe("arm A — the affordance census", () => {
  it("finds a view no static names", () => {
    const v = view("orphan.yaml");
    expect(v?.conferred).toBe(false);
    expect(v?.disposition).toBeNull();
    const f = findings("orphan.yaml").filter((x) => x.arm === "A");
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain("no commandContributions static names this view");
  });

  it("counts a view a same-file const confers", () => {
    expect(view("conferred.yaml")?.conferred).toBe(true);
    expect(findings("conferred.yaml").filter((x) => x.arm === "A")).toHaveLength(0);
  });

  it("accepts a view held against a slate that exists", () => {
    expect(view("held.yaml")?.disposition).toBe("awaiting:fixture-slate");
    expect(findings("held.yaml")).toHaveLength(0);
  });

  it("finds a reason stranded against a slate that does not exist", () => {
    const f = findings("stranded.yaml").filter((x) => x.arm === "carrier");
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain("no docs/slates");
  });

  it("finds a disposition outside the vocabulary", () => {
    const f = findings("bogus.yaml").filter((x) => x.arm === "carrier");
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain("outside the vocabulary");
  });

  it("finds a view that is BOTH declared unreachable and conferred", () => {
    const f = findings("both.yaml").filter((x) => x.arm === "A");
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain("the declaration is now a lie");
  });

  it("reports a commandContributions list built from a template literal", () => {
    const f = report.findings.filter(
      (x) => x.arm === "scan" && x.where.includes("Computed.ts"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain("computed element");
  });

  it("keys a view by its path under the pack's content/", () => {
    expect(viewKey(join(CONTENT, "fixturepack", "content", "a", "cmd", "b.yaml"), CONTENT))
      .toBe("a/cmd/b.yaml");
  });
});

describe("arm G — the phrase-shape census", () => {
  it("finds a string positional followed by an optional defaulted object", () => {
    expect(report.phrase.map((p) => p.key)).toContain("fixture/cmd/fixture/phrase.yaml");
  });

  it("does NOT flag the same shape when the string arg is greedy", () => {
    expect(report.phrase.map((p) => p.key)).not.toContain(
      "fixture/cmd/fixture/safe-phrase.yaml",
    );
  });

  it("finds a prepositional object arg that is not greedy (the article shape)", () => {
    expect(report.article.map((a) => `${a.key}:${a.arg}`)).toContain(
      "fixture/cmd/fixture/phrase.yaml:counter",
    );
  });

  it("does NOT flag a prepositional object arg that IS greedy", () => {
    expect(
      articleShapesOf({
        args: [{ name: "kit", type: "object", prepositions: ["with"], greedy: true }],
      }),
    ).toEqual([]);
  });

  it("⭐ reads a SUBCOMMAND's args too — they bind the same way", () => {
    expect(
      articleShapesOf({
        subcommands: {
          post: { args: [{ name: "board", type: "object", prepositions: ["to"] }] },
        },
      }),
    ).toEqual(["post.board"]);
  });

  it("ignores a trailing object with no default — there is no bare form to break", () => {
    expect(
      phraseShapeOf({
        args: [
          { name: "thing", type: "string", required: true },
          { name: "counter", type: "object", required: true },
        ],
      }),
    ).toBeNull();
  });
});

describe("arm R — the row census", () => {
  it("counts a row a props: entry places", () => {
    expect(row("/fixture/thing/propped")?.how).toBe("faucet");
  });

  it("counts a row a recipe mints, from the document's TOP level", () => {
    const r = row("/fixture/thing/recipe-output");
    expect(r?.how).toBe("faucet");
    expect(r?.detail).toContain("outputTemplate");
  });

  it("counts a row that places itself with container:", () => {
    expect(row("/fixture/thing/self-placed")?.how).toBe("self-placed");
  });

  it("counts a census-drawn row with its own positive target", () => {
    expect(row("/fixture/thing/drawn")?.how).toBe("census");
  });

  it("counts a census row whose target comes from a zone's stocks: override", () => {
    const r = row("/fixture/thing/zone-drawn");
    expect(r?.how).toBe("census");
    expect(r?.detail).toContain("zone override");
  });

  it("finds a censusKey parked at a target of zero", () => {
    const r = row("/fixture/thing/zeroed");
    expect(r?.how).toBeNull();
    expect(r?.detail).toContain("never drawn");
  });

  it("finds a censusKey on a class composing no CirculatingMixin", () => {
    const r = row("/fixture/thing/inert-key");
    expect(r?.how).toBeNull();
    expect(r?.detail).toContain("inert");
  });

  it("counts a parent whose child is reachable", () => {
    const r = row("/fixture/thing/base");
    expect(r?.how).toBe("parent");
    expect(r?.detail).toContain("/fixture/thing/child");
  });

  it("counts a row a source literal names outright", () => {
    expect(row("/fixture/thing/code-named")?.how).toBe("code");
  });

  it("counts a row a source literal reaches by DIRECTORY prefix", () => {
    const r = row("/fixture/thing/prefixed/one");
    expect(r?.how).toBe("prefix");
    expect(r?.detail).toContain("/fixture/thing/prefixed");
  });

  it("accepts a declared substrate exemplar", () => {
    const r = row("/fixture/thing/declared");
    expect(r?.how).toBe("declared");
    expect(r?.detail).toBe("exemplar");
  });

  it("⚠ does NOT count a row named only by a __tests__ file", () => {
    expect(row("/fixture/thing/test-named")?.how).toBeNull();
  });

  it("⚠ does NOT count a row named only by a CITATION field", () => {
    expect(row("/fixture/thing/cited")?.how).toBeNull();
  });

  it("reports a path-valued field in neither FAUCETS nor CITATIONS", () => {
    const f = report.findings.filter(
      (x) => x.arm === "field" && x.detail.includes("wellspringOfWidgets"),
    );
    expect(f).toHaveLength(1);
    expect(f[0]!.detail).toContain("gone blind");
  });

  it("recognizes a thing path by its branch segment", () => {
    expect(isThingPath("/trade/cooking/thing/cut-breast")).toBe(true);
    expect(isThingPath("/stuff/idea/material/honey")).toBe(false);
    expect(isThingPath("thing/not-a-path")).toBe(false);
  });
});
