/**
 * WashController — `wash <things> [in <water>] [with <cleanser>]`, and bare
 * `wash` (your own hands). `scrub` is the same act, harder
 * ({@link ScrubController}).
 *
 * ⭐⭐ **The mixin is the authority; this controller is dumb**
 * (cleanliness D10). It binds the targets, settles the water and reads what
 * it is — its temperature (from what holds it) and its hardness (the water
 * carries its source's) — finds the cleanser rows the named cleansers'
 * materials answer to, and hands every target ONE `WashSpec`. What a wash
 * does — mud out in water and time, grease only to soap or an alkali, blood
 * SET by hot water, a wool jumper felted, a red sock bleeding into the
 * whites — is each target's own `washSite`. This file renders the outcome
 * and nothing else.
 *
 * ⭐ **Bare `wash` washes your hands** — the layer at each hand: the
 * gloves, when you wear them (they come clean; the hands under them are
 * untouched). The recovery build's `scrub` folded in, and kept.
 *
 * Afforded by the water: a `WaterFixture`'s `peers` bucket, a shore's
 * `inventory` bucket — you learn `wash` by standing at water.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlManyResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { MixinApi } from "../../../../api/mixin";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { BulkableApi } from "../../../../api/bulk";
import { StuffApi } from "../../../../api/stuff";
import { BiomeApi } from "../../../../api/biome";
import { TemplatePaths } from "../../../../lib/paths";
import { Quantity } from "../../../../lib/quantity";
import type {
  WashCleanser,
  WashOutcome,
  WashSpec,
} from "../../../../lib/cleanliness/Soilable";
import type CleanserCatalogue from "../../CleanserCatalogue";
import type DirtKindCatalogue from "../../DirtKindCatalogue";

const TOPIC = "act.deed";
/** One plain wash, real milliseconds; a scrub is three of them. */
export const WASH_MS = 3000;
/** Water nobody has measured: a basin at a cool room's warmth. */
const UNKNOWN_WATER_K = 285;
/** Hardness nobody has stated — moderately hard (the realm's default seed). */
const UNKNOWN_HARDNESS_DGH = 8;

interface WashModel extends CommandModel {
  target?: MqlManyResult;
  water?: MqlManyResult;
  cleanser?: MqlManyResult;
  /** `scrub … using <brush>` — the scrubbing instrument (scrub only). */
  brush?: MqlManyResult;
}

/** The water a wash is done in, read once. */
interface WashWater {
  source: Stuff;
  waterK: number;
  hardnessDgh: number;
}

export default class WashController extends ManualBuildController<WashModel> {
  /** How hard this act works the thing: `1` a wash, `3` a scrub. */
  protected effort(model?: WashModel): number {
    void model;
    return 1;
  }

  /** The verb's own word for the act, in the scenes. */
  protected act(): { self: string; peers: string } {
    return { self: "wash", peers: "washes" };
  }

  /** The model of the act in flight (the effort reads its brush). */
  protected currentModel: WashModel | undefined;

  async execute(model: WashModel, context: CommandContext): Promise<void> {
    this.currentModel = model;
    // ⭐ A source that has to read itself first (a shore's water, a tap's
    // main) settles before anything is looked for in it.
    for (const c of model.water?.stuff ?? []) {
      await BulkableApi.slotFor(c, undefined)?.settle();
    }
    // The rows the chemistry reads, warmed once here — every later read is
    // a sync `peek` (the catalogue rule).
    const cleansers = await StuffApi.singleton<CleanserCatalogue>(
      TemplatePaths.cleanserCatalogue,
    );
    await StuffApi.singleton<DirtKindCatalogue>(
      TemplatePaths.dirtKindCatalogue,
    ).then((c) => c.allWarmed());
    const found = await this.findCleansers(model.cleanser, cleansers);
    if ("refusal" in found) {
      this.declineStep(context, Mml.compose`${found.refusal}`, "not-a-cleanser");
      return;
    }
    const water = await this.findWater(model.water, context);
    if ("refusal" in water) {
      this.declineStep(context, Mml.compose`${water.refusal}`, water.reason);
      return;
    }
    const targets = (model.target?.stuff ?? []).filter(
      (t) => t !== context.commandGiver,
    );
    if (targets.length === 0) {
      this.washHands(water, found.cleansers, context);
      return;
    }
    this.washThings(targets, water, found.cleansers, context);
  }

