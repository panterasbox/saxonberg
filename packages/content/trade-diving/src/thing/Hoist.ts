/**
 * Hoist — ⭐ **the bell's cable and drum** (underwater C2, D26): a derrick
 * on the quay that lowers its bell one band of the water at a time and
 * raises it again. `haul bell down`, `haul bell up` — the kernel's one
 * `haul` verb, over the `Haulable` protocol the hoist speaks for its
 * bell. Whoever is inside rides with it.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { Haulable, HaulOutcome, HaulSense } from '@saxonberg/server/mud/lib/spatial/Haulable';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class Hoist extends Tool implements Haulable {
  static commandContributions: CommandContributions = {
    self: [],
    // The hoist stands on the quay: whoever is there works it.
    peers: ['platform/cmd/inventory/haul.yaml'],
    environment: [],
  };

  static fieldMeta: FieldMeta = {
    bell: { persistent: true, authorable: true },
  };

  /** The row of the bell this hoist carries. */
  public bell = '';

  /** The bell on the cable, when it is in the world. */
  public getBell(): (Stuff & Container) | null {
    if (this.bell === '') return null;
    const b = StuffApi.findByTemplatePath<Stuff>(this.bell);
    return b && !b.isDestroyed() && MixinApi.isContainer(b) ? b : null;
  }

  /**
   * ⭐ One band of the water down, or up — the water's own ways, read off
   * the place the bell hangs in. Up from the top band is the surface; the
   * bell comes no higher than that on the cable.
   */
  public async haulBy(hauler: Stuff, sense: HaulSense | null): Promise<HaulOutcome> {
    const bell = this.getBell();
    if (bell === null || !MixinApi.isContainable(bell)) {
      return { ok: false, reason: 'no-bell', line: 'There is no bell on the hoist.' };
    }
    const where = bell.getContainer();
    if (where === null || !MixinApi.isExitable(where) || !MixinApi.isWaterPlace(where)) {
      return { ok: false, reason: 'not-in-water', line: 'The bell is not in the water.' };
    }
    const way = sense ?? 'down';
    if (way === 'down') await where.ensureColumnExits();
    const exit = where.getExit(way);
    if (!exit || (way === 'up' && !MixinApi.isWaterPlace(where) )) {
      return {
        ok: false,
        reason: way === 'down' ? 'on-the-bed' : 'at-the-surface',
        line: way === 'down' ? 'The bell is on the bottom; the cable goes slack.' : 'The bell is already up at the surface.',
      };
    }
    let next: (Stuff & Container) | null = null;
    try {
      next = await exit.resolveDestination();
    } catch {
      next = null;
    }
    if (next === null || !MixinApi.isWaterPlace(next)) {
      return {
        ok: false,
        reason: way === 'down' ? 'on-the-bed' : 'at-the-surface',
        line: way === 'down' ? 'The bell is on the bottom; the cable goes slack.' : 'The bell is already up at the surface.',
      };
    }
    ContainmentApi.move(bell, next);
    const me = this as unknown as Stuff;
    return {
      ok: true,
      self: way === 'down'
        ? Mml.compose`You let the drum of ${Mml.thing(me)} run; the bell goes down into the water.`
        : Mml.compose`You wind ${Mml.thing(me)}; the cable comes in streaming, and the bell rises.`,
      peers: Mml.compose`${Mml.actor(hauler)} works the hoist, and the cable runs.`,
    };
  }
}
