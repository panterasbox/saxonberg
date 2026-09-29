/**
 * `dry` — the act that stopped making anything.
 *
 * ⭐⭐ What it used to do was resolve a recipe, `air-dry`, whose whole
 * content was `cure: { moisture: 0.35 }`: an instant constant with no
 * time, no air and no weather in it. So the same amount of water left a
 * ham in an August wind and in a steamy cellar — a lookup table dressed as
 * physics.
 *
 * What it does now is what hanging a ham actually IS: it puts the cut
 * somewhere the air can reach it, and the drying is the cut's own clock
 * against the air the weather makes. Three things to pin, and none of them
 * is a rate (the rates are the kernel's, in `WaterActivity.test.ts`):
 *
 *   1. the cut ends up **resting on the rack** — which is what makes the
 *      exposure fraction reachable at all, and is exactly what the old act
 *      never did;
 *   2. something with no water state is **refused in words** that name the
 *      property rather than a class;
 *   3. ⚠ the **prospect** is honest: dry air gets a span, saturated air
 *      gets *nothing will dry in this air*, and neither is a number.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DryController, { type DryModel } from '../idea/cmd/crafting/DryController';
import DryingRack from '../thing/DryingRack';
import Fitting from '@saxonberg/server/mud/platform/thing/Fitting';
import Placement from '@saxonberg/server/mud/platform/idea/Placement';
import PlacementCatalogue from '@saxonberg/server/mud/platform/idea/PlacementCatalogue';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { Agent } from '@saxonberg/server/mud/lib/stuff/Agent';
import { AetherMixin } from '@saxonberg/server/mud/lib/message/Aether';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { ContainableMixin } from '@saxonberg/server/mud/lib/spatial/Containable';
import { CommandGiverMixin } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { SensorMixin } from '@saxonberg/server/mud/lib/message/Sensor';
import { NamedMixin } from '@saxonberg/server/mud/lib/description/Named';
import CartesianLocation from '@saxonberg/server/mud/lib/location/CartesianLocation';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
} from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';

class Cook extends AetherMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Agent)))),
  ),
) {
  static _mixinName = 'DryTestCook';
}

let matSeq = 0;
function meat(): Material {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(`dry-test-meat-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setWaterActivity(0.97);
    return m;
  }, `/stuff/idea/material/_test/dry-${matSeq}`) as unknown as Material;
}

function ctx(giver: Stuff, location: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandSource: giver as never,
    commandText: 'dry',
    executionId: 't',
    commandId: 't',
    verb: 'dry',
    command: CommandDefinition.fromYaml(
      'verbs: [dry]\ncontroller: NoopController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function bound(
  stuff: Stuff | null,
  raw = 'x',
  prep?: string,
): DryModel['target'] {
  return { raw, stuff, prep } as unknown as DryModel['target'];
}

let hookSeq = 0;

/**
 * Stand the three shipped `Placement` members up. A member's SECONDARY
 * words are its row's claim, so anything asserting one needs the
 * roster warm — cold, a member answers only to its own name.
 */
async function warmPlacements(): Promise<void> {
  const rows = [
    { name: 'on', prepositions: ['on', 'onto'] },
    { name: 'in', prepositions: ['in', 'into'] },
    { name: 'from', prepositions: ['from', 'on'] },
  ];
  vi.spyOn(Template, 'findByPathInfix').mockResolvedValue(
    rows.map((r) => ({
      path: `/platform/idea/Placement/${r.name}`,
      class: '/platform/idea/Placement',
    })) as unknown as Template[],
  );
  vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(
    Placement as unknown as never,
  );
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
    const row = rows.find((r) => path.endsWith(`/${r.name}`))!;
    const m = makeStuff(() => new Placement());
    m.name = row.name;
    m.prepositions = row.prepositions;
    return m as never;
  });
  const catalogue = makeStuffAtPath(
    () => new PlacementCatalogue(),
    '/platform/idea/PlacementCatalogue',
  );
  await catalogue.warm();
}

