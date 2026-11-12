/**
 * Spear — ⭐ **taking a fish under the water** (underwater C5, D21): a
 * barbed fish spear for the lit band, where you can see them. The fish
 * are the reach's — the fishery the water pack keeps — so a speared fish
 * is DRAWN from the same record every line and pot draws from; a fished-
 * out water has nothing to spear. You take the most plentiful thing that
 * is there, or nothing comes within reach. The spear answers facts; the
 * `fish` verb words them (controller-liquidity W12).
 */

import Weapon from '@saxonberg/server/mud/platform/thing/equipment/Weapon';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Waters, { WATERS_PATH } from '@saxonberg/content-trade-fishing/src/idea/Waters';
import { TakesFishMixin, type FishCast, type TakeFishOutcome } from '@saxonberg/content-trade-fishing/src/lib/TakesFish';

/** Below this share of what the reach can hold, nothing comes close enough. */
const SPEARABLE_LEVEL = 0.15;

/** A spear's thrust, as effort: short and hard. */
const THRUST = { durationS: 10, powerW: 400 };

export default class Spear extends TakesFishMixin(Weapon) {
  static commandContributions: CommandContributions = {
    self: [],
    // ⭐ `fish` with the spear in hand (underwater review: no `spear` verb
    // named for the tool) — the spear answers it as `TakesFish`.
    environment: ['trade/fishing/cmd/fishing/fish.yaml'],
    peers: [],
  };

  /** ⭐ Thrust at what the water holds here. The water decides; the spear takes. */
  public override async takeFishBy(by: Stuff, _cast: FishCast): Promise<TakeFishOutcome> {
    if (this.getContainer() !== by) {
      return { ok: false, reason: 'not-holding' };
    }
    const medium = BiomeApi.mediumFor(by);
    if (!medium.immersed || medium.atSurface) {
      return { ok: false, reason: 'not-under' };
    }
    const place = MixinApi.isContainable(by) ? by.getContainer() : null;
    if (place === null || !MixinApi.isContainer(by)) {
      return { ok: false, reason: 'no-water' };
    }
    if (MixinApi.isExerting(by)) by.exert(THRUST);
    const waters = await StuffApi.singleton<Waters>(WATERS_PATH);
    const reach = await waters.reachAt(place);
    const registry = await waters.registry();
    const nowS = WorldClockApi.getNow().rawValue();
    const standing = reach !== null && registry !== null ? await registry.standingAt(reach, nowS) : null;
    const best = (standing?.species ?? [])
      .filter((s) => s.capacity > 0 && s.level / Math.max(1e-9, s.capacity) >= SPEARABLE_LEVEL)
      .sort((a, b) => b.level - a.level)[0];
    if (!best || reach === null || registry === null) {
      return { ok: false, reason: 'nothing-near' };
    }
    if ((await registry.draw(reach, best.speciesPath, 1, nowS)) < 1) {
      return { ok: false, reason: 'missed' };
    }
    const leaf = best.speciesPath.split('/').pop() ?? '';
    const fish = await StuffApi.clone<Stuff>(`/trade/fishing/agent/${leaf}`);
    if (MixinApi.isCarrying(by)) by.receive(fish as Stuff & Containable);
    else ContainmentApi.move(fish as Stuff & Containable, by as Stuff & Container);
    return { ok: true, facts: { kind: 'struck', fish } };
  }
}