  /**
   * ⭐ The things — every target takes ONE spec, and every other target in
   * the same water is its co-wash (where an unfast dye's colour goes).
   */
  private washThings(
    targets: Stuff[],
    water: WashWater,
    cleansers: WashCleanser[],
    context: CommandContext,
  ): void {
    const giver = context.commandGiver;
    const soilable = targets.filter((t) => MixinApi.isSoilable(t));
    // ⭐ The thing says why it is not washed (a strewn earth floor); the
    // verb only renders it.
    const refusals = soilable
      .map((t) => (MixinApi.isSoilable(t) ? t.washRefusal() : null))
      .filter((r): r is string => r !== null);
    const washable = soilable.filter(
      (t) => MixinApi.isSoilable(t) && t.washRefusal() === null,
    );
    if (washable.length === 0) {
      this.declineStep(
        context,
        refusals.length > 0
          ? Mml.compose`${refusals[0]!}`
          : Mml.compose`You can't wash ${Mml.thing(targets[0]!)} clean.`,
        refusals.length > 0 ? "not-washed-so" : "not-washable",
      );
      return;
    }
    const act = this.act();
    const effort = this.effort(this.currentModel);
    const names = washable.map((t) => t.getPresentation());
    this.engageStep(context, {
      durationMs: WASH_MS * effort,
      effortW: effort > 1 ? 350 : 200,
      beginSelf: Mml.compose`You take ${names.join(", ")} to ${Mml.thing(water.source)}${withWords(cleansers)}.${this.fibreWarning(washable, water)}`,
      onComplete: () => {
        const spec: WashSpec = {
          waterK: water.waterK,
          hardnessDgh: water.hardnessDgh,
          cleansers,
          effort,
          coWashed: washable,
        };
        const lines: string[] = [];
        for (const t of washable) {
          if (t.isDestroyed() || !MixinApi.isSoilable(t)) continue;
          const outcome = t.washSite(spec, "");
          lines.push(describeOutcome(t.getPresentation(), outcome, act.self));
        }
        spendCleansers(cleansers, washable.length);
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(Mml.compose`${lines.join(" ")}`)
          .toPeers(
            Mml.compose`${Mml.actor(giver)} ${act.peers} ${names.join(", ")}.`,
          )
          .send();
      },
    });
  }

  /**
   * Bare `wash` — the hands, on the layer each hand wears: the gloves come
   * clean and the hands under them stay as they were.
   */
  private washHands(
    water: WashWater,
    cleansers: WashCleanser[],
    context: CommandContext,
  ): void {
    const giver = context.commandGiver;
    if (!MixinApi.isAttired(giver) || giver.handSites().length === 0) {
      this.declineStep(context, Mml.compose`Wash what?`, "no-hands");
      return;
    }
    const effort = this.effort(this.currentModel);
    const gloved = giver.handSites().some((h) => giver.outermostAt(h) !== null);
    this.engageStep(context, {
      durationMs: WASH_MS * effort,
      effortW: effort > 1 ? 350 : 200,
      beginSelf: Mml.compose`You step to ${Mml.thing(water.source)} to wash your ${gloved ? "gloves" : "hands"}${withWords(cleansers)}.`,
      onComplete: () => {
        giver.washHands({
          waterK: water.waterK,
          hardnessDgh: water.hardnessDgh,
          cleansers,
          effort,
        });
        spendCleansers(cleansers, 1);
        const clean = giver.handCleanliness() >= 0.9;
        const what = gloved ? "gloves" : "hands";
        MessageApi.scene(giver)
          .topic(TOPIC)
          .toSelf(
            clean
              ? Mml.compose`You scrub your ${what} clean under the water.`
              : Mml.compose`You wash your ${what}, but they are not clean yet.`,
          )
          .toPeers(Mml.compose`${Mml.actor(giver)} washes their ${what}.`)
          .send();
      },
    });
  }

