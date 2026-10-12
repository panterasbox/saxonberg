/**
 * AnalyzeWaterController — handler for `analyze water [<target>]`.
 *
 * Two readings, and which one you get depends on whether you point at
 * something:
 *
 *  - **bare** — the water at the place you are standing: the reach the
 *    covering locality declares, what is passing there, how much of it
 *    is snowmelt, how much snow is still on the ground above you, and
 *    whether a boat gets through.
 *  - **at a target** — that waterworks' whole working: its two ends,
 *    its head, its capacity, whether it runs on gravity or on a pump
 *    and what the pump costs, and why it is not delivering if it is not.
 *
 * ⭐⭐ **It lives in the WATER pack, and it used to live in the kernel.**
 *
 * The instrumentation split says a channel's STANZA goes on the
 * platform's shipped `measure`/`analyze` view while its CONTROLLER lives
 * with whoever owns the subject matter — which is how `analyze soil`
 * sits in `trade-farming` and `measure strike` in `trade-mining`. This
 * one was the platform's, and the tell was a kernel constant naming
 * `/system/water/idea/WatercourseCatalogue`: **the engine does not know
 * which systems exist.**
 *
 * ⚠ The kernel's own shape-reading seam is untouched and still right —
 * `SupplyReporting` is plain data in, plain data out, so anything that
 * carries water anywhere answers `analyze water <target>` whether or not
 * this pack has ever heard of it. What moved is only the half that was
 * always about THIS system: the bare reading, which asks the drainage
 * catalogue what is passing here.
 *
 * ⭐ And inside the pack the catalogue is simply imported. The structural
 * `DrainageView` shim existed to keep the kernel from naming a pack
 * class; a pack naming its own class needs no shim, and the all-optional
 * interface it required was a cost paid for a boundary that is no longer
 * being crossed.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { CompetenceBand, type CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
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
import type { SupplyReporting } from '@saxonberg/server/mud/lib/supply/SupplyState';
import WatercourseCatalogue, { type IceRecord } from '../WatercourseCatalogue';

interface AnalyzeWaterModel extends CommandModel {
  target?: MqlOneResult;
}

/** The Discipline the ice read is banded and credited on. */
const PHYSICS = 'physics';

/** A person, a horse, a loaded cart — what a sheet bears, in words. */
function bearsWords(kg: number): string {
  if (kg >= 1000) return 'a loaded cart';
  if (kg >= 500) return 'a horse';
  if (kg >= 80) return 'a person';
  return 'nothing heavier than a dog';
}

/** The ice line, banded: presence for anyone, judgement, then figures. */
function iceLine(ice: IceRecord, band: CompetenceBandName): string {
  if (ice.thicknessM <= 0) {
    return ice.reason === 'running'
      ? 'the water is moving; no ice holds on it'
      : 'the water is open';
  }
  const lies = ice.perennial ? 'ice lies on the water, and has for years' : 'ice lies on the water';
  if (!CompetenceBand.atOrAbove(band, 'competent')) return lies;
  const bears = ice.bearsKg >= 80 && !ice.rotting;
  const judgement = ice.rotting
    ? 'it is rotten — honeycombed and dark'
    : bears
      ? 'it looks solid enough to walk on'
      : 'it would not bear you';
  if (!CompetenceBand.atOrAbove(band, 'proficient')) return `${lies}; ${judgement}`;
  const kind = ice.quality === 'snow-ice' ? 'white snow-ice' : 'black ice';
  return (
    `${lies}: ${(ice.thicknessM * 100).toFixed(0)} cm of ${kind}` +
    `${ice.rotting ? ', rotting' : ''} — it would bear ${bearsWords(ice.bearsKg)}`
  );
}

/** The catalogue's identity path — the pack's own, in the pack. */
const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';

export default class WaterReading extends Reading {
  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    // ⚠ Absent and bound-but-unresolved are DIFFERENT, and collapsing
    // them is how a bare verb silently reads the wrong thing. An empty
    // `param` with nothing bound is *the player said nothing*; a
    // non-empty one that bound nothing is *the player named something
    // that is not here*.
    const model = {
      target:
        subject !== null
          ? { stuff: subject, raw: param }
          : param === ''
            ? undefined
            : { stuff: null, raw: param },
    } as unknown as AnalyzeWaterModel;
    const giver = this.actorOf(ctx);
    const target = model.target?.stuff ?? null;

    if (target !== null) {
      await this.reportOn(target, ctx);
      return;
    }

