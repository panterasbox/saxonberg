/**
 * WashController — `wash <things> [in <water>] [with <cleanser>]`, and bare
 * `wash` (your own hands). `wash … --hard` scrubs — the same act with more
 * time in it (controllers-are-io D8c: `scrub` was a manner, not a verb).
 *
 * ⭐⭐ **One act, and the thing washed is the authority** (cleanliness D10;
 * `WashableMixin`, controller-liquidity W7c). This controller binds the
 * targets, asks the water in reach what it is (`WaterDrawable` — its heat
 * and its hardness, the source's), finds the cleanser rows the named
 * cleansers' materials answer to, and asks the first thing named for ONE
 * wash plan with the rest of the load beside it. What a wash does — mud out
 * in water and time, grease only to soap or an alkali, blood SET by hot
 * water, a wool jumper felted, a red sock bleeding into the whites — is
 * each thing's own `washSite`. This file renders the outcome.
 *
 * ⭐ **Bare `wash` washes your hands** — your own body asked the same plan
 * answers with the layer at each hand (`HygieneMixin`): the gloves when you
 * wear them (they come clean; the hands under them are untouched).
 *
 * Afforded by the water: a `WaterFixture`'s `peers` bucket, a shore's
 * `inventory` bucket — you learn `wash` by standing at water.
 */

import { ManualBuildController } from "./ManualBuildController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import type { MqlManyResult } from "../../../../api/mql";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import type { ActWords } from "../../../../lib/command/EngagedActController";
import type { WaterDrawRefusal } from "../../../../lib/bulk/WaterDrawable";
import type { WashBegin, WashFacts, WashRefusal } from "../../../../lib/cleanliness/Washable";
import { MixinApi } from "../../../../api/mixin";
import { Mml } from "../../../../api/mml";
import { BulkableApi } from "../../../../api/bulk";
import type {
  WashCleanser,
  WashOutcome,
  WashSpec,
} from "../../../../lib/cleanliness/Soilable";

type Composed = ReturnType<typeof Mml.compose>;

/** Water hardness nobody has stated — moderately hard (the realm's default seed). */
const UNKNOWN_HARDNESS_DGH = 8;

export interface WashModel extends CommandModel {
  target?: MqlManyResult;
  water?: MqlManyResult;
  cleanser?: MqlManyResult;
  /** `wash … using <brush>` — the scrubbing instrument (it tells only on `--hard`). */
  brush?: MqlManyResult;
  /** ⭐ `--hard` — scrub it: a manner of washing, not a second verb (D8c). */
  hard?: boolean;
}

/** The water a wash is done in, read once. */
export interface WashWater {
  source: Stuff;
  waterK: number;
  hardnessDgh: number;
}

