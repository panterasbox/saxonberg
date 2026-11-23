/**
 * RelatingMixin — **a thing that keeps named sets it can be asked for**
 * (naming overhaul D-B5; mql-anchors §§ 4, 7–8).
 *
 * MQL's `holder:~name` asks the Stuff to its left for the set it keeps
 * under `name`, and `holder:~` for the names it answers. A contact list
 * keeps your friends, a party its members, a book its ships, a travel
 * card its nodes, a warren its rooms — each holder decides which names it
 * answers and to whom (contacts are owner-only; a published list answers
 * anyone). The members are runtime Stuff the holder reads off its own
 * records; MQL never touches a collection record.
 *
 * ⭐ Only keepers compose it: the contributing mixins (contacts, party
 * membership, resident groups) and the holder classes (a warren, a book, a
 * card, an aether host) pull it in beneath them. It is not on `Stuff`,
 * `Thing` or `Idea` — a loaf keeps no sets, and `loaf:~` lists only the
 * built-ins that apply to it.
 *
 * Contributors CHAIN: each answers its own names and passes the rest to
 * `super` (the `getKeywords` fold, typed). Everything is synchronous and
 * answers from what is resident — a holder never loads; an unloaded member
 * is simply absent.
 *
 * ⚠ Built-in relations (`~here`, `~inventory`, …) are MQL's, consulted
 * first; a holder's own set that shares a built-in's name is never reached
 * by a query (mql-anchors § 15 — the holder warns when one is made).
 */

import type { MixinConstructor } from '../mixin';
import { Mixins } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** One relation a holder answers: its name and its one-line meaning. */
export interface HeldRelation {
  name: string;
  meaning: string;
}

/** One kept set a name answers: what it is, and its members (resident only). */
export interface RelatedSet extends HeldRelation {
  members: Stuff[];
}

export interface Relating {
  /** The relations this holder answers to `asker` (`holder:~`). */
  relationsFor(asker: Stuff | null): HeldRelation[];
  /**
   * The sets this holder keeps under `name` for `asker`: empty when it
   * keeps none; more than one when two of its sets share the name (a
   * contact list and a group both called `bookclub` — the binder asks).
   */
  relatedBy(name: string, asker: Stuff | null): RelatedSet[];
  /**
   * The durable group a set stands for (`contacts:friends`, a managed
   * group's ref, a party's) — what `notify` stores — or null when `name`
   * is not a durable group of this holder's.
   */
  groupRefOf(name: string, asker: Stuff | null): string | null;
}

/**
 * The base of the chain: a holder that keeps nothing until a contributor
 * says otherwise. Contributors override all three and call `super`.
 *
 * ⭐ Composed ONCE (the `Slottable` shape): every contributing mixin pulls
 * it in beneath itself, and a second application over a class that already
 * composes it returns that class — so one `super` chain runs through every
 * contributor instead of a second base cutting it off.
 */
export function RelatingMixin<TBase extends MixinConstructor>(Base: TBase) {
  class RelatingLayer extends Base implements Relating {
    static _mixinName: string = Mixins.Relating;

    public relationsFor(_asker: Stuff | null): HeldRelation[] {
      return [];
    }

    public relatedBy(_name: string, _asker: Stuff | null): RelatedSet[] {
      return [];
    }

    public groupRefOf(_name: string, _asker: Stuff | null): string | null {
      return null;
    }
  }
  if (composesRelating(Base)) return Base as unknown as typeof RelatingLayer;
  return RelatingLayer;
}

/** Whether a class already composes the layer (anywhere down its chain). */
function composesRelating(ctor: unknown): boolean {
  for (let c = ctor; typeof c === 'function'; c = Object.getPrototypeOf(c)) {
    if (Object.prototype.hasOwnProperty.call(c, '_mixinName') && (c as { _mixinName?: string })._mixinName === Mixins.Relating) {
      return true;
    }
  }
  return false;
}
