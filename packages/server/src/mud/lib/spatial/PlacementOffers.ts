/**
 * PlacementOffers — ⭐ **the ways a host offers to be put into or onto**, in
 * listing order, and what a word means among them (controllers-are-io D11).
 *
 * Region zero first when the host is a container with an inside of its own
 * (`Container.hasInterior` — not a coat), then one per member
 * its row offers. Region zero is the container's own interior and is NOT a
 * member — a chest has no compartments, it just holds things. It borrows its
 * words from the `in` row when the catalogue has one, which is what makes *one
 * region and many regions the same thing* literal rather than a slogan.
 *
 * A value object rather than a method body, because `ContainerMixin` and
 * `PlacingMixin` compose in either order on a desk-with-a-drawer, and each must
 * answer the same.
 */

import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { Placement } from './Placement';
import { Placements } from './Placement';

/** One way a host offers to be put into or onto. */
export interface PlacementOffer {
  kind: 'zero' | 'placement';
  name: string;
  /** The words it answers to, primary first. */
  words: readonly string[];
}

/** What a word meant: the offer, or why it meant none. */
export type PlacementChoice =
  | { ok: true; offer: PlacementOffer }
  | {
      ok: false;
      reason: 'wrong-preposition' | 'preposition-ambiguous';
      /** The primary words on offer. */
      takes: readonly string[];
      /** The word that was typed, when one was. */
      got?: string;
      /**
       * ⭐ When the offers that answered share their word and differ by
       * NAME (a coat's `left pocket` and `right pocket`), the names — so
       * the verb asks *which pocket?*, not *into or into?* (D26).
       */
      regions?: readonly string[];
    };

export class PlacementOffers {
  private readonly offers: readonly PlacementOffer[];

  /** The offers `host` makes. */
  constructor(host: Stuff) {
    const offers: PlacementOffer[] = [];
    // ⭐⭐ **One question, asked once.** *Is this an actor, whose insides
    // are its own?* is the `Agent` branch, and `MixinApi.isOpenContainer`
    // is documented in four files as the single rule everything that
    // means "you can reach or see one level into that" asks. ⚠ Minus the
    // lid: a SHUT chest offers region zero and refuses at the verb with a
    // reason, which is a better sentence than pretending it has no inside.
    // ⭐ …and only a container with an unnamed inside (W9, D-W9-3): a coat's
    // insides are its pockets, so it offers those and no region zero.
    if (MixinApi.isContainer(host) && !host.isAgent() && host.hasInterior()) {
      offers.push({ kind: 'zero', name: Placements.IN, words: ContainmentApi.placements().need(Placements.IN).getPrepositions() });
    }
    if (MixinApi.isPlacing(host)) {
      for (const name of host.getPlacements()) {
        // Resident with the host (documents D7): a miss throws by path.
        offers.push({ kind: 'placement', name, words: host.placementOf(name).getPrepositions() });
      }
    }
    this.offers = offers;
  }

  /**
   * The slot rule's guard: a slot is more specific than a container, so an
   * item that fits an open slot goes in the slot — when the word is one of
   * region zero's, or there is none.
   */
  admitsSlot(word: string | undefined): boolean {
    if (word === undefined) return true;
    const zero = this.offers.find((o) => o.kind === 'zero')?.words ?? ContainmentApi.placements().need(Placements.IN).getPrepositions();
    return zero.includes(word);
  }

  /** What `word` means here; no word means the only offer. */
  choose(word: string | undefined): PlacementChoice {
    const primary = (o: PlacementOffer): string => o.words[0] ?? o.name;
    let matches: readonly PlacementOffer[] = this.offers;
    if (word !== undefined) {
      // The member whose PRIMARY word it is, else any member that also
      // answers to it. That secondary pass is how `put ham on hook` reaches
      // a host offering only `from`.
      matches = this.offers.filter((o) => o.words[0] === word);
      if (matches.length === 0) matches = this.offers.filter((o) => o.words.includes(word));
      if (matches.length === 0) {
        return {
          ok: false,
          reason: 'wrong-preposition',
          takes: this.offers.map(primary),
          got: word,
        };
      }
    }
    if (matches.length === 1) return { ok: true, offer: matches[0]! };
    // Ambiguous: a range is a firebox AND a hot plate, and the player has
    // to say which. (Two members sharing a primary word is an authoring
    // collision `lint:placement-words` refuses, so a typed word reaching
    // here is a claim about content, and content changes.)
    const takes = matches.map(primary);
    const named = new Set(takes).size < takes.length;
    return {
      ok: false,
      reason: matches.length === 0 ? 'wrong-preposition' : 'preposition-ambiguous',
      takes,
      ...(named ? { regions: matches.map((o) => o.name) } : {}),
    };
  }
}
