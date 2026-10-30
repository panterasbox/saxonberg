/**
 * FeedController — `feed <bed> [with <source>]`.
 *
 * {@link WaterController}'s twin, line for line: resolve the target's
 * ground, resolve a carried bulk source of compost **or a slow
 * amendment**, transfer an **explicit measure** sized to the soil's
 * headroom into the `null` discard sink, and credit what came out to the
 * reserve the matter actually feeds — nitrogen for compost, organic
 * matter for a slow amendment (see {@link SLOW_AMENDMENT_TAG}).
 *
 * Three things it shares with `water` deliberately:
 *
 *   1. **An explicit measure, never `{ kind: 'all' }`** — a full sack does
 *      not vanish into a bed that had room for a handful.
 *   2. **Naming either half of the assembly works.** `feed the carrots`
 *      feeds the ground the carrots stand in, the same way `water the pot`
 *      waters the lily in it.
 *   3. **The act captures the ground**, because the nitrogen is the
 *      ground's state — the same reason `water` captures it.
 *
 * ⭐ **A plant, a bed, a patch and a field** (field population D18) — the
 * same resolution as `water`: on a divided field the act names a part
 * (`feed wheat at the top end`) or the ground refuses, listing them, and
 * the compost goes into THAT part's soil. The reply says how much went in.
 *
 * And one thing it does NOT share: `feed` is not tool-afforded. You feed by
 * hand out of a sack, exactly as you pour soil by hand, so no entry joins
 * the `TOOL_CAPABILITIES` table.
 *
 * A pot authors no nitrogen reserve at all, so feeding a houseplant is
 * refused with the reason rather than silently doing nothing — a
 * windowsill plant is never short of nitrogen, and saying so is the honest
 * answer to a player who tries.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { BulkableApi } from '../../../../api/bulk';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { PersistableApi } from '../../../../api/persistable';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { SOIL_NITROGEN_RESERVE_KEY } from '../../../../lib/husbandry/Cultivable';
import {
  SOIL_ORGANIC_MATTER_RESERVE_KEY,
  type Soil,
} from '../../../../lib/husbandry/Soil';
import type { Reserved } from '../../../../lib/reserve';
import { CraftingApi } from '../../../../api/crafting';

const TOPIC = 'act.deed';

/** Material tag a bulk slot must carry to count as feedable. */
const COMPOST_TAG = 'compost';

/**
 * ⭐⭐ **The second kind of matter you work into ground, and it is the
 * other half of a real rotation.** Compost is nitrogen you can spend this
 * season; a `slow-amendment` is **structure and organic matter that pays
 * out over years** — ground bone, ash, marl, lime. Both are *worked in by
 * hand out of a sack*, which is why this is one more branch of `feed`
 * rather than a second verb: the act is identical and only the matter is
 * different.
 *
 * ⚠ **And it is deliberately NOT a fifth soil reserve.** Bone meal's own
 * prose called it phosphorus, and the requirements doc believed it —
 * wrongly: soil holds moisture, nitrogen, organicMatter and structure,
 * and nitrogen is the limiting nutrient the whole farming build is built
 * around. A phosphorus reserve with one producer and one consumer would
 * be a mechanism serving one row. `addOrganicMatter` already credits *a
 * little nitrogen now and most of it later*, which is exactly what ground
 * bone does in a field, so the shipped face says the true thing.
 */
const SLOW_AMENDMENT_TAG = 'slow-amendment';

/**
 * Percentage points of nitrogen one litre of compost restores. A sack
 * holds ~20 L, so a full sack refills a bed's 100 points twice over —
 * generous by design: the interesting decision is *whether you kept up
 * with it*, not how many sacks you counted.
 */
const POINTS_PER_LITRE = 10;

interface FeedModel extends CommandModel {
  target: MqlOneResult;
  /** `at <patch>` — which part of a divided field (D5). */
  patch?: MqlOneResult;
  source?: MqlOneResult;
}

