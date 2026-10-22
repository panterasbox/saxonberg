/**
 * ContentsTitle — whose a body of liquid is (the communal-oven rule,
 * potash): a lye leached from your ash is yours in the ashery's hopper, and
 * the cake it boils down to is yours in the ashery's pot. A liquid cannot
 * bear a title (it is no discrete good), so its owner rides its PAYLOAD and
 * passes to whatever is made from it.
 *
 * ⭐ ONE agreement rule, for a pour and for a recipe's inputs alike:
 *
 *   - an UNTITLED lot makes no claim (rain from a butt, a shop's stock) —
 *     it defers to a titled one;
 *   - two lots titled to the SAME owner are that owner's;
 *   - two titled to DIFFERENT owners are nobody's — and stay nobody's,
 *     whatever is added after.
 *
 * The three states are the field's: absent (`undefined`) makes no claim,
 * `null` is disputed, an owner is an owner.
 */
import type { ChattelOwner } from './ChattelRecord';

declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /**
     * Whose this liquid is — absent when nobody titled went into it, `null`
     * when owners disagreed. Written where titled goods become liquid (a
     * leach), carried by a pour, read by whatever sets out of it.
     */
    contentsOwner?: ChattelOwner | null;
  }
}

/** A claim: an owner, `null` (disputed), or `undefined` (no claim). */
export type TitleClaim = ChattelOwner | null | undefined;

export class ContentsTitle {
  constructor(private readonly claim: TitleClaim) {}

  /** The claim once `other` is mixed in. */
  with(other: TitleClaim): ContentsTitle {
    const a = this.claim;
    if (other === undefined) return this;
    if (a === undefined) return new ContentsTitle(other);
    if (a === null || other === null) return new ContentsTitle(null);
    // One owner's identity as a comparable key (a group by its ref or name).
    const keyOf = (o: ChattelOwner): string =>
      o.kind === 'group' ? `group:${o.ref ?? o.name ?? ''}` : `${o.kind}:${o.templatePath}`;
    return keyOf(a) === keyOf(other) ? this : new ContentsTitle(null);
  }

  /** The claim as the payload field carries it. */
  claimed(): TitleClaim {
    return this.claim;
  }

  /** The one owner, or null when there is none to name. */
  owner(): ChattelOwner | null {
    return this.claim ?? null;
  }
}
