/**
 * Scope tests — lexical get/set/define semantics, the parent walk, and
 * shadowing (the closure substrate the block keystone rides).
 */

import { describe, it, expect } from "vitest";
import { Scope } from "../Scope";

describe("Scope", () => {
  it("get returns undefined for an unbound name", () => {
    const s = new Scope();
    expect(s.get("x")).toBeUndefined();
    expect(s.has("x")).toBe(false);
  });

  it("define then get round-trips in the same frame", () => {
    const s = new Scope();
    s.define("x", 5);
    expect(s.get("x")).toBe(5);
    expect(s.has("x")).toBe(true);
  });

  it("get walks outward to a parent binding", () => {
    const outer = new Scope();
    outer.define("x", "outer");
    const inner = outer.child();
    expect(inner.get("x")).toBe("outer");
  });

  it("set writes to the nearest existing binding up the chain", () => {
    const outer = new Scope();
    outer.define("x", "before");
    const inner = outer.child();
    inner.set("x", "after");
    // The write landed on the outer frame, not a new inner binding.
    expect(outer.get("x")).toBe("after");
    expect(inner.get("x")).toBe("after");
  });

  it("set creates a binding in the current frame when unbound everywhere", () => {
    const outer = new Scope();
    const inner = outer.child();
    inner.set("y", 42);
    expect(inner.get("y")).toBe(42);
    // Did not leak to the parent.
    expect(outer.has("y")).toBe(false);
  });

  it("define shadows an ancestor binding for this frame", () => {
    const outer = new Scope();
    outer.define("x", "outer");
    const inner = outer.child();
    inner.define("x", "inner");
    expect(inner.get("x")).toBe("inner");
    // The ancestor binding is untouched.
    expect(outer.get("x")).toBe("outer");
  });

  it("a child of a shadowing frame sees the shadow", () => {
    const outer = new Scope();
    outer.define("x", "outer");
    const mid = outer.child();
    mid.define("x", "mid");
    const inner = mid.child();
    expect(inner.get("x")).toBe("mid");
  });

  it("has disambiguates a binding holding undefined from absence", () => {
    const s = new Scope();
    s.define("v", undefined);
    expect(s.get("v")).toBeUndefined();
    expect(s.has("v")).toBe(true);
  });

  it("getParent exposes the lexical link", () => {
    const outer = new Scope();
    const inner = outer.child();
    expect(inner.getParent()).toBe(outer);
    expect(outer.getParent()).toBeNull();
  });
});
