/**
 * TipJar — the bar's tip jar: a visible container that holds `Coin`.
 *
 * Cash tips are **physical**: a patron drops coin in the jar (`tip`), and
 * the on-shift bartender scoops it out at shift-end (`collect`). It never
 * touches an account, so it is off the books by construction — the strongest
 * possible "off the proprietor's P&L", and a lump you *take*, not a trickle.
 *
 * A `Vessel` (the canonical container-object — holds coin), `Detailed` so it
 * reads as a fixture and shows its contents when inspected — you can watch it
 * fill. It lights up the `tip` + `collect` verbs from the room
 * (`commandContributions`), the `Menu` precedent. A commons class (a jar is a
 * jar): the hospitality trade ships the template, any venue's bar populates
 * an instance.
 */

import { Vessel } from '../../lib/stuff/Vessel';
import { ContainmentApi } from '../../api/containment';
import { EmploymentApi, type BusinessStuff } from '../../api/employment';
import { MixinApi } from '../../api/mixin';
import type { CommandContributions } from '../../api/command';
import type { ActOutcome, ActRefusal } from '../../lib/craft/ActPlan';
import type { Stuff } from '../../lib/stuff/Stuff';
import Coin from './Coin';

/** Why `collectBy` refused. */
export type CollectRefusalReason = 'no-house' | 'not-on-shift';

/** The answer to {@link TipJar.collectBy}: the minor units taken, or a refusal. */
export type CollectAnswer =
  | ActOutcome<{ took: number }>
  | ActRefusal<CollectRefusalReason>;

const TipJarBase = Vessel;

export default class TipJar extends TipJarBase {
  /**
   * The jar is the tip surface: it affords `tip` (any patron in the room)
   * and `collect` (the on-shift bartender scooping it out). Contributed to
   * the environment bucket so both light up whenever the jar is present —
   * the `Menu` affordance pattern.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/employment/tip.yaml', 'platform/cmd/employment/collect.yaml'],
    environment: [],
  };

  /**
   * ⭐ The house this jar is kept for — DERIVED, never stored: the business
   * operating the jar itself (a fixture a house names), else the business
   * operating the place it stands in. The fixture-first rule
   * `PricedOffer.houseAndVenue` and `EmploymentApi.operatorsAt` already use.
   * `null` = a jar no house keeps, and nobody's to empty (fail closed).
   */
  public houseOf(): BusinessStuff | null {
    const own = EmploymentApi.operatorsAt(this as unknown as Stuff)[0];
    if (own) return own;
    const here = this.getContainer();
    return EmploymentApi.operatorsAt(here)[0] ?? null;
  }

  /**
   * ⭐⭐ Scoop the jar out, as `actor` (controller-liquidity D9, C45): the
   * gate is the JAR's — only somebody on shift for the house that keeps
   * it. A replaced `collect` controller, a brain or a script meets the same
   * rule; before this the verb alone checked, and it asked *on shift for
   * anybody here*, so any jar on your own premises was yours.
   */
  public collectBy(actor: Stuff): CollectAnswer {
    const house = this.houseOf();
    const housePath = house?.getIdentityPath();
    if (!housePath) return { ok: false, reason: 'no-house' };
    if (!MixinApi.isEmployed(actor) || !actor.isOnShiftFor(housePath)) {
      return { ok: false, reason: 'not-on-shift' };
    }
    let took = 0;
    if (MixinApi.isContainer(actor)) {
      for (const c of [...this.getContents()]) {
        if (c instanceof Coin) {
          // Handed (D-W7a): coins you cannot take stay in the jar. Counted
          // first — a stack that meets its like merges and is gone.
          const q = c.getQuantity();
          if (MixinApi.isCarrying(actor)) {
            if (actor.receive(c) !== null) continue;
          } else {
            ContainmentApi.move(c, actor);
          }
          took += q;
        }
      }
    }
    return { ok: true, facts: { took } };
  }
}
