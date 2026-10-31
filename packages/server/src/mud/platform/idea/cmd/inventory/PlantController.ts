/**
 * PlantController — `plant <seed> in <pot>`, and `sow <seed>` on ground.
 *
 * ⭐ **Two shapes, one verb** (cover build D4). Named into a pot or a bed,
 * a seed becomes ONE plant in the slot — the shipped flow, below. With no
 * pot, or naming soil-bearing ground that holds no slot (a field), the
 * seed is BROADCAST: one act covers an area, the crop is one plant with a
 * sown area, and a later act of the same kind widens it. The ground is
 * asked whether it may be sown (`sowingRefusal`) — the seedbed is the
 * ground's state, not the verb's.
 *
 * Mints the plant the seed names into the pot's one plant slot and
 * consumes the seed. The pot must hold soil (a pot is a volume, and the
 * volume is the root ceiling) and its slot must be free.
 *
 * The new plant goes into the pot's **contents** as well as its **slot** —
 * the wear/equip pattern, and load-bearing: the Slotted capture slice
 * names its occupants by index into the container slice, so a slot-only
 * occupant resolves to -1 and is silently dropped on restore.
 *
 * A cultivated plant is its own persistence host, so the act captures the
 * plant itself through `PersistableApi.captureHostOf`.
 */

import { EngagedActController } from '../../../../lib/command/EngagedActController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { ParcelApi } from '../../../../api/parcel';
import { LandUses } from '../../../../lib/parcel/LandUse';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { PersistableApi } from '../../../../api/persistable';
import { AccessApi } from '../../../../api/access';
import { AppApi } from '../../../../api/app';
import { EmploymentApi } from '../../../../api/employment';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { Quantity } from '../../../../lib/quantity';
import { PLANT_SLOT } from '../../../../lib/husbandry/Cultivable';
import type { Tooled } from '../../../../lib/craft/Tooled';
import type { Soil } from '../../../../lib/husbandry/Soil';
import type { Plantable } from '../../../../lib/husbandry/Plantable';
import type { Growing } from '../../../../lib/husbandry/Growing';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import Plant from '../../../thing/Plant';

const TOPIC = 'act.deed';

