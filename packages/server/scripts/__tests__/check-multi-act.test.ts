/** `lint:multi-act` seen to FAIL: each of the three shapes IS found. */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import { MULTI_ACT_CEILING, census, multiActShapes } from "../check-multi-act";

const shapes = (src: string): string[] => multiActShapes(parseTs("/XController.ts", src));

describe("the classifier", () => {
  it("FINDS a switch on the subcommand", () => {
    expect(shapes(`class X { execute(model) { switch (model.subcommand) { case "a": break; } } }`)).toEqual(["subcommand"]);
  });

  it("FINDS a subcommand compared with a word, whatever execute calls its model", () => {
    expect(shapes(`class X { execute(m) { if (m.subcommand === "list") return; } }`)).toEqual(["subcommand"]);
  });

  it("FINDS a dispatch on a positional's typed word", () => {
    expect(shapes(`class X { execute(model) { if (model.target?.raw === "off") return; } }`)).toEqual(["arg-word"]);
    expect(shapes(`class X { execute(model) { switch (model.mode) { case "up": break; } } }`)).toEqual(["arg-word"]);
  });

  it("FINDS two arms that do different acts to one target by its kind", () => {
    const src = [
      "class X { execute(model) {",
      "  const t = model.target.stuff;",
      "  if (MixinApi.isTieable(t)) { t.tieTo(x); return; }",
      "  if (t instanceof Bole) { t.crosscut(1); return; }",
      "} }",
    ].join("\n");
    expect(shapes(src)).toEqual(["target-kind"]);
  });

  it("two arms that only READ different things are one act", () => {
    const src = [
      "class X { execute(model) {",
      "  const t = model.target.stuff;",
      "  if (MixinApi.isContainer(t)) { lines.push(t.getContents()); }",
      "  if (MixinApi.isExitable(t)) { lines.push(t.getExits()); }",
      "} }",
    ].join("\n");
    expect(shapes(src)).toEqual([]);
  });

  it("a switch on a model field with no word cases is not a dispatch", () => {
    expect(shapes(`class X { execute(model) { switch (model.count) { case 1: break; } } }`)).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("at the ceiling", () => {
    expect(census().length).toBe(MULTI_ACT_CEILING);
  });
});
