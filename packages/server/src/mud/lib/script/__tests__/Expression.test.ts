/**
 * Expression island tests — the infix half (`$hp < 0.2`, `and`/`or`/
 * `not`, comparison, frame-var operands). The MQL-delegation half (a
 * bareword query → resolveMany → StuffList, emptiness = falsy) is
 * covered in the interpreter integration test, where a real giver
 * exists. Here the actor is unused (no MQL call on the infix path).
 */

import { describe, it, expect } from "vitest";
import { Expression } from "../Expression";
import { Scope } from "../Scope";
import type { Stuff } from "../../stuff/Stuff";
import type { CommandGiver } from "../../command/CommandGiver";

const noActor = {} as unknown as Stuff & CommandGiver;

function evalExpr(source: string, vars: Record<string, unknown> = {}): unknown {
  const scope = new Scope();
  for (const [k, v] of Object.entries(vars)) scope.define(k, v as never);
  return Expression.evaluate(source, scope, noActor);
}

describe("Expression — infix comparison", () => {
  it("numeric < with a frame var", () => {
    expect(evalExpr("$hp < 0.2", { hp: 0.1 })).toBe(true);
    expect(evalExpr("$hp < 0.2", { hp: 0.5 })).toBe(false);
  });

  it("numeric literals", () => {
    expect(evalExpr("5 > 3")).toBe(true);
    expect(evalExpr("3 >= 3")).toBe(true);
    expect(evalExpr("2 <= 1")).toBe(false);
  });

  it("equality with a quoted string", () => {
    expect(evalExpr('$name == "rose"', { name: "rose" })).toBe(true);
    expect(evalExpr('$name != "daisy"', { name: "rose" })).toBe(true);
    expect(evalExpr('$name == "rose"', { name: "daisy" })).toBe(false);
  });

  it("numeric equality coerces string operands", () => {
    expect(evalExpr("$n == 5", { n: "5" })).toBe(true);
  });
});

describe("Expression — infix logic", () => {
  it("and / or / not", () => {
    expect(evalExpr("true and false")).toBe(false);
    expect(evalExpr("true or false")).toBe(true);
    expect(evalExpr("not false")).toBe(true);
    expect(evalExpr("not true")).toBe(false);
  });

  it("precedence: or is looser than and", () => {
    // true or (false and false) === true
    expect(evalExpr("true or false and false")).toBe(true);
  });

  it("parenthesized sub-expressions + var operands", () => {
    expect(evalExpr("($x < 5) and ($y > 0)", { x: 3, y: 1 })).toBe(true);
    expect(evalExpr("($x < 5) and ($y > 0)", { x: 3, y: -1 })).toBe(false);
  });
});

describe("Expression — primaries", () => {
  it("a lone number", () => {
    expect(evalExpr("42")).toBe(42);
  });

  it("a lone frame var returns its value", () => {
    expect(evalExpr("$brand", { brand: "Vionne" })).toBe("Vionne");
  });

  it("an unbound var is undefined", () => {
    expect(evalExpr("$missing")).toBeUndefined();
  });

  it("empty source is void", () => {
    expect(evalExpr("   ")).toBeUndefined();
  });
});