interface PlantModel extends CommandModel {
  seed: MqlOneResult;
  /** Absent when sowing the ground you stand on. */
  pot?: MqlOneResult;
  /** `at <patch>` — which part of a divided field to sow (D5). */
  patch?: MqlOneResult;
  /** A seed drill within reach — sows in rows at its own seed rate. */
  drill?: MqlOneResult;
}

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export default class PlantController extends EngagedActController<PlantModel> {
  async execute(model: PlantModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const seed = model.seed.stuff;
    const target = model.pot?.stuff ?? null;

    if (!seed) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.seed.raw}' here.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'seed',
        query: model.seed.raw,
      });
      return;
    }

    // ⭐ The CAPABILITY, not the `Seed` class. `mustBePlantable` on the
    // spec checks this exact predicate — one source of truth, so the
    // menu and the verb cannot disagree about what can be planted.
    if (!MixinApi.isPlantable(seed)) {
      const detail = `${seed.getPresentation()} is not a seed`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(seed)} isn't a seed.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-seed',
        detail,
      });
      return;
    }
    // ⭐ No pot named, or soil-bearing GROUND named: broadcast it.
    const potRaw = model.pot?.raw ?? '';
    if (!target && potRaw.trim() !== '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${potRaw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'pot', query: potRaw });
      return;
    }
    const ground: Stuff | null =
      target ?? (MixinApi.isContainable(giver) ? giver.getContainer() : null);
    if (
      ground &&
      MixinApi.isSoil(ground) &&
      MixinApi.isContainer(ground) &&
      !MixinApi.isCultivable(ground)
    ) {
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
      const drill = model.drill?.stuff ?? null;
      await this.sowGround(
        context,
        seed,
        ground,
        patch && MixinApi.isSoil(patch) ? patch : null,
        drill && MixinApi.isTool(drill) && drill.hasCapability('drilling') ? drill : null,
      );
      return;
    }
    if (!target) {
      this.decline(
        context,
        Mml.compose`Plant it in what? Name a pot or a bed, or stand on ground that will take seed.`,
        'no-ground',
      );
      return;
    }

    if (!MixinApi.isCultivable(target)) {
      const detail = `${target.getPresentation()} is not a pot`;
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You can't plant anything in ${Mml.thing(target)}.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-pot',
        detail,
      });
      return;
    }
    // ⭐ THE LAND-USE GATE. Cultivating GROUND is the parcel's business:
    // a bed on the Registry's civic floor is refused, and the refusal
    // names the use rather than saying "no". A POT is exempt — it is
    // furniture you carry, and a houseplant on a windowsill in a rented
    // office is not agriculture.
    if (target.isFixedGround()) {
      // WHERE the bed stands, not what template it came from: every bed
      // clones from `/trade/farming/thing/bed/garden`, so the template path would zone
      // every bed in the world identically. The parcel that governs it
      // is the one covering the ROOM it is in — by its persistence KEY
      // when it has one (a room cloned once per lot shares its template
      // path with every other lot's).
      //
      // ⚠ UNPARCELLED GROUND IS NOT POLICED. `landUseOf` is total and
      // answers `wild` for ground nobody has claimed — but "nobody has
      // zoned this" is not "this is zoned against you", and treating it
      // as one breaks the hermit. Measure nothing, police nothing.
      const site = MixinApi.isContainable(target) ? target.getContainer() : null;
      const zoned = site ? await landUseRefusal(site) : null;
      if (zoned) {
        MessageApi.scene(giver).topic(TOPIC).toSelf(zoned).send();
        context.note({
          kind: 'controller-rejected',
          reason: 'land-use-forbids-cultivation',
          // ⭐ The record names the USE, as the sentence does.
          detail: site
            ? `${groundPath(site)} is zoned ${ParcelApi.landUseOf(groundPath(site))} and admits no cultivation`
            : 'nowhere admits no cultivation',
        });
        return;
      }
    }

    if (!target.hasSoil()) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} has no soil in it. Pour some in first.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-soil',
        detail: `${target.getPresentation()} holds no soil`,
      });
      return;
    }
    if (target.isSlotFull(PLANT_SLOT)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} already has something growing in it.`,
        )
        .send();
      context.note({
        kind: 'slot-occupied',
        host: MessageApi.refOf(target),
        slot: PLANT_SLOT,
      });
      return;
    }

    const growsInto = seed.getGrowsIntoPath();
    if (!growsInto) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(seed)} doesn't seem to be viable.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'seed-names-no-plant',
        detail: `${seed.getPresentation()} names no plant template`,
      });
      return;
    }

    const plant = await StuffApi.clone<Plant>(growsInto);

    // Gate on `fitsSlot` even though a seedling fits anything today — so a
    // future large-seeded species cannot be planted into a thimble.
    if (!MixinApi.isSlottable(plant) || !plant.fitsSlot(target, PLANT_SLOT)) {
      StuffApi.destruct(plant);
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} is too small for that to grow in.`,
        )
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'pot-too-small',
        detail: `${target.getPresentation()} cannot carry that plant`,
      });
      return;
    }

    // Contents FIRST, then the slot — see the class docstring.
    ContainmentApi.move(plant, target);
    // Settle the ground's water window before the arrival counts toward
    // its demand — a bed that sat empty must not be billed for the gap.
    target.reconcileSoil();
    target.occupy(plant, PLANT_SLOT);
    StuffApi.destruct(seed);

    // The plant is its own host; a failed capture must not fail the verb.
    try {
      await PersistableApi.captureHostOf(plant);
    } catch (err) {
      console.warn('PlantController: capture after planting failed:', err);
    }

    // Credit the plant's own Discipline (`horticulture` unless the row says
    // otherwise — an acorn planted as a standard is `silviculture`).
    // Pressing a seed into soil is the entry act and reads `trivial`,
    // which is the honest grade AND self-limiting: the estimator treats a
    // trivial success as unsurprising, so no amount of planting
    // substitutes for keeping something alive.
    try {
      if (MixinApi.isAdvancing(giver))
        await giver.creditDeed({
          discipline: plant.getDiscipline(),
          difficulty: 'trivial',
          outcome: 'success',
        });
    } catch (err) {
      console.warn('PlantController: recording the deed failed:', err);
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`You press the seed into the soil. ${Mml.thing(plant)} will grow here.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} plants a seed in ${Mml.thing(target)}.`,
      )
      .send();
  }

  /**
   * ⭐ **Broadcast a seed over ground** (cover build D4). One act covers
   * `husbandry.sowHandM2` (a strip across the field), or less when the seed or the ground runs out;
   * seed is spent at the crop's own `seedRateKgPerM2`, so a third of a
   * field's seed sows a third of it. The first act creates the crop; a
   * later act of the same kind widens it. Engaged, so it lands at
   * completion.
   *
   * ⭐ On a divided field the cast goes into the PART named (field
   * population D5) — the ground refuses in its own words when none is —
   * and fills that part up to its own area: a full part is `patch-sown`.
   * Choosing where is the player's job; the game never picks for them.
   */
  private async sowGround(
    context: CommandContext,
    seed: Stuff & Plantable,
    ground: Stuff & Soil & Container,
    patch: (Stuff & Soil) | null,
    drill: (Stuff & Tooled) | null,
  ): Promise<void> {
    const giver = context.commandGiver;
    const growsInto = seed.getGrowsIntoPath();
    if (!growsInto) {
      this.decline(
        context,
        Mml.compose`${Mml.thing(seed)} doesn't seem to be viable.`,
        'seed-names-no-plant',
      );
      return;
    }

    // Whose ground it is outranks what state it is in: a stranger is told
    // it is not theirs, never that it wants ploughing or that another
    // crop stands on it.
    const zoned = await landUseRefusal(ground);
    if (zoned) {
      this.decline(context, zoned, 'land-use-forbids-cultivation');
      return;
    }
    if (!(await maySow(giver, ground))) {
      this.decline(
        context,
        Mml.compose`This is not your ground to sow.`,
        'not-held',
      );
      return;
    }

    // Which part of the ground — the GROUND decides whether one must be
    // named, and says so in its own words.
    const resolved = ground.resolvePartFor(patch);
    if (!resolved.ok) {
      this.decline(context, Mml.fromMarkup(resolved.line), resolved.reason);
      return;
    }
    const part = resolved.part;

    // What already stands here decides what may be added to it — the
    // holder's question, once it is theirs.
    const standing = ground.rootedAreaCrop(part);
    if (standing && standing.getTemplatePath() !== growsInto) {
      // ⭐ Another row may still be this crop: the bench's stands are
      // `extends:` rows over one wheat. Ask the crop the seed makes.
      const made = await StuffApi.clone<Stuff>(growsInto);
      const same = MixinApi.isGrowing(made) && standing.isSameKindAs(made);
      await StuffApi.destruct(made);
      if (!same) {
        this.decline(
          context,
          Mml.compose`${Mml.thing(standing)} already stands here. Grub it out before you sow anything else.`,
          'other-crop-stands',
        );
        return;
      }
    }

    const refusal = ground.sowingRefusal();
    if (refusal) {
      this.decline(context, Mml.fromMarkup(refusal), 'ground-refuses-sowing');
      return;
    }

    // The crop row's seed rate. Read off the crop already standing, or
    // off a fresh clone that becomes the crop (and is discarded on a
    // refusal) — no row is read twice.
    let fresh: (Stuff & Growing) | null = null;
    let crop: Stuff & Growing;
    if (standing) {
      crop = standing;
    } else {
      const made = await StuffApi.clone<Stuff>(growsInto);
      if (!MixinApi.isGrowing(made)) {
        await StuffApi.destruct(made);
        this.decline(context, Mml.compose`${Mml.thing(seed)} doesn't seem to be viable.`, 'seed-names-no-plant');
        return;
      }
      fresh = made;
      crop = made;
    }
    const broadcast = crop.getProfile()?.seedRateKgPerM2 ?? 0;
    // ⭐ A drill lays the same crop in rows on its own share of the seed.
    const rate = broadcast * (drill ? drill.getSeedFactor() : 1);
    if (!(rate > 0)) {
      if (fresh) await StuffApi.destruct(fresh);
      this.decline(
        context,
        Mml.compose`${Mml.thing(seed)} is planted one at a time, in a pot or a bed — not broadcast over a field.`,
        'not-broadcast',
      );
      return;
    }

    const seedKg = MixinApi.isTangible(seed) ? seed.getMass().rawValue() : 0;
    const groundM2 = groundAreaM2(part ?? ground);
    const free = Math.max(
      0,
      groundM2 - (standing ? standing.getSownAreaM2() : 0),
    );
    const pass = drill && drill.getSwathM2() > 0
      ? drill.getSwathM2()
      : dial(AppSettingKeys.husbandrySowHandM2, 400);
    const area = Math.min(pass, seedKg / rate, free);
    if (!(area >= 1)) {
      if (fresh) await StuffApi.destruct(fresh);
      this.decline(
        context,
        free >= 1
          ? Mml.compose`There is not enough in ${Mml.thing(seed)} to sow anything.`
          : part
            ? Mml.compose`${Mml.thing(part)} is sown already, edge to edge.`
            : Mml.compose`It is sown already, edge to edge.`,
        free >= 1 ? 'too-little-seed' : part ? 'patch-sown' : 'ground-full',
      );
      return;
    }

    this.engageAct(context, {
      durationMs: Math.round(3000 + area * 10),
      cost: 5,
      beginSelf: drill
        ? part
          ? Mml.compose`You take ${Mml.thing(drill)} down ${Mml.thing(part)}, the coulters laying the seed from ${Mml.thing(seed)} in rows.`
          : Mml.compose`You take ${Mml.thing(drill)} down the ground, the coulters laying the seed from ${Mml.thing(seed)} in rows.`
        : part
          ? Mml.compose`You walk ${Mml.thing(part)}, casting seed from ${Mml.thing(seed)} in wide arcs.`
          : Mml.compose`You walk the ground, casting seed from ${Mml.thing(seed)} in wide arcs.`,
      beginPeers: drill
        ? Mml.compose`${Mml.actor(giver)} works a seed drill down the ground.`
        : Mml.compose`${Mml.actor(giver)} walks the ground, broadcasting seed.`,
      onComplete: () => {
        // ⚠⚠ A MODULE function: this controller is destructed the
        // moment `execute` returns.
        void landSowing(context, seed, ground, part, crop, fresh !== null, area, rate);
      },
      onAbort: () => {
        if (fresh && !fresh.isDestroyed()) void StuffApi.destruct(fresh);
      },
    });
  }
}