export default class WashController extends ManualBuildController<WashModel> {
  async execute(model: WashModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ No catalogue (B50): a cleanser is what its MATERIAL names, loaded
    // with it; a dirt kind's row loaded when the dirt was made.
    const found = this.findCleansers(model.cleanser);
    if ("refusal" in found) {
      this.declineStep(context, Mml.compose`${found.refusal}`, "not-a-cleanser");
      return;
    }
    const water = await this.findWater(model.water, giver);
    if ("reason" in water) {
      this.declineStep(context, WashController.waterWords(water.reason), water.reason);
      return;
    }
    const spec: WashSpec = {
      waterK: water.waterK,
      hardnessDgh: water.hardnessDgh,
      cleansers: found.cleansers,
      effort: WashController.effortOf(model),
    };
    // ⭐ Your own body, asked, washes its hands: bare `wash`, or `wash me`.
    const things = (model.target?.stuff ?? []).filter((t) => t !== giver);
    const lead: Stuff = things[0] ?? giver;
    if (!MixinApi.isWashable(lead)) {
      this.declineStep(context, Mml.compose`Wash what?`, "no-hands");
      return;
    }
    const plan = lead.washPlanFor({ actor: giver, spec, alongside: things.slice(1) });
    const words = WashController.washWords(giver, water, found.cleansers, model.hard === true, context.location === water.source);
    if (!plan.ok) {
      this.declineStep(context, words.onRefused(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, words);
  }

  /**
   * How hard this act works the thing: `1` a wash; `--hard` three washes'
   * worth with a brush, half that with bare hands (cleanliness D10 — time
   * is the wash's third contribution, so a scrub is a wash with more of it).
   */
  protected static effortOf(model: WashModel): number {
    if (model.hard !== true) return 1;
    return (model.brush?.stuff ?? []).length > 0 ? 3 : 1.5;
  }

  /** ⭐ The words for one wash (D4) — the things, or the hands. */
  protected static washWords(
    giver: Stuff,
    water: WashWater,
    cleansers: readonly WashCleanser[],
    hard: boolean,
    inIt: boolean,
  ): ActWords<WashBegin, WashFacts, WashRefusal> {
    const act = hard ? { self: "scrub", peers: "scrubs" } : { self: "wash", peers: "washes" };
    const soap = withWords(cleansers);
    return {
      beginSelf: (b) => {
        if (b.kind === "hands") {
          const what = b.gloved ? "gloves" : "hands";
          // ⭐ In the water already (a swimmer, a diver): it is round you, not
          // somewhere to take things to (found by the underwater browser walk).
          return inIt
            ? Mml.compose`You wash your ${what} in the water round you${soap}.`
            : Mml.compose`You step to ${Mml.thing(water.source)} to wash your ${what}${soap}.`;
        }
        const names = b.items.map((t) => t.getPresentation()).join(", ");
        const warn = WashController.fibreWarning(b.items, water);
        return inIt
          ? Mml.compose`You wash ${names} in the water round you${soap}.${warn}`
          : Mml.compose`You take ${names} to ${Mml.thing(water.source)}${soap}.${warn}`;
      },
      onRefused: (r) => WashController.refusalWords(r),
      onDone: (f) => {
        if (MixinApi.isAdvancing(giver)) {
          // The deed `analyze cleanliness` reads (B57).
          void giver.creditDeed({ discipline: "domestic-services", difficulty: "easy", outcome: "success" });
        }
        if (f.kind === "hands") {
          const what = f.gloved ? "gloves" : "hands";
          return {
            self: f.clean
              ? Mml.compose`You scrub your ${what} clean under the water.`
              : Mml.compose`You wash your ${what}, but they are not clean yet.`,
            peers: Mml.compose`${Mml.actor(giver)} washes their ${what}.`,
          };
        }
        const lines = f.results.map((r) => describeOutcome(r.item.getPresentation(), r.outcome, act.self));
        const names = f.results.map((r) => r.item.getPresentation()).join(", ");
        return {
          self: Mml.compose`${lines.join(" ")}`,
          peers: Mml.compose`${Mml.actor(giver)} ${act.peers} ${names}.`,
        };
      },
    };
  }

  /** ⭐ Every reason, exhaustively. */
  protected static refusalWords(r: WashRefusal): Composed {
    switch (r.reason) {
      case "not-washed-so":
        return Mml.compose`${r.facts.why}`;
      case "not-washable":
        return Mml.compose`That won't wash clean.`;
      case "no-hands":
        return Mml.compose`Wash what?`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** Why there is no water to wash in. */
  protected static waterWords(reason: WaterDrawRefusal["reason"]): Composed {
    return reason === "frozen"
      ? Mml.compose`The water is frozen over. You would need a hole in the ice.`
      : Mml.compose`There's no water here to wash in.`;
  }

  /**
   * ⭐ A competent hand knows before it washes (lens 1: resolution, not
   * access) — the textiles band tells you *wool — it will felt if boiled*.
   * An untrained hand finds out after.
   */
  protected static fibreWarning(targets: readonly Stuff[], water: WashWater): string {
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
  protected findCleansers(
    bound: MqlManyResult | undefined,
  ): { cleansers: WashCleanser[] } | { refusal: string } {
    const out: WashCleanser[] = [];
    for (const c of bound?.stuff ?? []) {
      const material = materialOf(c);
      const row = material?.getCleanser() ?? null;
      if (!row) return { refusal: `${c.getPresentation()} is no use for washing.` };
      out.push({ row, materialPath: material?.getTemplatePath() ?? null, source: c });
    }
    return { cleansers: out };
  }

  /**
   * ⭐ The water: the first of the bound sources that gives any
   * (`WaterDrawable.drawWaterFor` — a vessel's water or brine, settled; a
   * shore's, which refuses a frozen water unless there is a hole in it).
   * Its heat and hardness are the draw's.
   *
   * ⚠ Bounded (found by the drive: a wash never answered, and the player
   * could do nothing else). A source that cannot settle in time is passed
   * over; the bound is logged so the slow one is named.
   */
  protected async findWater(
    bound: MqlManyResult | undefined,
    actor: Stuff,
  ): Promise<WashWater | { reason: WaterDrawRefusal["reason"] }> {
    let why: WaterDrawRefusal["reason"] = "no-water";
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isWaterDrawable(c)) continue;
      const drawn = await bounded(c.drawWaterFor(actor), `draw ${c.getTemplatePath()}`);
      if (drawn === undefined) continue;
      if (!drawn.ok) {
        if (drawn.reason === "frozen") why = "frozen";
        continue;
      }
      return {
        source: c,
        waterK: drawn.facts.draw.temperatureK,
        hardnessDgh: drawn.facts.draw.hardnessDgh ?? UNKNOWN_HARDNESS_DGH,
      };
    }
    return { reason: why };
  }
}

/** Wait for `p`, but never longer than `ms`; say which wait ran over. */
async function bounded<T>(p: Promise<T>, label: string, ms = 5000): Promise<T | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<undefined>((res) => {
    timer = setTimeout(() => {
      console.warn(`WashController: ${label} did not settle in ${ms} ms; washing without it`);
      res(undefined);
    }, ms);
  });
  try {
    return await Promise.race([p, late]);
  } finally {
    if (timer) clearTimeout(timer);
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


function withWords(cleansers: readonly WashCleanser[]): string {
  if (cleansers.length === 0) return "";
  const keys = cleansers.map((c) => c.row.key.replace(/-/g, " "));
  return ` with ${keys.join(" and ")}`;
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
