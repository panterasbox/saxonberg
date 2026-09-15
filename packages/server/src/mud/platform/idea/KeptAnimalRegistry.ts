/**
 * KeptAnimalRegistry — ⭐⭐ **the boot roll that stands named animals back
 * up, wherever they were standing.**
 *
 * Every other persistable host in the game is stood up by somebody
 * asking for it: an avatar when its player logs in, a room when someone
 * walks into it, a shelf when its shop materializes. A named animal has
 * nobody to ask.
 *
 * ⚠ Rooms are **lazy** — they clone on first resolve — and a public room
 * has no record of its own, so nothing overlays it. Mouse is asleep on
 * Hinkley Lane, which is a public street: her owner is offline, nobody
 * has walked down the lane since the restart, and without this she
 * simply is not there. ⭐ And she has to be there, because a friend must
 * be able to feed her and a stranger must be able to find her while her
 * person is away — which is the entire lost-and-found design, and it is
 * worth a boot roll.
 *
 * The `ChattelRegistry` precedent exactly: a singleton index warmed from
 * its own collection at boot, listed in the platform pack's `boot:`.
 *
 * ⚠ **After the chattel and parcel registries**, because standing an
 * animal up resolves its place, which reads title. And tolerant of a
 * room that cannot resolve: a record whose lot was deleted logs and
 * skips, the record survives, and the animal reads as *lost* — which is
 * the honest outcome rather than a boot failure.
 */

import { Idea } from '../../lib/stuff/Idea';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { PersistedRecord } from '../../lib/persistence/PersistedRecord';
import { PersistableApi } from '../../api/persistable';
import { PersistApi } from '../../api/persist';
import { Mixins } from '../../lib/mixin';
import type { VetoResult } from '../../lib/errors';

const KeptAnimalRegistryBase = PostRegistrationMixin(Idea);

export class KeptAnimalRegistry extends KeptAnimalRegistryBase {
  /** How many animals the last roll stood up — boot-log legibility. */
  private stoodUp = 0;

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.rollCall();
  }

  public canEvict(): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  /** How many the last roll call stood up. */
  public getStoodUp(): number {
    return this.stoodUp;
  }

  /**
   * Stand up every animal that has a record and is not already live.
   *
   * ⭐ `standUpKeyed` is resolve-or-mint, so this is safe to run when
   * some animals are already standing — an owner who logged in before
   * the roll finished does not get a second cat.
   */
  public async rollCall(): Promise<number> {
    this.stoodUp = 0;
    if (!PersistApi.isConnected()) return 0;
    let records: PersistedRecord[];
    try {
      records = await PersistedRecord.findWithLayer(Mixins.Bonded);
    } catch (e) {
      console.warn(`KeptAnimalRegistry: roll call could not read: ${String(e)}`);
      return 0;
    }
    for (const record of records) {
      const scope = record.getScope();
      const key = record.getOwner();
      if (!scope || !key) continue;
      try {
        const animal = await PersistableApi.standUpKeyed(scope, key);
        if (animal) this.stoodUp += 1;
      } catch (e) {
        // ⚠ A room that no longer resolves (a deleted lot) must not take
        // the boot down with it. The record survives; the animal is lost,
        // which is a thing that can happen to an animal.
        console.warn(
          `KeptAnimalRegistry: '${scope}' keyed '${key}' could not stand up: ${String(e)}`,
        );
      }
    }
    if (this.stoodUp > 0) {
      console.info(`KeptAnimalRegistry: ${this.stoodUp} kept animal(s) stood up`);
    }
    return this.stoodUp;
  }
}

export default KeptAnimalRegistry;