    const scope = (
      giver as Stuff & { getContainer?: () => unknown }
    ).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-scope',
        detail: 'no scope to read water at',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`You aren't anywhere to read the water.`)
        .send();
      return;
    }

    const locality = await AddressApi.resolveLocalityFor(scope as Stuff & Container);
    const reach = locality?.getReach() ?? null;
    if (reach === null) {
      // ⚠ Off the watershed is a NORMAL state of the world, not an
      // error — three localities ship rootless on purpose.
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(
          Mml.compose`Nothing here drains anywhere you could name. This ground is off the watershed.`,
        )
        .send();
      return;
    }

    const drainage = await this.drainage();
    const flow =
      drainage?.flowAt === undefined
        ? null
        : await drainage.flowAt(reach, WorldClockApi.getNow().rawValue());
    if (flow === null) {
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(
          Mml.compose`This ground drains to ${reach}, but nothing here knows what is running through it.`,
        )
        .send();
      return;
    }

    const lines = [
      `reach: ${reach}`,
      `${flow.m3s.toFixed(2)} m³/s passing` +
        (flow.meltM3S > 0
          ? `, ${flow.meltM3S.toFixed(2)} of it snowmelt`
          : ''),
      flow.snowpackMm > 0
        ? `${flow.snowpackMm.toFixed(0)} mm of water still lying as snow above you`
        : `no snow left on the catchment`,
      flow.navigable ? `a boat would get through` : `too little for a boat`,
    ];
    // ⭐ The ice (the climate build, D8): read by PHYSICS — Stefan's law
    // and what a sheet bears are physics, and the Discipline already
    // claims the head on a water course. Anyone sees whether ice lies;
    // a competent eye judges whether it would bear you; a proficient one
    // reads the thickness, the kind and the load.
    const ice =
      drainage?.iceAt === undefined
        ? null
        : await drainage.iceAt(reach, WorldClockApi.getNow().rawValue());
    if (ice !== null) {
      const band = MixinApi.isAdvancing(giver)
        ? await giver.competenceBandFor(PHYSICS)
        : CompetenceBand.FLOOR;
      lines.push(iceLine(ice, band));
      if (ice.thicknessM > 0 && MixinApi.isAdvancing(giver) && CompetenceBand.atOrAbove(band, 'competent')) {
        await giver.creditDeed({
          discipline: PHYSICS,
          difficulty: ice.thicknessM < 0.1 ? 'hard' : 'standard',
          outcome: 'success',
        });
      }
    }
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(Mml.compose`${lines.join('\n')}\n`)
      .send();
  }

  /** Print a waterworks' own report, over the shape. */
  private async reportOn(target: Stuff, ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver;
    const report = (target as unknown as SupplyReporting).supplyReport;
    if (typeof report !== 'function') {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'not-a-supply',
        detail: 'the target reports no supply state',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(
          Mml.compose`${target.getPresentation()} carries no water anywhere.`,
        )
        .send();
      return;
    }
    const read = await report.call(target, WorldClockApi.getNow().rawValue());
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(
        Mml.compose`${read.label}\n${read.lines.map((l) => `  ${l}`).join('\n')}\n`,
      )
      .send();
  }

  /**
   * The drainage catalogue, if this realm ships one.
   *
   * ⚠⚠ `singleton`, **not** `findByTemplatePath`. The non-creating
   * lookup only finds the catalogue if something else happened to have
   * cloned it first — so on a realm where nobody had yet asked a
   * conduit anything, `analyze water` would have reported "nothing here
   * knows about water" *forever*, and the test for it would have passed
   * because the fixture cloned one by hand. That is the roster-nothing-
   * warms failure this codebase has paid for three times, in a new hat.
   *
   * `singleton` lazily clones from the row the pack ships, so the first
   * caller is the one that makes it exist. A realm with no water pack
   * has no row, `singleton` throws, and the honest "nothing here knows
   * about water" is then TRUE rather than an artifact.
   */
  private async drainage(): Promise<WatercourseCatalogue | null> {
    // ⭐ `singleton` IS the get-or-create: its first act is this exact
    // index read, and it clones only on a miss.
    try {
      return await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH);
    } catch (err) {
      // ⚠ The docblock above is right that "nothing here knows about
      // water" is then TRUE — but the fault still goes to the log, so a
      // missing catalogue and a dry region are not indistinguishable.
      console.error(`AnalyzeWaterController: watercourse catalogue did not resolve`, err);
      return null;
    }
  }
}
