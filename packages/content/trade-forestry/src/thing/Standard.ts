/**
 * Standard — ⭐ **a planted tree kept for its timber**, and the class is
 * what says so (controller-liquidity W11).
 *
 * In every respect but one it is a `Plant`: it grows on the shipped growth
 * model, sits in a panel slot, persists as a keyed nested host. What it
 * adds is that it answers the axe (`FellableMixin`): felled where it
 * stands — mature, the same bole, logs, bark, brash and seed a stand's
 * standard drops; young or established, one whole tree taken up; a
 * seedling refuses.
 *
 * ⛔ **Not on `Plant` itself.** Wheat does not answer the axe, and an
 * honest default refusing on every plant but a tree is the wrong host (P2).
 * Until this build `fell` asked any growing thing whether it yielded no
 * crop and kept the discipline `silviculture` — a guess at the host set;
 * the rows that name this class are the host set. A coppice stool stays a
 * `Plant` (it is cut with a billhook, through `harvest`).
 *
 * What a felled one is made of: the room stand's entry for this species
 * when there is one, else the row's own `standardMaterialPath`.
 */

import Plant from '@saxonberg/server/mud/platform/thing/Plant';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { STAND_MIXIN, type Stand } from '../lib/Stand';
import {
  FellableMixin,
  FELL_COST,
  FELL_MS,
  FELLED_TREE_KG,
  LOGS_PER_STANDARD,
  PLANTED_FELL_EFFORT_W,
  type FellDone,
  type FellPlan,
  type FellRefusal,
} from '../lib/Fellable';
import type { ActOutcome } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { CROSSCUT_COST, CROSSCUT_MS } from './Bole';

const FELLED_TREE_PATH = '/trade/forestry/thing/felled-tree';

const StandardBase = FellableMixin(Plant);

export default class Standard extends StandardBase {
  public override async fellPlanFor(
    actor: Stuff,
    axe: Stuff,
    _word: string,
  ): Promise<FellPlan | FellRefusal> {
    if (!this.fellsWith(axe)) return { ok: false, reason: 'wrong-tool' };
    const stage = this.getGrowthStage();
    if (stage === 'seedling') return { ok: false, reason: 'not-yet-a-tree' };
    const mature = stage === 'mature';
    const name = this.getPresentation();
    return {
      ok: true,
      durationMs: mature ? FELL_MS : CROSSCUT_MS,
      effortW: PLANTED_FELL_EFFORT_W,
      facts: { name, planted: true },
      onComplete: () => this.fellHere(actor, stage, name),
    };
  }

  /** The felling, at completion — the tree comes down where it stands. */
  private async fellHere(
    actor: Stuff,
    stage: string,
    name: string,
  ): Promise<ActOutcome<FellDone>> {
    const self = this as unknown as Stuff;
    if (actor.isDestroyed() || this.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
    const panel = this.getContainer();
    const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
    if (!room || !MixinApi.isContainer(room)) return { ok: true, facts: { kind: 'gone' } };
    const stand: (Stuff & Stand) | null = MixinApi.isActive(room, STAND_MIXIN)
      ? (room as unknown as Stuff & Stand)
      : null;
    const speciesPath = this.getSpecies()?.getTemplatePath() ?? '';
    const entry = stand ? (stand.getMix().find((sp) => sp.speciesPath === speciesPath) ?? null) : null;
    const woodPath = entry?.woodMaterialPath ?? this.getStandardMaterialPath() ?? '';
    const seedPath = entry?.seedPath ?? this.getSeedTemplatePath();
    const plantKey = MixinApi.isPersistable(self) ? self.getPersistenceKey() : null;
    const mature = stage === 'mature';

    // ⭐ The endurance is spent HERE, when the tree comes down (C12).
    Standard.spendOn(actor, mature ? FELL_COST : CROSSCUT_COST);
    await StuffApi.destruct(self);

    let done: FellDone;
    if (mature) {
      // ⭐ A planted oak grown to a standard gives its bark too — the
      // stand's entry knows; a species this ground does not carry gives
      // none, which is honest.
      const { bole, seed } = await Standard.dropStandard(actor, room, {
        woodMaterialPath: woodPath,
        seedPath,
        barkPath: entry?.barkPath ?? null,
        brashMaterialPath: entry?.brashMaterialPath ?? null,
      });
      done = { kind: 'standard', name, planted: true, bole, logs: LOGS_PER_STANDARD, seed };
    } else {
      const wood = woodPath ? await Standard.woodAt(woodPath) : null;
      const tree = await StuffApi.clone<Stuff & Containable>(FELLED_TREE_PATH);
      if (wood && MixinApi.isTangible(tree)) tree.setMaterial(wood);
      if (MixinApi.isTangible(tree)) {
        tree.setMass(Quantity.of(FELLED_TREE_KG[stage] ?? FELLED_TREE_KG.young!, 'kg'));
      }
      // Made (D-W7a): to whoever felled it, else set down where it fell.
      if (MixinApi.isContainer(actor) && actor.canReceive(tree) === null) ContainmentApi.move(tree, actor);
      else ContainmentApi.move(tree, room as Stuff & Container);
      done = { kind: 'whole', name };
    }

    if (stand && plantKey) stand.removePlanting(plantKey);
    if (panel) await Standard.captureNow(panel);
    await Standard.captureNow(room);
    await Standard.captureNow(actor);
    await Standard.creditFelling(actor, mature ? 'standard' : 'easy');
    return { ok: true, facts: done };
  }

  private static async woodAt(path: string): Promise<Material | null> {
    try {
      return await StuffApi.singleton<Material>(path);
    } catch {
      return null;
    }
  }
}
