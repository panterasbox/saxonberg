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
 * (`commandContributions`), the `Menu` precedent. Lounge content, so it lives
 * beside `Menu` / `Bar` in `world/lounge/`.
 */

import { Vessel } from '../../lib/stuff/Vessel';
import { DetailedMixin } from '../../lib/description/Detailed';
import { MqlApi } from '../../api/mql';
import type { CommandContext, CommandContributions } from '../../api/command';

const TipJarBase = DetailedMixin(Vessel);

export default class TipJar extends TipJarBase {
  /**
   * The jar is the tip surface: it affords `tip` (any patron in the room)
   * and `collect` (the on-shift bartender scooping it out). Contributed to
   * the environment bucket so both light up whenever the jar is present —
   * the `Menu` affordance pattern.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['employment/tip.yaml', 'employment/collect.yaml'],
    environment: [],
  };

  /**
   * Resolve the tip jar a `tip` / `collect` command targets: the affording
   * jar (an affordance click sets it as `commandSource`), else the tip jar
   * among the room's occupants. Object enumeration goes through MQL (the
   * `peers` seed), not a hand-rolled containment scan; the `instanceof`
   * check is the interim type filter (a future MQL type-predicate subsumes
   * it), so a honey jar on the same back-bar never masquerades as the tip
   * jar.
   */
  static resolveIn(context: CommandContext): TipJar | null {
    const source = context.commandSource;
    if (source instanceof TipJar) return source;
    const peers = MqlApi.resolveMany('peers', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    });
    return peers.stuff.find((s): s is TipJar => s instanceof TipJar) ?? null;
  }
}
