/**
 * Registrar — **a body that keeps a book about somebody else**, and the
 * generic shape behind *you file; you do not hold the pen.*
 *
 * ## ⚠⚠ Why this exists: the kernel was naming a pack
 *
 * The herdbook needed a write path the ordinary document gate cannot
 * give it. `DocumentApi.save` admits the **branch owner**; a herd's
 * branch is owned by the ranching trade, so a keeper filing a head could
 * not write — and granting them the branch would hand them the pen the
 * whole design is about them not having.
 *
 * The first answer was a pinned transport called `saveHerd`, with
 * `/trade/ranching/herds`, `/trade/ranching` and a
 * `FromTemplate('/trade/ranching/idea/HerdRegistry')` gate **as kernel
 * constants**. That is a pack's namespace hardcoded in the engine, which
 * is the thing the pack system exists to prevent — and it does not
 * survive the second register: a studbook, a claims book or a land
 * registry each wanted another method and another three constants.
 *
 * ⭐ So the kernel learns the SHAPE instead of the name, exactly as
 * `saveRelease` learns `Publisher` rather than a press path: a register
 * declares the branch it administers, who owns what lands there, and the
 * one kind it may write. `DocumentApi.saveToRegister` derives all three
 * from the object.
 *
 * ## ⭐⭐ The one invariant that makes it safe: a register keeps its OWN book
 *
 * Nothing stops a class declaring itself a registrar. What stops it
 * administering somebody else's branch is structural and checked in the
 * kernel:
 *
 * > **the owner must be a prefix of the register's own template path,
 * > and the register's branch must lie under that owner.**
 *
 * `/trade/ranching/idea/HerdRegistry` may own `/trade/ranching` and file
 * under `/trade/ranching/herds`; it may not own `/home/somebody`. So the
 * capability is *"the society keeps its own book"* — expressible without
 * the kernel knowing which societies exist.
 *
 * ⚠ And the caller contract is relational: the register must be the
 * thing calling, and it must be writing for itself
 * (`FromMixin(Registrar, { where: caller === register })`).
 *
 * See [docs/subsystems/document-store.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { Mixins } from '../mixin';

/** What a register tells the document store about the book it keeps. */
export interface Registrar {
  /**
   * The branch filed documents land under — e.g. a trade's `herds`
   * directory. ⚠ Must lie under {@link getRegisterOwner}.
   */
  getRegisterPrefix(): string;
  /**
   * Who OWNS what is filed — the society, never the subject. ⚠ Must be a
   * prefix of the register's own template path: a register keeps its own
   * book and nobody else's.
   */
  getRegisterOwner(): string;
  /** The single `DocumentKinds` entry this register may write. */
  getRegisterKind(): string;
}

/**
 * The marker + the three declarations. A register is otherwise an
 * ordinary `Idea` — this confers no storage and no behaviour, because a
 * register is *a pointer, not a database*: the rows live in the document
 * store and every read goes there.
 */
export function RegistrarMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class RegistrarMixin extends Base implements Registrar {
    static _mixinName: string = Mixins.Registrar;

    static fieldMeta: FieldMeta = {
      registerPrefix: { persistent: true, authorable: true },
      registerOwner: { persistent: true, authorable: true },
      registerKind: { persistent: true, authorable: true },
    };

    protected registerPrefix = '';
    protected registerOwner = '';
    protected registerKind = '';

    public getRegisterPrefix(): string { return this.registerPrefix; }
    public setRegisterPrefix(value: string): void {
      this.registerPrefix = value ?? '';
    }

    public getRegisterOwner(): string { return this.registerOwner; }
    public setRegisterOwner(value: string): void {
      this.registerOwner = value ?? '';
    }

    public getRegisterKind(): string { return this.registerKind; }
    public setRegisterKind(value: string): void {
      this.registerKind = value ?? '';
    }
  };
}
