/**
 * ⭐⭐ Whether a water is FIT is the kit's to say (water-supply D18).
 *
 * `analyze water <supply>` reads a supply's working to anybody — its ends,
 * its head, its pump — but a fouled verdict and the lead in the water print
 * only with the test kit in hand. And the readings' truths: flow over a
 * weir, the stage on a staff, the table down an observation well.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { CommandApi, type CommandContext } from '@saxonberg/server/mud/api/command';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { WeatherApi } from '@saxonberg/server/mud/api/weather';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { SupplyReport } from '@saxonberg/server/mud/lib/supply/SupplyState';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WaterReading from '../idea/reading/WaterReading';
import WaterTableReading from '../idea/reading/WaterTableReading';
import ObservationWell from '../thing/ObservationWell';
import Aquifer from '../idea/Aquifer';

/** A main whose water is fouled and which holds a little lead. */
class FakeMain extends BulkableMixin(Good) {
  async supplyReport(): Promise<SupplyReport> {
    return {
      label: 'the city intake',
      state: 'fouled',
      lines: ['draws from kestrel:confluence', 'NOT delivering: what comes through is not fit to use (fouled)'],
    };
  }
}

/** The reading's protected hook, exposed. */
class OpenWaterReading extends WaterReading {
  public run(ctx: CommandContext, subject: Stuff, kit: (Stuff & Tooled) | null): Promise<void> {
    return this.analyze(ctx, subject, 'expert' as CompetenceBandName, kit, '');
  }
}

let said = '';
function capture(): void {
  said = '';
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: unknown) => {
      said += `${String(body)}\n`;
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

function ctx(): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: makeStuff(() => new Good()) as never,
    interactive: {} as never,
    location: null as never,
    commandText: 'analyze water',
    executionId: 't',
    commandId: 'c',
    verb: 'analyze',
    command: CommandDefinition.fromYaml('verbs: [analyze]\ncontroller: NoopController\ndescription: stub\n', '<test>'),
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  capture();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐ the kit, not the eye, says whether water is fit', () => {
  it('bare: the working is legible, the verdict is not', async () => {
    const main = makeStuff(() => new FakeMain());
    await makeStuff(() => new OpenWaterReading()).run(ctx(), main, null);
    expect(said).toContain('draws from kestrel:confluence');
    expect(said).not.toContain('fouled');
    expect(said).toContain('you cannot tell by looking');
  });

  it('with the kit: the verdict, and what is in the water', async () => {
    const main = makeStuff(() => new FakeMain());
    main.interiorBulk = true;
    main.setBulkPayload('interior', {
      pH: 6.3,
      hardnessDgh: 2,
      dissolvedToxins: [{ type: 'lead', amount: 0.42 }],
    } as never);
    const kit = makeStuff(() => new Good()) as unknown as Stuff & Tooled;
    await makeStuff(() => new OpenWaterReading()).run(ctx(), main, kit);
    expect(said).toContain('(fouled)');
    expect(said).toContain('lead in the water — 0.42 mg a litre');
    expect(said).toContain('pH 6.3 — on the acid side');
  });
});

describe('⭐ the water table — only the observation well reads it', () => {
  it('reads metres from the collar down to the aquifer surface, and falls as it is drawn', async () => {
    vi.spyOn(WorldClockApi, 'getNow').mockReturnValue(Quantity.of(1000, 's'));
    vi.spyOn(WeatherApi, 'precipitationBetween').mockReturnValue({
      liquid: Quantity.of(0, 'mm'),
      frozen: Quantity.of(0, 'mm'),
    } as never);
    const aquifer = makeStuff(() => {
      const a = new Aquifer();
      a.setCapacityM3(1000);
      a.setTableM(178);
      a.setBottomM(160);
      return a;
    });
    vi.spyOn(StuffApi, 'singleton').mockResolvedValue(aquifer as never);
    const well = makeStuff(() => {
      const w = new ObservationWell();
      w.setAquifer('/stuff/idea/Aquifer/test');
      w.setCollarM(180);
      return w;
    });
    const reading = makeStuff(() => new WaterTableReading());
    expect(await reading.truth(well)).toBeCloseTo(2, 9);
    aquifer.recordDraw(500_000, 1000);
    expect(await reading.truth(well)).toBeCloseTo(11, 9);
  });

  it('an observation well with no aquifer reads nothing', async () => {
    const well = makeStuff(() => new ObservationWell());
    expect(await makeStuff(() => new WaterTableReading()).truth(well)).toBeNull();
  });
});
