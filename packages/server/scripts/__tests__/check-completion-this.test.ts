/**
 * `lint:completion-this` seen to FAIL on every form a completion can be
 * written in (controller-liquidity D12) — the three live sites it missed
 * were the hoisted const, the named reference and a parameter.
 */

import { describe, expect, it } from "vitest";
import { collectLiveFindings, scanCompletionThis, COMPLETION_THIS_CEILING } from "../check-completion-this";

const lines = (src: string): number[] => scanCompletionThis(src, "X.ts").map((f) => f.line);

describe("the classifier", () => {
  it("FINDS the inline block-bodied completion", () => {
    expect(lines(`class C { go() { start({ onComplete: () => { this.finish(); } }); } }`)).toHaveLength(1);
  });

  it("FINDS an expression-bodied completion", () => {
    expect(lines(`class C { go() { start({ onComplete: () => this.finish() }); } }`)).toHaveLength(1);
  });

  it("FINDS a hoisted const passed by name (Search's shape)", () => {
    const src = `class C { go() {\n const onComplete = (): void => this.render();\n start({\n onComplete,\n }); } }`;
    expect(lines(src)).toEqual([4]);
  });

  it("FINDS a hoisted const passed as `onComplete: <ident>` (Teleport's shape)", () => {
    const src = `class C { go() { const done = () => { void this.cast(); }; start({ onComplete: done }); } }`;
    expect(lines(src)).toHaveLength(1);
  });

  it("FINDS a parameter, resolved through the arrow every caller passes (Transfuse's shape)", () => {
    const src = [
      "class C {",
      "  go() { this.runOrEngage(ctx, () => { this.credit(); }); }",
      "  runOrEngage(ctx: unknown, effect: () => void) { start({ onComplete: effect }); }",
      "}",
    ].join("\n");
    expect(lines(src)).toEqual([3]);
  });

  it("FINDS a bound method reference", () => {
    expect(lines(`class C { go() { start({ onComplete: this.finish }); } }`)).toHaveLength(1);
  });

  it("FINDS a plan's `onRefused`/`onDone` words that reach `this`", () => {
    expect(lines(`class C { go() { engage(p, { onRefused: (r) => this.say(r), onDone: () => 1 }); } }`)).toHaveLength(1);
  });

  it("a completion that closes over the CLASS is clean", () => {
    const src = [
      "class C {",
      "  go() { const words = this.constructor as typeof C; const onComplete = () => words.render(); start({ onComplete }); }",
      "  runOrEngage(effect: () => void) { start({ onComplete: effect }); }",
      "  other() { this.runOrEngage(() => { C.credit(); }); }",
      "}",
    ].join("\n");
    expect(lines(src)).toEqual([]);
  });

  it("a nested `function` rebinds `this` and is not counted", () => {
    expect(lines(`start({ onComplete: () => { [1].forEach(function () { this.x; }); } });`)).toEqual([]);
  });
});

describe("⭐ the live tree", () => {
  it("holds at the ceiling", () => {
    expect(collectLiveFindings()).toHaveLength(COMPLETION_THIS_CEILING);
  });
});
