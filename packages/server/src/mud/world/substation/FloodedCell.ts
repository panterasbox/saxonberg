/**
 * FloodedCell — the electricity **demonstrator**: a flooded switch-cell in a
 * derelict substation, ankle-deep in brackish water with a downed live cable
 * lying in it. Wade in barefoot and the current flows from the cable, through
 * the salt-water pool + the grounded `Floor`, through you — a shock. Stay on
 * the dry raised catwalk, or wear rubber boots, and the ground path is broken:
 * you're untouched. Two allies wading in both take it (faction-blind). It
 * teaches the WHOLE model with no magic.
 *
 * A **one-off demonstrator room** (the precedent was the lounge's glass
 * alley, since retired into `HazardMixin`) — NOT a
 * reusable `HazardMixin`; the reusable abstraction is `ElectricityApi.conduct`
 * itself. A proper {@link CartesianLocation}: it lives at `[x,y,z]` in the
 * substation's {@link CartesianZone} (`/world/substation`).
 *
 * The **only** bespoke behavior is the hazard trigger — `onEntered` conducts
 * from the live source in the cell. Its fixtures are **authored templates
 * placed declaratively** by the room's seed: the salt-water-pooled `Floor`
 * via `adornments:`, the `LiveWire` via `props:` (electricity has no
 * declarative room-hazard field like the cistern's `_atmosphere: water`, so
 * the trigger stays code — but the content does not).
 *
 * The substation is also where the deferred **power grid** content grows —
 * the grid is this same Ohm's-law physics scaled up.
 *
 * See docs/subsystems/electricity.md.
 */

import SingletonCartesianLocation from '../../lib/location/SingletonCartesianLocation';
import { MixinApi } from '../../api/mixin';
import { ElectricityApi } from '../../api/electricity';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';

export default class FloodedCell extends SingletonCartesianLocation {
  /**
   * The hazard: fired on the destination when a body walks in (the
   * `Mobile.traverse` → `onEntered` seam). Conduct from every live source in
   * the cell — the walk decides who is bridged to ground through the pool and
   * inflicts each. Faction-blind (allies included), grounding/insulation
   * emergent. A no-op if no source is present or all are de-energized.
   */
  public onEntered(mover: Stuff, _exit: unknown): void {
    const self = this as unknown as Stuff & Container;
    // ⭐ (rubber build) Wading soaks the feet and what is on them, BEFORE
    // the walk reads them — so a leather boot conducts (the wet law) and
    // a rubber one, which takes in nothing, does not.
    if (MixinApi.isAttired(mover) && this.floorPoolLitres() > 0) {
      mover.immerse((part) => part.includes('foot'));
    }
    for (const content of self.getContents()) {
      // `isEnergized` narrows the containable to `Stuff & Energized`.
      if (MixinApi.isEnergized(content)) {
        for (const outcome of content.conduct()) {
          this.narrateShock(outcome.victim, outcome.currentThrough.rawValue());
        }
      }
    }
  }

  /**
   * ⭐ Say what the water did (rubber build). `inflict` is silent — the
   * narration is the caller's — and this trigger used to conduct without a
   * word, so a wader could be dying of electrocution and be told nothing
   * but the room description. In words, by the shipped current bands
   * (tingle · let-go · fibrillation), never a number.
   */
  private narrateShock(victim: Stuff, amps: number): void {
    const band = (key: string, fallback: number): number => {
      try {
        const n = Number.parseFloat(AppApi.setting(key) ?? '');
        return Number.isFinite(n) ? n : fallback;
      } catch {
        return fallback;
      }
    };
    // Only a body that senses can be told (a test body, a corpse cannot).
    if (!(amps > 0) || !MixinApi.isSensor(victim)) return;
    const letGo = band(AppSettingKeys.electricityLetGoAmps, 0.01);
    const fibrillation = band(AppSettingKeys.electricityFibrillationAmps, 0.1);
    const self =
      amps >= fibrillation
        ? Mml.compose`The water bites. Current slams up through your feet, your legs lock rigid, and your heart stumbles.`
        : amps >= letGo
          ? Mml.compose`Current jolts up through your feet from the water and your legs lock — you cannot step out of it.`
          : Mml.compose`A tingle runs up through your feet from the water.`;
    const scene = MessageApi.scene(victim).toSelf(self);
    if (amps >= letGo) {
      scene.toPeers(Mml.compose`${Mml.actor(victim)} jerks rigid in the water.`);
    }
    scene.send();
  }

  /** Litres standing on this cell's floor — the water you wade. */
  private floorPoolLitres(): number {
    const self = this as unknown as Stuff;
    if (!MixinApi.isAdornable(self)) return 0;
    const floor = self.getFloor() as unknown as Stuff | null;
    if (!floor || !MixinApi.isBulkable(floor)) return 0;
    return floor.getBulkAmount('surface').rawValue();
  }
}