export default class FeedController extends CommandController<FeedModel> {
  async execute(model: FeedModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.target.stuff;

    if (!named) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.target.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'target',
        query: model.target.raw,
      });
      return;
    }

    const patchRaw = model.patch?.raw ?? '';
    const patch = model.patch?.stuff ?? null;
    if (!patch && patchRaw.trim() !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${patchRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patch', query: patchRaw });
      return;
    }

    // Naming either half of the assembly works — `feed the carrots` feeds
    // the bed they stand in; on a divided field, the part named.
    const aim = this.resolveGround(
      named,
      patch && MixinApi.isSoil(patch) ? patch : null,
    );
    if (!aim.ok) {
      MessageApi.scene(giver).topic(TOPIC).toSelf(aim.line).send();
      context.note({
        kind: 'controller-rejected',
        reason: aim.reason,
        detail: aim.detail,
      });
      return;
    }
    const { ground, part } = aim;

    if (!ground.getReserve(SOIL_NITROGEN_RESERVE_KEY)) {
      // A pot. Say why rather than no-op'ing.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(ground)} holds too little soil to need feeding.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-nutrient-reserve',
        detail: `${ground.getPresentation()} declares no nitrogen`,
      });
      return;
    }

    const source = model.source?.stuff ?? this.carriedFeedSource(giver);
    if (!source) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You have nothing to feed it with.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-compost-source',
        detail: 'no carried holder with compost or a slow amendment in it',
      });
      return;
    }

    const fromSlot = BulkableApi.slotFor(
      source,
      model.source?.via,
    );
    if (fromSlot === null || fromSlot.isEmpty()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(source)} is empty.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'source-empty',
        detail: 'source slot empty or absent',
      });
      return;
    }

    const material = fromSlot.getMaterial();
    const payload = fromSlot.getPayload();

    // ⭐⭐ **Which reserve this act feeds is a fact about the MATTER**, read
    // off the material's own tags rather than off the verb or the vessel.
    // A sack of muck and a sack of bone meal are worked into the same
    // ground by the same act and do different things, because they are
    // different things.
    //
    // ⚠ It has to be decided HERE, before the headroom read, and that is
    // the whole reason this block moved below the source resolution. Keyed
    // on nitrogen the way it used to be, a field with rich nitrogen and
    // starved organic matter would have refused a sack of bone meal with
    // *"the soil is already rich"* — a true sentence about the wrong
    // reserve, and the most plausible way for this feature to ship dead.
    const slowAmendment = (material?.getTags() ?? []).includes(
      SLOW_AMENDMENT_TAG,
    );
    const targetKey = slowAmendment
      ? SOIL_ORGANIC_MATTER_RESERVE_KEY
      : SOIL_NITROGEN_RESERVE_KEY;
    const reserve = ground.getReserve(targetKey);
    if (!reserve) {
      // A bed deep enough to need nitrogen but too shallow to hold a
      // long investment. Say which.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(ground)} is too little soil to be worth improving — it wants feeding, not amending.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-amendment-reserve',
        detail: `${ground.getPresentation()} declares no ${targetKey}`,
      });
      return;
    }

    const headroomPoints =
      reserve.capacity.rawValue() - reserve.current.rawValue();
    if (headroomPoints <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          slowAmendment
            ? Mml.compose`The soil in ${Mml.thing(ground)} is in as good heart as it will get.`
            : Mml.compose`The soil in ${Mml.thing(ground)} is already rich.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'already-fed',
        detail: `${ground.getPresentation()} has no room for more ${targetKey}`,
      });
      return;
    }
    const wantedLitres = headroomPoints / POINTS_PER_LITRE;
    const result = BulkableApi.transfer(fromSlot, null, {
      kind: 'measure',
      litres: Math.min(wantedLitres, fromSlot.available()),
      mode: 'lenient',
    });
    for (const note of result.notes) context.note(note);

    if (result.applied <= 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`Nothing comes out of ${Mml.thing(source)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-spread',
        detail: 'the transfer moved nothing',
      });
      return;
    }

    // ⭐ `addOrganicMatter` credits a LITTLE nitrogen too, and that is the
    // honest shape for ground bone: some of it is available now and most
    // of it mineralises over years, which is why a well-amended field is
    // still feeding you in three.
    const applied = slowAmendment
      ? ground.addOrganicMatter(result.applied * POINTS_PER_LITRE)
      : ground.feedSoil(result.applied * POINTS_PER_LITRE);

    try {
      await PersistableApi.captureHostOf(ground);
    } catch (err) {
      console.warn('FeedController: capture after feeding failed:', err);
    }

    if (applied > 0) {
      try {
        if (MixinApi.isAdvancing(giver))
          await giver.creditDeed({
          discipline: 'horticulture',
          difficulty: 'easy',
          outcome: 'success',
        });
      } catch (err) {
        console.warn('FeedController: recording the deed failed:', err);
      }
    }

    const appearance =
      CraftingApi.blendAppearance(payload, material) || 'compost';
    const amount = amountPhrase(result.applied, material?.getDensity().rawValue() ?? 0);
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        part
          ? Mml.compose`You work ${amount} of ${appearance} into the soil at ${Mml.thing(part)}.`
          : Mml.compose`You work ${amount} of ${appearance} into the soil of ${Mml.thing(ground)}.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} feeds ${Mml.thing(part ?? ground)}.`)
      .send();
  }

  /**
   * The soil `named` refers to (D18): itself when it is a bed, a pot or a
   * one-piece field; the PART named on a divided field (the ground refuses
   * in its own words when none is); the ground a plant is rooted in — on a
   * divided field, the ground of its kind's stand in the part named.
   */
  private resolveGround(
    named: Stuff,
    patch: (Stuff & Soil) | null,
  ):
    | { ok: true; ground: Stuff & Soil & Reserved; part: (Stuff & Soil) | null }
    | { ok: false; reason: string; line: Mml; detail: string } {
    let ground: (Stuff & Soil) | null = null;
    let part: (Stuff & Soil) | null = null;
    if (MixinApi.isGrowing(named)) {
      const holder = MixinApi.isContainable(named) ? named.getContainer() : null;
      if (named.isAreaCrop() && holder && MixinApi.isSoil(holder)) {
        const r = holder.resolvePartFor(patch);
        if (!r.ok) {
          return { ok: false, reason: r.reason, line: Mml.fromMarkup(r.line), detail: r.line };
        }
        part = r.part;
        const stand = part ? named.standIn(part) : named;
        ground = stand?.getBed() ?? part ?? holder;
      } else {
        ground = named.getBed();
        if (patch && patch !== ground) {
          return {
            ok: false,
            reason: 'not-a-part-here',
            line: Mml.compose`${Mml.thing(named)} does not stand at ${Mml.thing(patch)}.`,
            detail: `${named.getPresentation()} is not rooted in ${patch.getPresentation()}`,
          };
        }
      }
    } else if (MixinApi.isSoil(named)) {
      const r = named.resolvePartFor(patch);
      if (!r.ok) {
        return { ok: false, reason: r.reason, line: Mml.fromMarkup(r.line), detail: r.line };
      }
      part = r.part;
      ground = part ?? named;
    }
    if (!ground || !MixinApi.isReserved(ground)) {
      return {
        ok: false,
        reason: 'not-cultivable',
        line: Mml.compose`${Mml.thing(named)} isn't ground you can feed.`,
        detail: `${named.getPresentation()} is not cultivable ground`,
      };
    }
    return { ok: true, ground, part };
  }

  /** The first carried holder with compost in it, or null. */
  private carriedFeedSource(giver: Stuff): Stuff | null {
    if (!MixinApi.isContainer(giver)) return null;
    for (const item of giver.getContents()) {
      const slot = BulkableApi.slotFor(item, undefined);
      if (!slot || slot.isEmpty()) continue;
      const tags = slot.getMaterial()?.getTags() ?? [];
      if (tags.includes(COMPOST_TAG) || tags.includes(SLOW_AMENDMENT_TAG)) {
        return item;
      }
    }
    return null;
  }
}

/**
 * How much went in, by weight when the matter has a density (*7 kg*) and
 * by volume when it has none.
 */
function amountPhrase(litres: number, densityKgPerM3: number): string {
  if (densityKgPerM3 > 0) {
    const kg = (litres * densityKgPerM3) / 1000;
    const n = kg >= 10 ? Math.round(kg) : Math.round(kg * 10) / 10;
    return `${n.toLocaleString('en-US')} kg`;
  }
  const n = litres >= 10 ? Math.round(litres) : Math.round(litres * 10) / 10;
  return `${n.toLocaleString('en-US')} L`;
}