  /**
   * ⭐ A competent hand knows before it washes (lens 1: resolution, not
   * access) — the textiles band tells you *wool — it will felt if boiled*.
   * An untrained hand finds out after.
   */
  private fibreWarning(targets: Stuff[], water: WashWater): string {
    if (water.waterK < 363) return "";
    for (const t of targets) {
      if (!MixinApi.isTangible(t)) continue;
      const m = t.getMaterial();
      if (m?.hasTag("protein") && m.hasTag("fibre")) {
        return ` The water is near boiling, and ${t.getPresentation()} is wool.`;
      }
    }
    return "";
  }

  /**
   * The cleansers named, by the agent tag their MATERIAL carries — a bar
   * of soap is soap because it is made of soap; a flask of lye is lye. A
   * named thing that is no cleanser is refused in words.
   */
  private async findCleansers(
    bound: MqlManyResult | undefined,
    catalogue: CleanserCatalogue,
  ): Promise<{ cleansers: WashCleanser[] } | { refusal: string }> {
    const out: WashCleanser[] = [];
    for (const c of bound?.stuff ?? []) {
      const material = materialOf(c);
      const tags = material?.getTags() ?? [];
      const row = await catalogue.byTagsWarmed(tags);
      if (!row) return { refusal: `${c.getPresentation()} is no use for washing.` };
      out.push({ row, materialPath: material?.getTemplatePath() ?? null, source: c });
    }
    return { cleansers: out };
  }

  /**
   * The water: a bulk holder of water or brine in reach (a basin, a tap, a
   * tub, a pail), or the water a shore is beside — read through the
   * shore's one answer, which refuses a frozen water unless there is a
   * hole in it.
   */
  private async findWater(
    bound: MqlManyResult | undefined,
    context: CommandContext,
  ): Promise<WashWater | { refusal: string; reason: string }> {
    const room = context.location ?? null;
    let frozenLine: string | null = null;
    for (const c of bound?.stuff ?? []) {
      if (MixinApi.isShore(c)) {
        const pick = c.waterFor();
        if ("refusal" in pick) continue;
        const drawn = await c.drawAt(pick.key, room);
        if ("refusal" in drawn) {
          if (drawn.refusal === "frozen") frozenLine = drawn.line;
          continue;
        }
        return {
          source: c,
          waterK: drawn.draw.temperatureK,
          hardnessDgh: drawn.draw.hardnessDgh ?? UNKNOWN_HARDNESS_DGH,
        };
      }
      // A crafted vessel's contents are a product, not wash water.
      if (MixinApi.isCrafted(c) && !MixinApi.isSoilable(c)) continue;
      if (!MixinApi.isBulkable(c)) continue;
      const slot = BulkableApi.slotFor(c, undefined);
      if (!slot || slot.isEmpty()) continue;
      const m = slot.getMaterial();
      // ⭐ Water is the material's `water` tag; salt water washes by its
      // own `brine` tag (a deck at sea) — never by giving it `water`.
      if (!m || !(m.hasTag("water") || m.hasTag("brine"))) continue;
      return {
        source: c,
        waterK: slot.getTemperatureK() ?? ambientK(c),
        hardnessDgh: slot.getHardnessDgh() ?? UNKNOWN_HARDNESS_DGH,
      };
    }
    if (frozenLine) return { refusal: frozenLine, reason: "frozen" };
    return { refusal: "There's no water here to wash in.", reason: "no-water" };
  }
}

