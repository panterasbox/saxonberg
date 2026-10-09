/**
 * GridReading — `analyze grid [<target>]`, the grid reading.
 *
 * Two readings, and the epoch is DERIVED in both — no "tech level" anywhere:
 *
 *  - **bare** — the premises you stand in: its power band, the feeder node that
 *    meters it, whether that node is live, and the locality's epoch (electric if
 *    its lighting draws from the grid, oil-lit if it burns oil, off-grid if
 *    neither);
 *  - **on a `LineAccess`** (a pole, a manhole) — the trace back up the line to
 *    the source, naming the first cut on the way (the dark stretch's break).
 *
 * ⚠ The stanza is on the platform's shipped `analyze` view; this class is the
 * channel (`analyze ground`/`analyze water` do it the same way). A second
 * `analyze` view here would SHADOW the platform's silently.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import GridCatalogue, { GRID_CATALOGUE_PATH } from '../GridCatalogue';

const TOPIC = 'sense.reading';

/** A line access point, duck-typed (a `LineAccess`). */
interface Liner {
  getNodeRef(): string;
}

function asLiner(target: Stuff): Liner | null {
  const duck = target as unknown as Partial<Liner>;
  return typeof duck.getNodeRef === 'function' ? (duck as Liner) : null;
}

export default class GridReading extends Reading {
  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    if (subject !== null) {
      const liner = asLiner(subject);
      if (liner !== null) {
        await this.reportTrace(giver, liner.getNodeRef(), ctx);
        return;
      }
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(subject)} tells you nothing about the grid.`)
        .send();
      return;
    }
    await this.reportHere(giver);
  }

  /** The premises you stand in, and its locality's derived epoch. */
  private async reportHere(giver: Stuff): Promise<void> {
    const scope = (giver as Stuff & { getContainer?: () => unknown }).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You aren't anywhere to read the grid.`)
        .send();
      return;
    }
    const room = scope as Stuff & Container;
    const roomPath = room.getTemplatePath() ?? '';
    const power = ParcelApi.powerOf(roomPath);
    const epoch = await this.epochOf(room, power.feeder);
    const cat = await this.catalogue();
    const lit =
      power.feeder !== '' && cat !== null
        ? cat.energizedAtSync(power.feeder)
        : false;

    const lines = [`This is a ${epoch} locality.`];
    if (power.band === 'off-grid') {
      lines.push('This premises draws no grid power.');
    } else {
      lines.push(`This premises' power band is ${power.band}.`);
      lines.push(
        power.feeder === ''
          ? 'No feeder line reaches it.'
          : lit
            ? `Its feeder node (${power.feeder}) is live.`
            : `Its feeder node (${power.feeder}) is dark.`,
      );
    }
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${lines.join('\n')}\n`).send();
  }

  /** The trace up the line from a node to the source, naming the first cut. */
  private async reportTrace(
    giver: Stuff,
    nodeRef: string,
    _ctx: CommandContext,
  ): Promise<void> {
    const cat = await this.catalogue();
    if (cat === null || nodeRef === '') {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is no line here to trace.`)
        .send();
      return;
    }
    const trace = await cat.traceFrom(nodeRef);
    const lines: string[] = [];
    if (trace.source === null) {
      lines.push('No line reaches this point — it draws from no source.');
    } else if (trace.firstCut === null) {
      lines.push(`The line runs clear back to its source (${trace.source}).`);
    } else {
      lines.push(`The line is broken at ${trace.firstCut}.`);
      lines.push(`Everything below the break is dark; splice it there to bring it back.`);
    }
    lines.push(`the line: ${[...trace.chain].join(' → ')}`);
    MessageApi.scene(giver).topic(TOPIC).toSelf(Mml.compose`${lines.join('\n')}\n`).send();
  }

  /**
   * ⭐ The locality's epoch, DERIVED from its lighting supply — never a flag:
   * electric if it draws from the grid, oil-lit if it burns oil, off-grid if it
   * lights nothing.
   */
  private async epochOf(
    room: Stuff & Container,
    premisesFeeder: string,
  ): Promise<string> {
    // ⭐ A premises that cites a feeder node IS on the grid — electric —
    // whatever its locality's lighting is (Mayfield Row is addressed outside
    // the city but the main reaches it). Only if nothing reaches the premises
    // does the locality's lighting supply decide: a FuelStore ⇒ oil-lit, else
    // off-grid.
    if (premisesFeeder !== '') return 'electric';
    try {
      const locality = await AddressApi.resolveLocalityFor(room);
      const funding = (
        locality as {
          getPublicLightingFunding?: () => { supply?: string } | null;
        } | null
      )?.getPublicLightingFunding?.();
      const supply = funding?.supply;
      if (supply === GRID_CATALOGUE_PATH) return 'electric';
      // ⭐⭐ `oil-lit`, and the word matters. A `FuelStore` holds LAMP
      // OIL: the town's lamps burn a liquid out of casks, and calling
      // that gas-lit was simply wrong — it named the wrong fuel, the
      // wrong supply chain and the wrong century.
      //
      // ⚠ `gas-lit` is RESERVED. A town is gas-lit when its supply
      // burns a GAS, which the fire build has just made possible (coal
      // gas off a retort, a gasometer to hold it) and which wants a gas
      // main and a `FuelStore` that stores gas — the power-utility
      // slate's. Spending the word on oil now would make the real thing
      // unnameable when it arrives.
      if (typeof supply === 'string' && supply !== '') return 'oil-lit';
      return 'off-grid';
    } catch {
      return 'off-grid';
    }
  }

  private async catalogue(): Promise<GridCatalogue | null> {
    try {
      const cat = (await StuffApi.singleton(GRID_CATALOGUE_PATH)) as unknown as GridCatalogue;
      await cat.ensureCompiled();
      return cat;
    } catch {
      return null;
    }
  }
}
