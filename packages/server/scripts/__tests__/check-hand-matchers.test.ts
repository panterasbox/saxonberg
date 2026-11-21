/**
 * `lint:hand-matchers` seen to FAIL (docs/lint-family.md § Four ways a
 * census lies): each matcher shape is FOUND, and the same code naming by
 * the one rule is not.
 */

import { describe, expect, it } from "vitest";
import { parseTs } from "../pack-roots";
import {
  ARTICLE_STRIP_CEILING,
  DURATION_PARSE_CEILING,
  HAND_COMPARE_CEILING,
  MUST_FIND,
  WORD_MAP_CEILING,
  census,
  scanModule,
} from "../check-hand-matchers";

const scan = (src: string, rel = "packages/server/src/mud/lib/x/X.ts") =>
  scanModule(parseTs("/x.ts", src), rel).map((s) => [s.kind, s.symbol]);

describe("the four matcher shapes", () => {
  it("FINDS an article strip (a leading the/a/an regex, or GrammarApi.ARTICLES)", () => {
    expect(scan(`function shipFor(w: string) { return w.replace(/^the\\s+/, ''); }`)).toContainEqual(["article-strip", "shipFor"]);
    expect(scan(`class B { pick(w: string) { return w.replace(/^(?:a|an|the)\\s+/i, ''); } }`)).toContainEqual(["article-strip", "B.pick"]);
    expect(scan(`function f(w: string) { return GrammarApi.ARTICLES.has(w); }`)).toContainEqual(["article-strip", "f"]);
  });

  it("FINDS a hand compare — a lowered word compared against names", () => {
    expect(scan(`class H { quayNamed(word: string) { const w = word.toLowerCase(); return this.quays.find((q) => q.name === w); } }`))
      .toContainEqual(["hand-compare", "H.quayNamed"]);
    expect(scan(`function answersTo(s: S, label: string) { return s.keywords.some((k) => k.toLowerCase().startsWith(label)); }`))
      .toContainEqual(["hand-compare", "answersTo"]);
  });

  it("FINDS a duration parse — a unit-word regex or a word table, outside CommandDefinition", () => {
    expect(scan(`function daysOf(t: string) { return /^(\\d+)\\s+(days?|weeks?)$/.exec(t); }`)).toContainEqual(["duration-parse", "daysOf"]);
    expect(scan(`function p(t: string) { return /^(\\d+)(s|m|h|d)?$/.exec(t); }`)).toContainEqual(["duration-parse", "p"]);
    expect(scan(`const DAY_WORDS = { a: 1, two: 2, week: 7 };`)).toContainEqual(["duration-parse", "<module>"]);
    expect(scan(`function d(t: string) { return /^(\\d+)\\s+(days?)$/.exec(t); }`, "packages/server/src/mud/lib/command/CommandDefinition.ts"))
      .toEqual([]);
  });

  it("FINDS a word-keyed index — built by `set` with a lowered key", () => {
    expect(scan(`class C { warm() { for (const s of xs) { const key = s.name.toLowerCase(); this.byName.set(key, s); } } }`))
      .toContainEqual(["word-map", "C.warm"]);
    expect(scan(`function idx(n: string) { table[n.toLowerCase()] = 1; }`)).toContainEqual(["word-map", "idx"]);
  });

  it("the same work done by the one rule finds nothing", () => {
    expect(scan(`class H { quayNamed(text: string) { return GrammarApi.name(text, this.quays.map((q) => ({ value: q, keywords: q.keywords, title: q.title }))); } }`))
      .toEqual([]);
  });

  it("⚠ what is not a matcher: an empty check, a calendar's placeholders, a dedup Set, a lowered word with no names around it", () => {
    expect(scan(`function f(word: string) { const w = word.toLowerCase(); if (w === '') return null; return w; }`)).toEqual([]);
    expect(scan(`function fmt(f: string) { return f.replace(/\\{day\\}/g, '1'); }`)).toEqual([]);
    expect(scan(`function k(xs: string[]) { const seen = new Set<string>(); for (const x of xs) seen.has(x.toLowerCase()); }`)).toEqual([]);
    expect(scan(`function c(mode: string) { return mode.toLowerCase() === 'loud'; }`)).toEqual([]);
  });

  it("a named exemption is not counted (hail waits on the signalling slate)", () => {
    expect(
      scan(`class HailableMixin { answersTo(word: string) { return this.name.toLowerCase() === word; } }`, "packages/server/src/mud/lib/expanse/Hailable.ts"),
    ).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("finds every grounding site by name (the census does not undercount)", () => {
    const sites = census();
    for (const m of MUST_FIND) {
      expect(sites.some((s) => s.kind === m.kind && s.symbol === m.symbol && s.file.endsWith(m.file)), `${m.file} ${m.symbol}`).toBe(true);
    }
  });

  it("each count is at or below its ceiling", () => {
    const sites = census();
    const n = (k: string) => sites.filter((s) => s.kind === k).length;
    expect(n("article-strip")).toBeLessThanOrEqual(ARTICLE_STRIP_CEILING);
    expect(n("hand-compare")).toBeLessThanOrEqual(HAND_COMPARE_CEILING);
    expect(n("duration-parse")).toBeLessThanOrEqual(DURATION_PARSE_CEILING);
    expect(n("word-map")).toBeLessThanOrEqual(WORD_MAP_CEILING);
  });
});