describe('`dry` — hang it where the air can reach it', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
  });
  afterEach(() => vi.restoreAllMocks());

  function scene(humidityPct: number, windMs = 2) {
    const room = makeStuff(() => {
      const r = new CartesianLocation();
      r.setHumidity(Quantity.of(humidityPct, '%'));
      r.setWind(Quantity.of(windMs, 'm/s'));
      r.setTemperature(Quantity.of(293, 'K'));
      return r;
    });
    const cook = makeStuff(() => {
      const a = new Cook();
      a.setName('the cook');
      return a;
    });
    const rack = makeStuff(() => {
      const r = new DryingRack();
      r.setMass(Quantity.of(25, 'kg'));
      return r;
    });
    const cut = makeStuff(() => {
      const p = new Provision();
      p.setMass(Quantity.of(2, 'kg'));
      p.setMaterial(meat());
      return p;
    });
    ContainmentApi.move(cook as never, room as never);
    ContainmentApi.move(rack as never, room as never);
    ContainmentApi.move(cut as never, cook as never);
    return { room, cook, rack, cut };
  }

  it('⭐⭐ puts the cut ON the rack — which is what makes exposure reachable', async () => {
    const { room, cook, rack, cut } = scene(40);
    const c = ctx(cook, room);
    await makeStuff(() => new DryController()).execute(
      { target: bound(cut, 'cut'), rack: bound(rack, 'rack') } as DryModel,
      c,
    );
    expect(MixinApi.isContainable(cut) && (cut.getPlacement()?.host ?? null)).toBe(rack);
    // …and `place` moved it into the ROOM, not into the rack — which is
    // exactly why `getPlacement()` is the only thing that tells a racked
    // cut from a dropped one, and why the exposure lives on the support.
    expect(MixinApi.isContainable(cut) && cut.getContainer()).toBe(room);
  });

  it('refuses something with no water state, naming the PROPERTY', async () => {
    const { room, cook, rack } = scene(40);
    const rock = makeStuff(() => {
      const t = new Thing();
      t.setMass(Quantity.of(1, 'kg'));
      return t;
    });
    ContainmentApi.move(rock as never, room as never);
    const c = ctx(cook, room);
    await makeStuff(() => new DryController()).execute(
      { target: bound(rock, 'rock'), rack: bound(rack, 'rack') } as DryModel,
      c,
    );
    const notes = c.getNotes().map((n) => JSON.stringify(n)).join(' ');
    expect(notes).toContain('not-dryable');
    // It was NOT hung up.
    expect(MixinApi.isContainable(rock) && (rock.getPlacement()?.host ?? null)).toBe(null);
  });

  it('⭐ the prospect is words: a span in dry air, a refusal in wet', async () => {
    // Read through a subclass rather than by intercepting the router: the
    // claim is about the SENTENCE, and a message spy would test delivery.
    class Probe extends DryController {
      public prospect(target: Stuff, scope: Stuff): string | null {
        return this.prospectFor(target, scope as never);
      }
    }
    const probe = makeStuff(() => new Probe()) as unknown as Probe;

    const dry = scene(40);
    ContainmentApi.place(dry.cut as never, 'on', dry.rack as never);
    const dryLine = probe.prospect(dry.cut, dry.room);
    expect(dryLine).toMatch(/^In this air it will take about /);
    // ⚠ No figure anywhere in it — the answer is a rate, and a number would
    // read as a promise the weather is free to break.
    expect(dryLine).not.toMatch(/\d/);

    const wet = scene(100, 0);
    ContainmentApi.place(wet.cut as never, 'on', wet.rack as never);
    expect(probe.prospect(wet.cut, wet.room)).toBe(
      'Nothing will dry in this air.',
    );
  });

  it('a wetter room reads as a LONGER wait than a dry one', async () => {
    class Probe extends DryController {
      public prospect(target: Stuff, scope: Stuff): string | null {
        return this.prospectFor(target, scope as never);
      }
    }
    const probe = makeStuff(() => new Probe()) as unknown as Probe;
    // ⚠ Both rooms must be able to reach the `dried` band at all: the band
    // sits at moisture 0.5 and equilibrium moisture IS ambient humidity, so
    // anything at 50 % RH or above honestly answers *nothing will dry here*.
    // That is the ~62 % crossing showing up as a sentence.
    const breezy = scene(30, 6);
    const still = scene(45, 0);
    ContainmentApi.place(breezy.cut as never, 'on', breezy.rack as never);
    ContainmentApi.place(still.cut as never, 'on', still.rack as never);
    const fast = probe.prospect(breezy.cut, breezy.room) ?? '';
    const slow = probe.prospect(still.cut, still.room) ?? '';
    expect(fast).not.toBe(slow);
    // The bands are ordered, so the coarse phrases differ in the right
    // direction without either of them being a figure.
    const order = [
      'a day',
      'a couple of days',
      'a week or so',
      'a fortnight',
      'a month or two',
      'most of a season',
    ];
    const rank = (s: string) => order.findIndex((o) => s.includes(o));
    expect(rank(fast)).toBeLessThan(rank(slow));
  });

  /**
   * ⭐⭐ **The meat hook** — a way of sitting added by an author, with a
   * row and a word, and used by a player who was taught nothing
   * (placement build, W4).
   *
   * The hook is a bare `Fitting` offering one member. Nothing in this
   * controller, in the drying model or in the kernel knows what a hook
   * IS: the member is the row's claim, the exposure is the row's
   * number, and the sentence is the member's word.
   */
  describe('the meat hook — a member added by a row', () => {
    /** A `Fitting` that offers `from` and nothing else, as the row does. */
    function hook(): Fitting {
      return makeStuffAtPath(() => {
        const h = new Fitting();
        h.setPlacements(['from']);
        h.setAirExposure(1);
        h.setMass(Quantity.of(2, 'kg'));
        return h;
      }, `/test/dry-hook-${hookSeq++}`);
    }

    it('⭐ `dry X from hook` hangs it FROM, and the placement says so', async () => {
      const { room, cook, cut } = scene(40);
      const h = hook();
      ContainmentApi.move(h as never, room as never);
      const c = ctx(cook, room);
      await makeStuff(() => new DryController()).execute(
        { target: bound(cut, 'cut'), rack: bound(h, 'hook', 'from') } as DryModel,
        c,
      );
      expect(MixinApi.isContainable(cut) && cut.getPlacement()?.name).toBe(
        'from',
      );
      expect(
        MixinApi.isContainable(cut) && (cut.getPlacement()?.host ?? null),
      ).toBe(h);
      // …and into the ROOM, exactly as the rack does.
      expect(MixinApi.isContainable(cut) && cut.getContainer()).toBe(room);
    });

    it("⭐ `dry X on hook` works too — `from`'s row lists `on` as a secondary", async () => {
      // ⚠ This one needs the roster WARM, and that is the honest
      // answer rather than a gap: `on` reaching a `from`-only host is
      // the ROW's claim, not the engine's. Cold, the member answers
      // only to its own name and the verb refuses — asserted below.
      await warmPlacements();
      const { room, cook, cut } = scene(40);
      const h = hook();
      ContainmentApi.move(h as never, room as never);
      await makeStuff(() => new DryController()).execute(
        { target: bound(cut, 'cut'), rack: bound(h, 'hook', 'on') } as DryModel,
        ctx(cook, room),
      );
      // The player typed `on`; the world hung it FROM. That is how the
      // word gets taught, with no tutorial and no code here knowing.
      expect(MixinApi.isContainable(cut) && cut.getPlacement()?.name).toBe(
        'from',
      );
    });

    it("⚠ COLD, the same command is refused — the secondary word is the ROW's", async () => {
      const { room, cook, cut } = scene(40);
      const h = hook();
      ContainmentApi.move(h as never, room as never);
      const c = ctx(cook, room);
      await makeStuff(() => new DryController()).execute(
        { target: bound(cut, 'cut'), rack: bound(h, 'hook', 'on') } as DryModel,
        c,
      );
      expect(
        c.getNotes().map((n) => JSON.stringify(n)).join(' '),
      ).toContain('wrong-preposition');
    });

    it('⭐ a hung thing is FULLY exposed — the exposure is the row\'s number', async () => {
      class Probe extends DryController {
        public exposure(target: Stuff): number {
          return this.exposureOf(target);
        }
      }
      const probe = makeStuff(() => new Probe()) as unknown as Probe;
      const { room, cook, cut } = scene(40);
      const h = hook();
      ContainmentApi.move(h as never, room as never);
      ContainmentApi.place(cut as never, 'from', h as never);
      expect(probe.exposure(cut)).toBe(1);
    });

    it('the rack is unchanged — `on` still resolves, and still reads `on`', async () => {
      const { room, cook, rack, cut } = scene(40);
      await makeStuff(() => new DryController()).execute(
        { target: bound(cut, 'cut'), rack: bound(rack, 'rack', 'on') } as DryModel,
        ctx(cook, room),
      );
      expect(MixinApi.isContainable(cut) && cut.getPlacement()?.name).toBe('on');
    });

    it('a word the host does not take is refused, naming what it does', async () => {
      const { room, cook, cut } = scene(40);
      const h = hook();
      ContainmentApi.move(h as never, room as never);
      const c = ctx(cook, room);
      await makeStuff(() => new DryController()).execute(
        { target: bound(cut, 'cut'), rack: bound(h, 'hook', 'into') } as DryModel,
        c,
      );
      const notes = c.getNotes().map((n) => JSON.stringify(n)).join(' ');
      expect(notes).toContain('wrong-preposition');
      expect(
        MixinApi.isContainable(cut) && (cut.getPlacement()?.host ?? null),
      ).toBe(null);
    });
  });
});