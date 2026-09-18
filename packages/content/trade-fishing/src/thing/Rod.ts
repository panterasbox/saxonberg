/**
 * Rod — the angling instrument. **The instrument affords the verb**: a
 * rod in your hands is what makes `fish`, `reel` and `slack` sayable, as
 * a static on the class and never a row key.
 *
 * One class, rows for the rungs: a cane rod and a bamboo rod differ by
 * `presentation` (how well the tackle shows the bait) and by what the
 * `Durable` substrate already gives every tool. The rod's own state is
 * nothing — the wait lives on the engagement and the reach's fish in
 * the water pack's record.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class Rod extends ToolItem {
  static commandContributions: CommandContributions = {
    self: [],
    // `environment` = whoever HOLDS it (the container chain outward); a
    // rod lying on the bank affords nothing until it is picked up.
    environment: [
      'trade/fishing/cmd/fishing/fish.yaml',
      'trade/fishing/cmd/fishing/reel.yaml',
      'trade/fishing/cmd/fishing/slack.yaml',
    ],
    peers: [],
  };

  static fieldMeta: FieldMeta = {
    showing: { persistent: true, authorable: true },
    breakStrain: { persistent: true, authorable: true },
  };

  /** How well the tackle shows the bait — a factor on the bite, `1` ordinary. */
  public showing = 1;
  /** The strain the line parts at, `0..1`; `0` = the `fishing.contest.breakStrain` dial. */
  public breakStrain = 0;

  constructor() {
    super();
    this.capabilities = ['angling'];
  }

  public getShowing(): number {
    return this.showing;
  }
  public setShowing(value: number): void {
    this.showing = Number.isFinite(value) && value > 0 ? value : 1;
  }
  public getBreakStrain(): number {
    return this.breakStrain;
  }
  public setBreakStrain(value: number): void {
    this.breakStrain = Number.isFinite(value) && value > 0 ? Math.min(1, value) : 0;
  }
}