/**
 * The square metres a piece of ground covers: the host's own figure when
 * it answers `soilCatchmentAreaM2` (a field's area IS the sky it
 * catches), else unbounded — ground that never said how big it is is
 * never "full".
 */
function groundAreaM2(ground: Stuff & Soil): number {
  const m2 = ground.soilCatchmentAreaM2();
  return m2 > 0 ? m2 : Number.POSITIVE_INFINITY;
}

/**
 * ⭐ **Who may sow** (cover build D6): whoever holds the ground's
 * parcel, or a hand on shift for a business that works it — the
 * IceSheet precedent. Ground no parcel covers is not policed (*measure
 * nothing, police nothing*).
 */
async function maySow(giver: Stuff, ground: Stuff): Promise<boolean> {
  const where = groundPath(ground);
  const covering = await ParcelApi.coveringParcelOf(where);
  if (!covering) return true;
  const extent = covering.getExtent();
  const held = await AccessApi.heldExtents(giver);
  if (held.some((e) => extent === e || extent.startsWith(`${e}/`))) return true;
  if (!MixinApi.isEmployed(giver)) return false;
  return EmploymentApi.operatorsAt(ground).some((b) =>
    giver.isOnShiftFor(b.getOrganizationPath()),
  );
}

/**
 * The identity of a piece of ground for the parcel registry: the
 * persistence KEY when it has one (a plotted field is cloned per lot and
 * shares its template path), else the template path.
 */
