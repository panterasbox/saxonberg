/**
 * refines — the Sugar House refiner's brain (sugar D19).
 *
 * ⭐ **One act per beat, every act a verb a player could type.** The
 * refiner reads the copper and the arch where he stands and does the next
 * thing a boiler would: water in, a block dissolved, lime, the skim, the
 * fire laid and lit, the copper set on it, and the copper taken off at the
 * strike. A player at the same copper does the same verbs by hand.
 *
 * The strike is read off the liquor itself — the copper's material — not
 * by running the reading verb: the brain knows what the pan holds the way
 * the pan does. ⚠ No `boil` anywhere: `heat` sets the copper on the fire
 * and the plateau does the boiling.
 *
 * What it does NOT do yet: fetch blocks or lime from elsewhere (it works
 * with what is in the room), or pour the strike into a cone (W2).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import Copper from '../thing/Copper';

/** Litres of water a batch starts from — a block's worth, at a working strength. */
const BATCH_WATER = '30L';
/** The stage a boiler takes the copper off at. */
const STRIKE_TAG = 'strike';

/** What the refiner can see of his floor. */
interface Floor {
  copper: Copper | null;
  onFire: boolean;
  archLit: boolean;
  archFuelled: boolean;
  liquor: 'empty' | 'water' | 'liquor' | 'struck' | 'spoilt';
  limed: number;
  skimmed: boolean;
  block: boolean;
  lime: boolean;
  fuel: boolean;
}

export const brain = class {
  static label = 'refines';
  static kind: TaskKind = 'work';
  static summary =
    'Runs the copper: water, a block dissolved, tempered, skimmed, the ' +
    'fire lit, boiled to the strike and taken off.';
  static discipline = 'sugar-refining';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static presenceGated = false;
  static ambient = false;

  static urgency(ctx: BrainContext): Urgency {
    const floor = brain.read(ctx.host);
    if (floor === null) return new Urgency('idle');
    return brain.next(floor) === null
      ? new Urgency('idle')
      : new Urgency('wanted', 'turns to the copper');
  }

  /**
   * ⭐ The next verb a boiler would type, or `null` when there is nothing
   * to do (the pan is boiling, or he has nothing to work with). Pure: the
   * state machine is this one function.
   */
  static next(f: Floor): string | null {
    if (!f.copper) return null;
    if (f.liquor === 'struck') return f.onFire ? 'get copper' : null;
    if (f.liquor === 'spoilt') return null;
    if (f.liquor === 'empty') return 'pour butt into copper --amount ' + BATCH_WATER;
    if (f.liquor === 'water') return f.block ? 'put block in copper' : null;
    // A liquor: temper and skim it before it goes on.
    if (f.limed === 0) return f.lime ? 'temper copper with lime' : null;
    if (!f.skimmed) return 'skim copper into pail';
    if (!f.archFuelled) return f.fuel ? 'stoke arch with coal' : null;
    if (!f.archLit) return 'light arch';
    if (!f.onFire) return 'heat copper';
    return null;
  }

  static read(host: Stuff): Floor | null {
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') return null;
    if (!MixinApi.isContainable(host)) return null;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return null;
    const here = [
      ...(room as Stuff & Container).getContents(),
      ...(MixinApi.isContainer(host) ? host.getContents() : []),
    ] as Stuff[];
    const copper = (here.find((s) => s instanceof Copper) as Copper | undefined) ??
      (here
        .flatMap((s) => (MixinApi.isPlacing(s) ? ([...s.getPlaced()] as Stuff[]) : []))
        .find((s) => s instanceof Copper) as Copper | undefined) ??
      null;
    const arch = here.find((s) => MixinApi.isBurner(s)) ?? null;
    const hasTag = (s: Stuff, tag: string): boolean =>
      MixinApi.isTangible(s) && (s.getMaterial()?.hasTag(tag) ?? false);
    let liquor: Floor['liquor'] = 'empty';
    let limed = 0;
    let skimmed = false;
    if (copper && !copper.isBulkEmpty('interior')) {
      const mat = copper.getBulkMaterial('interior');
      const payload = copper.getBulkPayload('interior') ?? {};
      limed = payload.limed ?? 0;
      skimmed = payload.skimmed ?? false;
      if (!mat || mat.getSolidsKgPerL() <= 0) liquor = 'water';
      else if (mat.hasTag(STRIKE_TAG)) liquor = 'struck';
      else if (mat.hasTag('caramel') || mat.hasTag('burnt') || mat.hasTag('blackstrap')) liquor = 'spoilt';
      else liquor = 'liquor';
    }
    const onFire =
      !!copper &&
      !!arch &&
      (copper.getPlacement()?.host as unknown as Stuff | undefined) === arch;
    return {
      copper,
      onFire,
      archLit: !!arch && MixinApi.isBurner(arch) && arch.isLit(),
      archFuelled: !!arch && MixinApi.isBurner(arch) && arch.fuelRemaining() > 0,
      liquor,
      limed,
      skimmed,
      block: here.some((s) => hasTag(s, 'raw-sugar')),
      lime: here.some((s) => hasTag(s, 'liming')),
      fuel: here.some((s) => hasTag(s, 'fuel')),
    };
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host)) return;
    const floor = brain.read(host);
    if (floor === null) return;
    const verb = brain.next(floor);
    if (verb !== null) await (host as Stuff & CommandGiver).forceCommand(verb);
  }
};
