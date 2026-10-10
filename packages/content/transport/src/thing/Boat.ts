/**
 * Boat — a small craft you sit IN, that holds a position of its own once
 * it is in the water (maritime D12).
 *
 * ⭐ On deck it is a vessel in a room, like any other, and has no position
 * (`expansePosition` null): ask where its occupants are and the answer is
 * the ship's. Launched, it is detached from every container (the legal
 * final-detach edge) and IS the outermost craft — `ExpanseApi.craftAt` of
 * its path answers itself, so a person in it is wherever the BOAT is, not
 * in the water and not on the ship. Recovered, it goes back onto a deck
 * and gives its position up.
 *
 * It composes `VoyagingMixin`, so a boat can lay a course and anchor
 * exactly as a ship can (the same three views, afforded from inside it),
 * and `PersistableMixin`, so a boat adrift survives a restart: its row
 * places it on its ship's deck, and `onRestored` takes it back off the
 * deck when its record says it was in the water.
 *
 * Singleton: one row is one boat (the `Cast` rule). The row lives with
 * the ship that carries it.
 */

import ExitableVessel from '@saxonberg/server/mud/lib/boundary/ExitableVessel';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { PositionedMixin } from '@saxonberg/server/mud/lib/expanse/Positioned';
import { VoyagingMixin } from '@saxonberg/server/mud/lib/expanse/Voyaging';
import { EngagedMixin } from '@saxonberg/server/mud/lib/activity/Engaged';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Mobile } from '@saxonberg/server/mud/lib/spatial/Mobile';
import type { Exitable } from '@saxonberg/server/mud/lib/boundary/Exitable';
import type { Slotted } from '@saxonberg/server/mud/lib/slot/Slotted';
import type { Positioned } from '@saxonberg/server/mud/lib/expanse/Positioned';
import type { Voyaging } from '@saxonberg/server/mud/lib/expanse/Voyaging';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { Persistable } from '@saxonberg/server/mud/lib/persistence/Persistable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

type HullShape = Stuff & Slotted & Mobile & Container & Containable & Exitable & Positioned;

const Hull = PositionedMixin(
  MobileMixin(ExitableVessel),
) as unknown as MixinConstructor<HullShape>;

type BoatShape = HullShape & Voyaging & Engaged & Persistable;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BoatBase = SingletonMixin(PersistableMixin(VoyagingMixin(EngagedMixin(Hull)))) as unknown as new (...args: any[]) => BoatShape;

/** What a boat affords to whoever sits in it. */
const FROM_INSIDE = [
  'system/transport/cmd/movement/launch.yaml',
  'system/transport/cmd/movement/recover.yaml',
  'platform/cmd/movement/course.yaml',
  'platform/cmd/movement/anchor.yaml',
  'platform/cmd/social/hail.yaml',
];

export default class Boat extends BoatBase {
  static commandContributions: CommandContributions = {
    environment: FROM_INSIDE,
  };

  static fieldMeta: FieldMeta = {
    eyeHeightM: { persistent: true, authorable: true },
    heightM: { persistent: true, authorable: true },
  };

  /** Eye height of somebody sitting in it, metres. */
  protected eyeHeightM = 1;
  /** How tall it stands as a target, metres. */
  protected heightM = 1.5;

  public getEyeHeightM(): number { return this.eyeHeightM; }
  public setEyeHeightM(v: number): void { this.eyeHeightM = Math.max(0, Number(v) || 0); }
  public getHeightM(): number { return this.heightM; }
  public setHeightM(v: number): void { this.heightM = Math.max(0, Number(v) || 0); }

  /** Low in the water: everybody aboard sees from the same height. */
  override sightHeightFor(_observer: unknown): number {
    return this.eyeHeightM;
  }

  override getTargetHeightM(): number {
    return this.heightM;
  }

  /** Whoever is sitting in it. */
  override async aboard(): Promise<Stuff[]> {
    return this.getContents().filter((x) => MixinApi.isOrganism(x));
  }

  /** The boat is its own watch. */
  override async watchRoom(): Promise<(Stuff & Container) | null> {
    return this as unknown as Stuff & Container;
  }

  /** The gear in it. */
  override async gearAboard(): Promise<Stuff[]> {
    return this.getContents().filter((x) => MixinApi.isDurable(x));
  }

  /**
   * ⭐ A boat whose record says it was in the water goes back in the
   * water: the row put it on its ship's deck, and the record's position
   * overrules that.
   */
  override async onRestored(): Promise<void> {
    if (this.getExpansePosition() !== null && this.getContainer() !== null) {
      ContainmentApi.move(this, null);
    }
    await super.onRestored();
  }
}
