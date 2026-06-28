/**
 * Value model tests — truthiness, including the load-bearing
 * MQL-set-emptiness-as-falsiness rule and the Stuff/list/Block
 * narrowing helpers.
 */

import { describe, it, expect } from "vitest";
import { ScriptValues } from "../Value";
import type { ScriptValue } from "../Value";
import { Block } from "../Block";
import { Scope } from "../Scope";
import type { Stuff } from "../../stuff/Stuff";

// A stand-in "single Stuff" — isTruthy's catch-all returns true for any
// object that is neither an array nor a Block, so a plain object
// exercises the Stuff branch without constructing a real host.
const fakeStuff = {} as unknown as Stuff;

describe("ScriptValues.isTruthy", () => {
  it("treats void (undefined) as false", () => {
    expect(ScriptValues.isTruthy(undefined)).toBe(false);
  });

  it("passes booleans through", () => {
    expect(ScriptValues.isTruthy(true)).toBe(true);
    expect(ScriptValues.isTruthy(false)).toBe(false);
  });

  it("treats 0 and NaN as false, other numbers true", () => {
    expect(ScriptValues.isTruthy(0)).toBe(false);
    expect(ScriptValues.isTruthy(Number.NaN)).toBe(false);
    expect(ScriptValues.isTruthy(1)).toBe(true);
    expect(ScriptValues.isTruthy(-3.5)).toBe(true);
  });

  it("treats empty strings as false, non-empty true", () => {
    expect(ScriptValues.isTruthy("")).toBe(false);
    expect(ScriptValues.isTruthy("x")).toBe(true);
  });

  it("treats an empty StuffList as false (MQL-emptiness-is-falsiness)", () => {
    expect(ScriptValues.isTruthy([])).toBe(false);
  });

  it("treats a non-empty StuffList as true", () => {
    expect(ScriptValues.isTruthy([fakeStuff])).toBe(true);
  });

  it("treats a single Stuff as true", () => {
    expect(ScriptValues.isTruthy(fakeStuff)).toBe(true);
  });

  it("treats a Block as true", () => {
    const block = new Block({ kind: "script", statements: [] }, new Scope());
    expect(ScriptValues.isTruthy(block)).toBe(true);
  });
});

describe("ScriptValues narrowing", () => {
  it("isBlock identifies blocks only", () => {
    const block = new Block({ kind: "script", statements: [] }, new Scope());
    expect(ScriptValues.isBlock(block)).toBe(true);
    expect(ScriptValues.isBlock([fakeStuff])).toBe(false);
    expect(ScriptValues.isBlock("x" as ScriptValue)).toBe(false);
  });

  it("isList identifies StuffLists only", () => {
    expect(ScriptValues.isList([fakeStuff])).toBe(true);
    expect(ScriptValues.isList([])).toBe(true);
    expect(ScriptValues.isList(fakeStuff)).toBe(false);
  });
});
