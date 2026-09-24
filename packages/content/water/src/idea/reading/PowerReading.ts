/**
 * AnalyzePowerController — `analyze power [<target>]`, the **mechanical**
 * reading.
 *
 * ⭐⭐ **This verb exists because `ρ·g·Δh·Q·η` had three appearances and
 * no consumer.** A pump reads the equation as a bill, a water tower as a
 * deferred bill, and a turbine as income — and the third had nowhere to
 * go. `ControlStructure.generationW` shipped, computed real watts, and
 * **nothing in the tree ever called it**. The Wharfside aqueduct house
 * has carried `generates: true` since the water build with no way for
 * anybody to find out what it makes.
 *
 * Two readings, by whether the target generates power or consumes it:
 *
 *  - a **generator** (anything answering `generationW`) — the reach it
 *    sits on, the flow passing now, its head, and the watts that makes;
 *  - a **consumer** (anything answering `availablePowerW`) — the watts
 *    reaching it and what that buys in throughput.
 *
 * ⭐ Both are duck-typed, deliberately. A grist mill lives in
 * `trade-milling` and this pack has never heard of it; a stamp mill will
 * live somewhere else again. The reading is *"does this thing answer the
 * question"*, not *"is this thing one of the classes I know about"* —
 * the `FordExit` rule, which is what lets two packs meet over a shape
 * with neither depending on the other.
 *
 * ⚠ The stanza is on the platform's shipped `analyze` view and the
 * controller is here: the instrumentation split, exactly as
 * `analyze ground` (mining) and `analyze water` (this pack) do it. A
 * second `analyze` view in this pack would SHADOW the platform's
 * silently — the nine shipped collisions are what that looks like.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Mml } from '@saxonberg/server/mud/api/mml';
import WatercourseCatalogue from '../WatercourseCatalogue';

const TOPIC = 'sense.reading';
const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';

interface AnalyzePowerModel extends CommandModel {
  target?: MqlOneResult;
}

/** Anything that turns a flow into watts. */
interface Generator {
  generationW(flowM3S: number): number;
  getReachRef(): string;
  getHeadM(): number;
}

/** Anything that mechanical power drives. */
interface Driven {
  availablePowerW(): number;
  throughputNow(): number;
}

function asGenerator(target: Stuff): Generator | null {
  const duck = target as unknown as Partial<Generator>;
  return typeof duck.generationW === 'function' &&
    typeof duck.getReachRef === 'function'
    ? (duck as Generator)
    : null;
}

function asDriven(target: Stuff): Driven | null {
  const duck = target as unknown as Partial<Driven>;
  return typeof duck.availablePowerW === 'function'
    ? (duck as Driven)
    : null;
}

/** Watts, in the unit a person would actually say. */
function watts(w: number): string {
  if (w >= 1000) return `${(w / 1000).toFixed(1)} kW`;
  return `${Math.round(w)} W`;
}

export default class PowerReading extends Reading {
  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    const model = { target: { stuff: subject, raw: param } } as unknown as AnalyzePowerModel;
    const giver = ctx.commandGiver as unknown as Stuff;
    const target = model.target?.stuff ?? null;

    if (target === null) {
      await this.reportHere(ctx);
      return;
    }

    const generator = asGenerator(target);
    if (generator !== null) {
      await this.reportGenerator(target, generator, ctx);
      return;
    }

    const driven = asDriven(target);
    if (driven !== null) {
      this.reportDriven(target, driven, ctx);
      return;
    }

    ctx.note({
      kind: 'controller-rejected',
      reason: 'not-a-generator',
      detail: 'nothing to read power from',
    });
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`${Mml.thing(target)} neither makes power nor runs on it.`,
      )
      .send();
  }

  /** What is available where you stand, if the ground drains anywhere. */
  private async reportHere(ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver;
    const scope = (
      giver as Stuff & { getContainer?: () => unknown }
    ).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-scope',
        detail: 'no scope to read power at',
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You aren't anywhere to read power.`)
        .send();
      return;
    }

    const locality = await AddressApi.resolveLocalityFor(
      scope as Stuff & Container,
    );
    const reach = locality?.getReach() ?? null;
    if (reach === null) {
      // ⚠ Off the watershed is a normal state of the world — three
      // localities ship rootless on purpose.
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`No water runs through this ground. There is no power to be had from it.`,
        )
        .send();
      return;
    }

    const reading = await this.flowAt(reach);
    if (reading === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`This ground drains to ${reach}, but nothing here knows what is running through it.`,
        )
        .send();
      return;
    }

    // ⭐ The honest answer to "could I put a mill here": the flow is
    // half of it and the DROP is the other half, and this ground has no
    // drop of its own until somebody builds one. A weir is what turns a
    // river into power, which is the thing worth a player knowing.
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`${[
          `reach: ${reach}`,
          `${reading.m3s.toFixed(2)} m³/s passing`,
          `a fall of one metre here would make ${watts(
            this.wattsFor(1, reading.m3s),
          )}`,
        ].join('\n')}\n`,
      )
      .send();
  }

  /** A weir, a dam, an aqueduct house: what it is making right now. */
  private async reportGenerator(
    target: Stuff,
    generator: Generator,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const reach = generator.getReachRef();
    const reading = reach ? await this.flowAt(reach) : null;
    if (reading === null) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} sits on no reach anybody can read.`,
        )
        .send();
      return;
    }
    const w = generator.generationW(reading.m3s);
    const head = generator.getHeadM();
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`${[
          `reach: ${reach}`,
          `${reading.m3s.toFixed(2)} m³/s passing`,
          `${head.toFixed(0)} m of head`,
          w > 0
            ? `making ${watts(w)}`
            : `making nothing — it is not set to generate`,
        ].join('\n')}\n`,
      )
      .send();
  }

  /** A mill, a hammer, a pump: what reaches it and what that buys. */
  private reportDriven(
    target: Stuff,
    driven: Driven,
    ctx: CommandContext,
  ): void {
    const giver = ctx.commandGiver;
    const w = driven.availablePowerW();
    const rate =
      typeof driven.throughputNow === 'function' ? driven.throughputNow() : 0;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        Mml.compose`${[
          w > 0
            ? `${watts(w)} reaching it`
            : `no power reaching it at all`,
          rate > 0
            ? `${rate.toFixed(2)} kg a minute`
            : `it will not turn`,
        ].join('\n')}\n`,
      )
      .send();
  }

  /** ρ·g·Δh·Q·η for an arbitrary head — the "what if" arm. */
  private wattsFor(headM: number, m3s: number): number {
    // The same constants `ControlStructure.generationW` uses; a bare
    // reading has no structure to ask, so the standard figures stand in.
    const RHO = 1000;
    const G = 9.81;
    const ETA = 0.85;
    return RHO * G * headM * m3s * ETA;
  }

  /** The drainage catalogue's reading, or null when it is not installed. */
  private async flowAt(
    reach: string,
  ): Promise<{ m3s: number } | null> {
    try {
      const cat = await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH);
      const duck = cat as unknown as {
        flowAt?: (r: string, nowS: number) => Promise<{ m3s: number } | null>;
      };
      if (typeof duck.flowAt !== 'function') return null;
      return await duck.flowAt(reach, WorldClockApi.getNow().rawValue());
    } catch {
      return null;
    }
  }
}
