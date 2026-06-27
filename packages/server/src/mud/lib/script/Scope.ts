/**
 * Scope — the lexical frame of a running script.
 *
 * A `Scope` is a `Map<string, ScriptValue>` plus a link to its lexical
 * parent. It realizes the closure semantics the block keystone depends
 * on: a block captures the scope it was *defined* in (its lexical
 * parent), and invoking it runs its body in a fresh child whose parent
 * is that captured scope — so a nested block sees its enclosing
 * `set`s, and a `def` body sees its definition environment.
 *
 * Three operations, with the standard lexical semantics:
 *
 *  - `get(name)` walks parents outward; the nearest binding wins.
 *  - `set(name, v)` writes to the **nearest existing** binding; if none
 *    exists anywhere up the chain, it creates the binding in the
 *    current frame (top-level `set` semantics).
 *  - `define(name, v)` always creates/overwrites a binding in **this**
 *    frame — param binding and shadowing. A `define` of a name bound in
 *    a parent shadows the parent for this frame and its children.
 *
 * Domain-layer privacy: TypeScript modifiers, not `#` (the proxy-
 * receiver rule does not apply here — a `Scope` is a plain value-object,
 * not a Stuff host — but the inter-object contract is still
 * methods-only: outside code reads/writes via the methods, never the
 * `bindings` map).
 *
 * `ScriptValue` is imported **type-only** to keep the value-object
 * trio (`Value` → `Block` → `Scope`) free of a runtime import cycle.
 */

import type { ScriptValue } from "./Value";

export class Scope {
  private readonly bindings = new Map<string, ScriptValue>();
  private readonly parent: Scope | null;

  constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  /** The lexical parent, or null for a root frame. */
  getParent(): Scope | null {
    return this.parent;
  }

  /**
   * Resolve `name` walking outward from this frame. Returns the bound
   * value or `undefined` when unbound anywhere in the chain. Note that
   * a binding whose value is `undefined` (void) is indistinguishable
   * from absence by this accessor — use `has` to disambiguate.
   *
   * Recursive over the lexical chain (rather than a `this`-aliasing
   * loop); chains are shallow — one frame per nesting level.
   */
  get(name: string): ScriptValue {
    if (this.bindings.has(name)) return this.bindings.get(name);
    return this.parent !== null ? this.parent.get(name) : undefined;
  }

  /** True iff `name` is bound in this frame or any ancestor. */
  has(name: string): boolean {
    if (this.bindings.has(name)) return true;
    return this.parent !== null ? this.parent.has(name) : false;
  }

  /**
   * Assign `name`. Writes to the nearest existing binding up the chain;
   * if `name` is unbound everywhere, creates it in this frame. This is
   * `set name (...)` semantics — assignment, not declaration.
   */
  set(name: string, value: ScriptValue): void {
    if (!this.assignExisting(name, value)) {
      this.bindings.set(name, value);
    }
  }

  /**
   * Walk outward writing to the nearest existing binding. Returns true
   * if a binding was found and updated, false if `name` is unbound
   * everywhere in the chain.
   */
  private assignExisting(name: string, value: ScriptValue): boolean {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      return true;
    }
    return this.parent !== null
      ? this.parent.assignExisting(name, value)
      : false;
  }

  /**
   * Declare `name` in **this** frame, shadowing any ancestor binding.
   * Param binding and explicit local declaration use this.
   */
  define(name: string, value: ScriptValue): void {
    this.bindings.set(name, value);
  }

  /** Spawn a child frame whose lexical parent is this one. */
  child(): Scope {
    return new Scope(this);
  }
}