function materialOf(c: Stuff) {
  if (MixinApi.isBulkable(c)) {
    const slot = BulkableApi.slotFor(c, undefined);
    const m = slot && !slot.isEmpty() ? slot.getMaterial() : null;
    if (m) return m;
  }
  return MixinApi.isTangible(c) ? c.getMaterial() : null;
}

function ambientK(c: Stuff): number {
  try {
    const room = MixinApi.isContainable(c) ? c.getContainer() : null;
    if (room && MixinApi.isContainer(room)) return BiomeApi.airFor(room).tempK;
  } catch {
    // fall through
  }
  return UNKNOWN_WATER_K;
}

function withWords(cleansers: WashCleanser[]): string {
  if (cleansers.length === 0) return "";
  const keys = cleansers.map((c) => c.row.key.replace(/-/g, " "));
  return ` with ${keys.join(" and ")}`;
}

/**
 * ⭐ A cleanser is SPENT by use: a bar wears down (its mass, by the row's
 * kilograms per wash), a flask of lye is poured out by the litre. A bar
 * worn to nothing is gone.
 */
function spendCleansers(cleansers: WashCleanser[], washes: number): void {
  for (const c of cleansers) {
    const src = c.source;
    if (!src || src.isDestroyed()) continue;
    const per = c.row.consumesPerWash * washes;
    if (!(per > 0)) continue;
    if (MixinApi.isBulkable(src)) {
      const slot = BulkableApi.slotFor(src, undefined);
      if (slot && !slot.isEmpty()) {
        // ⭐ (cleanliness D22) A volatile cleanser spent in a wash goes into
        // the room as vapour — naphtha by the hearth is a fire.
        const m = slot.getMaterial();
        const room = MixinApi.isContainable(src) ? src.getContainer() : null;
        const outer = room && room.isAgent() && MixinApi.isContainable(room) ? room.getContainer() : room;
        if (m && m.getVapourMaterial() && outer && MixinApi.isAtmospheric(outer)) {
          outer.addAtmosphereContent(m.getVapourMaterial(), Math.min(per, slot.getAmount().rawValue()) * m.getVapourLPerLPerHour());
        }
        const left = Math.max(0, slot.getAmount().rawValue() - per);
        slot.setAmount(Quantity.of(left, "L"));
        if (left <= 0) {
          slot.setMaterial(null);
          slot.setPayload(null);
        }
        continue;
      }
    }
    if (MixinApi.isTangible(src)) {
      const left = src.getMass().rawValue() - per;
      if (left <= 0.001) void StuffApi.destruct(src);
      else src.setMass(Quantity.of(left, "kg"));
    }
  }
}

/** The outcome, in words — the only thing the verb decides. */
function describeOutcome(name: string, o: WashOutcome, verb: string): string {
  const parts: string[] = [];
  const out = Object.keys(o.removed);
  parts.push(
    out.length > 0
      ? `You ${verb} ${name}; the ${out.join(" and ")} come${out.length === 1 ? "s" : ""} out.`
      : `You ${verb} ${name}.`,
  );
  if (o.setNow.length > 0) {
    parts.push(`The hot water sets the ${o.setNow.join(" and ")} into it.`);
  }
  const d = new Set(o.damage);
  if (d.has("felted")) parts.push("It comes out of the boil felted and shrunk — thick, hard and small.");
  else if (d.has("shrunk")) parts.push("It has shrunk a little in the hot water.");
  if (d.has("burnt")) parts.push("The cleanser has eaten into the cloth.");
  if (d.has("rotted")) parts.push("The bleach has weakened the cloth.");
  if (d.has("scratched")) parts.push("It is scratched.");
  if (d.has("bled")) parts.push("Its colour runs into the rest of the wash.");
  else if (d.has("faded")) parts.push("Some of the colour comes away with the water.");
  parts.push(o.band === "clean" ? "It comes up clean." : `It is still ${o.band}.`);
  return parts.join(" ");
}
