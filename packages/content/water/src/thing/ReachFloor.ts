/**
 * ReachFloor — ⭐ **the floor under a river's moving water — what you stand on
 * in it** (river D13). A FLOOR, so a Thing in its place, never a place
 * itself (the bed you sink to under a pool is a place: a `ReachStop`).
 *
 * A river place's floor is its water — swum over where it is deep, stood
 * on where it is not. This is that floor with one more fact: **standing in
 * fast water over rock jams a foot.** When a body takes its feet in water
 * running at `water.river.entrapMps` or more over a rock or gravel bed
 * broken enough to have gaps in it, the foot goes down between two stones
 * and the river takes the rest of the body: held, breath and cold running,
 * until somebody pulls them out (`pull <person>`) or the foot comes free
 * and the river carries them on.
 *
 * Competence is never the gate. The read (`look river`, `measure current`)
 * says the water is fast over rock; the feet-first float is the technique
 * that keeps your feet up.
 */

import WaterSurface from '@saxonberg/server/mud/platform/thing/WaterSurface';
import { HazardActivity, HAZARD_PIN_TYPE } from '@saxonberg/server/mud/lib/hazard/HazardActivity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Engaged } from '@saxonberg/server/mud/lib/activity/Engaged';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Slottable } from '@saxonberg/server/mud/lib/slot/Slottable';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type WatercourseCatalogue from '../idea/WatercourseCatalogue';
import type ReachWarren from '../idea/ReachWarren';

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';
const WARREN_PATH = '/system/water/idea/ReachWarren';
/** Water this fast over broken rock takes a standing foot, m/s (`water.river.entrapMps`). */
const ENTRAP_MPS = 1.0;
/** How long a jammed foot holds, game seconds (`water.river.entrapS`). */
const ENTRAP_S = 45;

export default class ReachFloor extends WaterSurface {
  /** ⭐ Taking your feet here may cost you one (D13). */
  public override occupy(candidate: Stuff & Slottable, slot: string): void {
    super.occupy(candidate, slot);
    void this.entrapIfFast(candidate as unknown as Stuff).catch(() => undefined);
  }

  private async entrapIfFast(body: Stuff): Promise<void> {
    if (!MixinApi.isEngaged(body) || !MixinApi.isContainable(body)) return;
    const place = body.getContainer() as unknown as Stuff | null;
    const pos = place !== null && MixinApi.isPositioned(place) ? place.getLinePosition() : null;
    if (pos === null) return;
    const cat = StuffApi.findByTemplatePath<WatercourseCatalogue>(CATALOGUE_PATH);
    const state = cat ? await cat.riverStateAt(pos, WorldClockApi.getNow().rawValue()) : null;
    if (!state) return;
    // ⭐ Broken water over stones — a riffle or a rapid, not a smooth run —
    // running fast enough to take your weight off the foot it jams.
    const rocky = state.stretch.bed === 'rock' || state.stretch.bed === 'gravel';
    const broken = state.stretch.flow === 'riffle' || state.stretch.flow === 'rapid';
    if (!(rocky && broken && Math.abs(state.currentHereMps) >= dial('water.river.entrapMps', ENTRAP_MPS))) {
      return;
    }
    try {
      MessageApi.scene(body)
        .topic('act.deed')
        .toSelf(Mml.compose`Your foot goes down between two rocks and the river takes the rest of you. You are held by the foot, face to the water, and it will not let go.`)
        .toPeers(Mml.compose`${Mml.actor(body)} stands, and the river takes them by the foot.`)
        .send();
    } catch {
      /* decoration */
    }
    const below = { ...pos, km: Math.max(0, pos.km - 0.01) };
    SchedulerApi.start(
      new HazardActivity({
        actor: body as Stuff & Engaged,
        type: HAZARD_PIN_TYPE,
        durationMs: dial('water.river.entrapS', ENTRAP_S) * 1000,
        slots: ['body'],
        // The foot comes free on its own: the river takes you on.
        onComplete: (): void => {
          if (body.isDestroyed()) return;
          void StuffApi.singleton<ReachWarren>(WARREN_PATH)
            .then((w) => w.handIn(body as Stuff & Containable, below))
            .catch(() => undefined);
        },
        onAbort: (): void => undefined,
      }),
    );
  }
}

function dial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key) ?? '');
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}
