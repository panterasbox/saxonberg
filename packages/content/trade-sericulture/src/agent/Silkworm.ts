/**
 * Silkworm — ⭐ one worm (organism-biology D10): a body on `Creature`, the
 * `Livestock` rung — a body with no deliberation beat; a caterpillar does
 * not deliberate. The tray is the compression (ranching D19/D21): while a
 * rearing is in a larval age the tray holds ONE exemplar worm as real
 * content, seeded from (tray, index), so the same worm is the same worm.
 *
 * ⭐ Its stage is its clock's: on a live tray, the tray's (feeding or
 * wandering is a larva, spinning a pupa); off it, its own form — `larva`
 * (aged by the degree-days it left the tray with), `pupa`, or `moth`, the
 * exemplar a cocoon stack lets out at emergence. Larva → `newborn`, pupa →
 * `juvenile`, moth → `adult`, and the species' `development` gives each
 * its own plan. The name follows (`variants.stage`).
 */

import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { LifeStage } from '@saxonberg/server/mud/platform/idea/species/Species';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { LarvalClock } from '../lib/LarvalClock';
import { REARING_MIXIN, type Rearing } from '../lib/Rearing';

/** A worm's form off a tray. */
export type SilkwormForm = 'larva' | 'pupa' | 'moth';

const STAGE_OF: Record<SilkwormForm, LifeStage> = { larva: 'newborn', pupa: 'juvenile', moth: 'adult' };
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth'] as const;

export default class Silkworm extends Creature {
  static _mixinName = 'Silkworm';

  static fieldMeta: FieldMeta = {
    form: { persistent: true, authorable: true },
    degreeDays: { persistent: true, authorable: true },
    seedIndex: { persistent: true },
  };

  /** Its form off a tray. */
  public form: SilkwormForm = 'larva';
  /** Its own clock off a tray: the degree-days since hatch it left the tray with. */
  public degreeDays = 0;
  /** Which exemplar of its tray it is (the seed). */
  public seedIndex = 0;

  /** The live tray it is on, or null. */
  private trayOf(): Rearing | null {
    const here = MixinApi.isContainable(this) ? this.getContainer() : null;
    if (!here || !MixinApi.hasMixin(here, REARING_MIXIN)) return null;
    const tray = here as unknown as Rearing;
    return tray.hasLiveRearing() ? tray : null;
  }

  /** ⭐ The stage, from the tray's clock while on one, else its own form (D10). */
  override getLifeStage(): LifeStage | null {
    const tray = this.trayOf();
    if (tray) return tray.getRearingState() === 'spinning' ? 'juvenile' : 'newborn';
    return STAGE_OF[this.form];
  }

  /** Which age (1–5) a larva is in — the tray's, or the clock it left with. */
  public larvalAge(): number {
    const tray = this.trayOf();
    return tray ? tray.currentAge() : new LarvalClock(this.degreeDays).age();
  }

  /** ⭐ A larva reads its age: *a fifth-age silkworm*. */
  override getShortDescription(): string {
    const name = this.getCommonNames()[0] ?? super.getShortDescription();
    if (this.getLifeStage() !== 'newborn') return name;
    const age = this.larvalAge();
    return age > 0 ? `${ORDINAL[age]}-age ${name}` : name;
  }

  /** What the tray tells the worm it mints, or the worm it lets go: its clock and its seed. */
  public seedFromTray(degreeDays: number, index: number): void {
    this.form = 'larva';
    this.degreeDays = Math.max(0, degreeDays);
    this.seedIndex = index;
  }

  /** What a cocoon stack tells the moth it lets out. */
  public becomeMoth(index: number): void {
    this.form = 'moth';
    this.seedIndex = index;
  }
}
