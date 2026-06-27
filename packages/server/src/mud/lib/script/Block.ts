/**
 * Block — the keystone value-object.
 *
 * A block is a **closure**: a parsed body (`Script` AST fragment) plus
 * the lexical `Scope` it was defined in. It is **inert** — it carries
 * no execution logic of its own; the interpreter invokes it (running
 * the body in a child of the captured scope). This is *the* unifying
 * primitive: control-flow bodies, `def` functions, and the bodies of
 * `each`/`while`/`when` are all blocks. Invoking a block yields its
 * last command's value, and may suspend (a block can contain `wait`),
 * so blocks ride the script's coroutine.
 *
 * Method-only contract (the inter-object rule): the body and captured
 * scope are read via `getBody()` / `getCapturedScope()`, never by field
 * access. `Script` and `Scope` are imported **type-only** so the
 * value-object trio (`Value` → `Block` → `Scope`) carries no runtime
 * import cycle.
 */

import type { Script } from "./ast";
import type { Scope } from "./Scope";

export class Block {
  private readonly body: Script;
  private readonly capturedScope: Scope;

  constructor(body: Script, capturedScope: Scope) {
    this.body = body;
    this.capturedScope = capturedScope;
  }

  /** The parsed body. Walked by the interpreter on invocation. */
  getBody(): Script {
    return this.body;
  }

  /**
   * The lexical scope captured at definition. The interpreter invokes
   * the block in a child of this scope, giving the closure its
   * definition environment.
   */
  getCapturedScope(): Scope {
    return this.capturedScope;
  }
}
