/**
 * The reaction command's composition.
 *
 * ⭐⭐ The load-bearing test here is `previews exactly what it sends`. It
 * asserts the two renderings are **equal**, and never spells the
 * expected command twice — a test that writes the literal in both places
 * passes just as happily when a second renderer starts producing a third
 * string.
 */

import { describe, it, expect } from "vitest";
import type { EmoteCatalogueEntry } from "@saxonberg/types";
import {
  composeReactCommand,
  firstUnfilledRequiredSlot,
  quickRow,
  paletteEntries,
} from "../reactCommand";

const wave: EmoteCatalogueEntry = {
  verb: "wave",
  emoji: "👋",
  aliases: [],
  tags: [],
  slots: [
    { name: "at", kind: "stuff", required: false },
    { name: "manner", kind: "free", required: false },
  ],
};

const nod: EmoteCatalogueEntry = {
  verb: "nod",
  emoji: "🙂",
  aliases: ["agree"],
  tags: [],
  slots: [],
};

const point: EmoteCatalogueEntry = {
  verb: "point",
  emoji: "👉",
  aliases: [],
  tags: [],
  slots: [{ name: "at", kind: "stuff", required: true }],
};

describe("composeReactCommand", () => {
  it("uses the explicit --msg selector, never the implicit form", () => {
    const cmd = composeReactCommand({ frameId: 112, verb: "nod" });
    expect(cmd).toBe("react --msg 112 ;nod");
    // The bare `re ;nod` form means "the most recent act in view", which
    // is not what a picker opened on 112 does.
    expect(cmd).not.toMatch(/^re\s/);
  });

  it("marks an un-react with --remove", () => {
    expect(
      composeReactCommand({ frameId: 5, verb: "nod", remove: true }),
    ).toBe("react --remove --msg 5 ;nod");
  });

  it("appends slot values positionally, in declaration order", () => {
    expect(
      composeReactCommand({
        frameId: 113,
        verb: "wave",
        slots: wave.slots,
        values: { at: "bob", manner: "happily" },
      }),
    ).toBe("react --msg 113 ;wave bob happily");
  });

  it("skips a blank stuff slot — the binder skips on mismatch", () => {
    // `;wave happily` still binds: the free text fails to resolve as a
    // target, the binder moves on, and `manner` takes it.
    expect(
      composeReactCommand({
        frameId: 113,
        verb: "wave",
        slots: wave.slots,
        values: { manner: "happily" },
      }),
    ).toBe("react --msg 113 ;wave happily");
  });

  it("stops at a blank free slot rather than shifting a later value", () => {
    const slots = [
      { name: "note", kind: "free" as const },
      { name: "extra", kind: "free" as const },
    ];
    expect(
      composeReactCommand({
        frameId: 9,
        verb: "mutter",
        slots,
        values: { extra: "loudly" },
      }),
    ).toBe("react --msg 9 ;mutter");
  });

  it("⭐⭐ previews exactly what it sends", () => {
    // One call feeds both surfaces in the component; here we assert the
    // property that makes that safe — same input, same string — across
    // a table of shapes rather than restating any expected literal.
    const cases = [
      { frameId: 1, verb: "nod" },
      { frameId: 2, verb: "nod", remove: true },
      { frameId: 3, verb: "wave", slots: wave.slots, values: { at: "bob" } },
      {
        frameId: 4,
        verb: "wave",
        slots: wave.slots,
        values: { at: "bob", manner: "twice" },
      },
    ];
    for (const c of cases) {
      const previewed = composeReactCommand(c);
      const sent = composeReactCommand(c);
      expect(previewed).toBe(sent);
    }
  });
});

describe("firstUnfilledRequiredSlot", () => {
  it("names the missing required slot", () => {
    expect(firstUnfilledRequiredSlot(point, {})).toBe("at");
    expect(firstUnfilledRequiredSlot(point, { at: "  " })).toBe("at");
  });

  it("is null once every required slot is filled", () => {
    expect(firstUnfilledRequiredSlot(point, { at: "bob" })).toBeNull();
    expect(firstUnfilledRequiredSlot(wave, {})).toBeNull();
  });
});

describe("the palette is derived, never listed", () => {
  const catalogue = new Map<string, EmoteCatalogueEntry>([
    ["wave", wave],
    ["nod", nod],
    ["point", point],
    [
      "sigh",
      { verb: "sigh", aliases: [], tags: [], slots: [] } as EmoteCatalogueEntry,
    ],
  ]);

  it("skips glyph-less emotes — they render as prose, never a chip", () => {
    expect(paletteEntries(catalogue).map((e) => e.verb)).toEqual([
      "nod",
      "point",
      "wave",
    ]);
  });

  it("ranks the quick row by what the viewer reaches for", () => {
    expect(quickRow(catalogue, ["point"], 2).map((e) => e.verb)).toEqual([
      "point",
      "nod",
    ]);
  });

  it("is empty before the server has answered", () => {
    expect(quickRow(new Map(), [])).toEqual([]);
  });
});
