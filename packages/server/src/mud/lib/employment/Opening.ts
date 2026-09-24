/**
 * Opening — one advertised vacancy: *this house, this seat, this many
 * places, and what it asks of you.*
 *
 * A named value object (the `Money` / `Charge` / `Position` precedent):
 * plain data plus the two words the world says out loud. Nothing stores
 * it — an opening is **derived**, `headcount − holders`, so nothing can
 * decrement it wrong and a `quit` reopens a seat by arithmetic rather
 * than by remembering to.
 *
 * ⭐ The two renderings are here rather than in a controller because both
 * the SIGN (a room's `look`) and the REFUSAL (`apply`) must say the same
 * thing in the same words. A criterion a player is refused on and cannot
 * read beforehand is the *bare COUNT* failure with a different mask.
 */

import { Position } from './Position';
import { Money } from '../banking/Money';
import { BankingApi } from '../../api/banking';
import { CompetenceBand } from '../advancement/CompetenceBand';
import { GrammarApi } from '../../api/grammar';

export class Opening {
  /**
   * ⚠ A public constructor rather than the `Position.of` / `Money.of`
   * idiom: `lint:lib-statics` is a ratchet and its population may not
   * grow while the value-object-statics sweep runs. A construction
   * static would be one more to un-hide later, for nothing — an
   * `Opening` has no coercion to do, so `new` says everything `of`
   * would.
   */
  public constructor(
    /** The advertising organization's durable path. */
    public readonly organizationPath: string,
    /** The seat, whole. */
    public readonly position: Position,
    /** How many places are unfilled — always ≥ 1 for a live Opening. */
    public readonly open: number,
    /** A label for the house, for prose. Empty when unknown. */
    public readonly houseLabel: string = '',
  ) {}

  /**
   * What the seat asks, in words — *two completed gigs*, *a competent
   * hand at tailoring*, or *no prerequisite*. ⚠ Both criteria read
   * together when both are authored, because a refusal names one number
   * at a time but the SIGN must not hide the second one.
   */
  public wants(): string {
    const r = this.position.requires;
    if (!r) return 'no prerequisite';
    const parts: string[] = [];
    if (r.gigs != null && r.gigs > 0) {
      parts.push(
        r.gigs === 1
          ? 'one completed gig'
          : `${GrammarApi.inWords(r.gigs)} completed gigs`,
      );
    }
    if (r.discipline) {
      const band = r.band ?? CompetenceBand.FLOOR;
      parts.push(`a ${band} hand at ${r.discipline}`);
    }
    return parts.length === 0 ? 'no prerequisite' : parts.join(' and ');
  }

  /** The sign's line: *HELP WANTED — a hand, four zorkmids a game-hour; two completed gigs asked.* */
  public describe(): string {
    const what = this.position.noun ?? this.position.key;
    const pay =
      this.position.wageRate > 0
        ? `, ${Money.of(this.position.wageRate, BankingApi.compactCurrency()).render()} a game-hour`
        : '';
    const asks = this.wants();
    const plural = this.open > 1 ? ` (${String(this.open)} places)` : '';
    return `HELP WANTED — ${what}${pay}${plural}; ${asks === 'no prerequisite' ? 'no prerequisite' : `${asks} asked`}.`;
  }

}