function groundPath(ground: Stuff): string {
  // ⚠ Only an EXPLICIT key — an establishing context's per-instance key
  // (a lot's parcel extent). A keyless host stashes a scope-derived owner
  // there, which is no path at all, so the parcel registry would answer
  // *nobody's ground* and a stranger could sow the university's field.
  const keyed =
    MixinApi.isPersistable(ground) && ground.isPersistenceKeyExplicit()
      ? ground.getPersistenceKey()
      : null;
  return keyed ?? ground.getTemplatePath() ?? '';
}

/** The parcel's land-use refusal for cultivating `ground`, or null. */
async function landUseRefusal(
  ground: Stuff,
): Promise<ReturnType<typeof Mml.compose> | null> {
  const where = groundPath(ground);
  const covering = await ParcelApi.coveringParcelOf(where);
  const use = ParcelApi.landUseOf(where);
  if (covering && !LandUses.permitsAnyCultivation(use)) {
    return Mml.compose`Nothing may be grown on this ground — it is zoned for ${LandUses.summaryOf(use)}.`;
  }
  return null;
}

/**
 * The sowing landed. Re-checks that the sower still stands on the ground
 * and still holds the seed, then spends the seed, creates or widens the
 * crop, settles whose it is, and captures.
 */
async function landSowing(
  context: CommandContext,
  seed: Stuff & Plantable,
  ground: Stuff & Soil & Container,
  part: (Stuff & Soil) | null,
  crop: Stuff & Growing,
  fresh: boolean,
  area: number,
  rate: number,
): Promise<void> {
  const giver = context.commandGiver;
  const discard = async (): Promise<void> => {
    if (fresh && !crop.isDestroyed()) await StuffApi.destruct(crop);
  };
  if (giver.isDestroyed() || seed.isDestroyed() || crop.isDestroyed()) {
    await discard();
    return;
  }
  const here = MixinApi.isContainable(giver) ? giver.getContainer() : null;
  if ((here as Stuff | null) !== (ground as Stuff)) {
    await discard();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`Nothing came of it — you are not standing on it any more.`)
      .send();
    return;
  }

  // Spend the seed: mass off, gone at nothing (the `mow` precedent).
  const seedKg = MixinApi.isTangible(seed) ? seed.getMass().rawValue() : 0;
  const spent = Math.min(seedKg, area * rate);
  const left = seedKg - spent;
  if (left < 0.01 || !MixinApi.isTangible(seed)) {
    await StuffApi.destruct(seed);
  } else {
    seed.setMass(Quantity.of(Math.round(left * 1000) / 1000, 'kg'));
  }

  ground.reconcileSoil();
  if (fresh) {
    crop.setSownAreaM2(area);
    // ⭐ Rooted in the part it was sown into, by key, BEFORE the move —
    // so it never reads the whole field's soil, even for a moment.
    if (part) crop.setGroundPart(part.soilPartKey());
    if (MixinApi.isContainable(crop)) ContainmentApi.move(crop, ground);
  } else {
    crop.addSownAreaM2(area);
  }

  try {
    await ground.ensureCropTitle();
  } catch (err) {
    console.warn('PlantController: settling the crop title failed:', err);
  }
  try {
    await PersistableApi.captureHostOf(crop);
    await PersistableApi.captureHostOf(ground);
  } catch (err) {
    console.warn('PlantController: capture after sowing failed:', err);
  }
  try {
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: crop.getDiscipline(),
        difficulty: 'trivial',
        outcome: 'success',
      });
    }
  } catch (err) {
    console.warn('PlantController: recording the deed failed:', err);
  }

  const phrase = crop.cropAreaPhrase(groundAreaM2(part ?? ground));
  const at = part ? Mml.compose` at ${Mml.thing(part)}` : Mml.compose``;
  MessageApi.scene(giver)
    .topic(TOPIC)
    .toSelf(
      phrase
        ? Mml.compose`The seed goes into the ground${at}, and ${Mml.thing(crop)} is sown ${phrase}.`
        : Mml.compose`The seed goes into the ground${at}.`,
    )
    .toPeers(Mml.compose`${Mml.actor(giver)} finishes a cast of seed.`)
    .send();
}
