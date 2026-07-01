/**
 * TipJar — the bar's tip jar: a visible container that holds `Coin`.
 *
 * Cash tips are **physical**: a patron drops coin in the jar (`tip`), and
 * the on-shift bartender scoops it out at shift-end (`collect`). It never
 * touches an account, so it is off the books by construction — the strongest
 * possible "off the proprietor's P&L", and a lump you *take*, not a trickle.
 *
 * A plain `Container` Thing (holds coin), `Detailed` so it reads as a fixture
 * and shows its contents when inspected — you can watch it fill. It lights up
 * the `tip` + `collect` verbs from the room (`commandContributions`), the
 * `Menu` precedent. Lounge content, so it lives beside `Menu` / `Bar` in
 * `domain/lounge/`.
 */

import Thing from '../../lib/stuff/Thing';
import { ContainerMixin } from '../../lib/spatial/Container';
import { DetailedMixin } from '../../lib/description/Detailed';
import type { CommandContributions } from '../../api/command';

const TipJarBase = ContainerMixin(DetailedMixin(Thing));

export default class TipJar extends TipJarBase {
  /**
   * The jar is the tip surface: it affords `tip` (any patron in the room)
   * and `collect` (the on-shift bartender scooping it out). Contributed to
   * the environment bucket so both light up whenever the jar is present —
   * the `Menu` affordance pattern.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['employment/tip.yaml', 'employment/collect.yaml'],
    inventory: [],
    peers: [],
  };
}
