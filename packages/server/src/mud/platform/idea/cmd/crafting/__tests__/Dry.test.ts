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
 * is a rate (the rates are the kernel's, in `Moisture.test.ts`):
 *
 *   1. the cut ends up **resting on the rack** — which is what makes the
 *      exposure fraction reachable at all, and is exactly what the old act
 *      never did;
 *   2. something with no water state is **refused in words** that name the
 *      property rather than a class;
 *   3. ⚠ the **prospect** is honest: dry air gets a span, saturated air
 *      gets *nothing will dry in this air*, and neither is a number.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import DryController, { type DryModel } from '../DryController';
import DryRubController, { type DryRubModel } from '../DryRubController';
import Cloth from '../../../../thing/Cloth';
import DryingRack from '../../../../thing/DryingRack';
import Fitting from '../../../../../platform/thing/Fitting';
import { Template } from '../../../../../lib/stuff/Template';
import Good from '../../../../../lib/stuff/Good';
import Provision from '../../../../../platform/thing/Provision';
import Flesh from '../../../material/Flesh';
import { Agent } from '../../../../../lib/stuff/Agent';
import { AetherMixin } from '../../../../../lib/message/Aether';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { NamedMixin } from '../../../../../lib/description/Named';
import Location from '../../../../../lib/location/Location';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { MixinApi } from '../../../../../api/mixin';
import { Quantity } from '../../../../../lib/quantity';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
} from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Placements } from '../../../../../lib/spatial/Placement';

class Cook extends AetherMixin(
  SensorMixin(
    CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Agent)))),
  ),
) {
  static _mixinName = 'DryTestCook';
}

let matSeq = 0;
function meat(): Flesh {
  matSeq += 1;
  return makeStuffAtPath(() => {
    const m = new Flesh();
    m.setName(`dry-test-meat-${matSeq}`);
    m.setSpecificHeat(Quantity.of(3200, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(0.5, 'W/(m·K)'));
    m.setWaterActivity(0.97);
    return m;
  }, `/stuff/idea/material/_test/dry-${matSeq}`) as unknown as Flesh;
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


describe('`dry` — hang it where the air can reach it', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
  });
  afterEach(() => vi.restoreAllMocks());

  function scene(humidityPct: number, windMs = 2) {
    const room = makeStuff(() => {
      const r = new Location();
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
      const t = new Good();
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
    // ⭐ The forecast is the THING's (`Moist.hoursToDry`, W7c); the
    // controller only words the hours it is told.
    class Probe extends DryController {
      public prospect(target: Stuff, _scope: Stuff): string | null {
        return Probe.prospectWords(MixinApi.isMoist(target) ? target.hoursToDry() : null);
      }
    }
    const probe = makeStuff(() => new Probe()) as unknown as Probe;

    const dry = scene(40);
    ContainmentApi.move(dry.cut as never, dry.rack as never, Placements.ON);
    const dryLine = probe.prospect(dry.cut, dry.room);
    expect(dryLine).toMatch(/^In this air it will take about /);
    // ⚠ No figure anywhere in it — the answer is a rate, and a number would
    // read as a promise the weather is free to break.
    expect(dryLine).not.toMatch(/\d/);

    const wet = scene(100, 0);
    ContainmentApi.move(wet.cut as never, wet.rack as never, Placements.ON);
    expect(probe.prospect(wet.cut, wet.room)).toBe('Nothing will dry here.');
  });

  it('a wetter room reads as a LONGER wait than a dry one', async () => {
    // ⭐ The forecast is the THING's (`Moist.hoursToDry`, W7c); the
    // controller only words the hours it is told.
    class Probe extends DryController {
      public prospect(target: Stuff, _scope: Stuff): string | null {
        return Probe.prospectWords(MixinApi.isMoist(target) ? target.hoursToDry() : null);
      }
    }
    const probe = makeStuff(() => new Probe()) as unknown as Probe;
    // ⚠ Both rooms must be able to reach the `dried` band at all: the band
    // sits at moisture 0.5 and equilibrium moisture IS ambient humidity, so
    // anything at 50 % RH or above honestly answers *nothing will dry here*.
    // That is the ~62 % crossing showing up as a sentence.
    const breezy = scene(30, 6);
    const still = scene(45, 0);
    ContainmentApi.move(breezy.cut as never, breezy.rack as never, Placements.ON);
    ContainmentApi.move(still.cut as never, still.rack as never, Placements.ON);
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
        h.setPlacements([Placements.FROM]);
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
        Placements.FROM,
      );
      expect(
        MixinApi.isContainable(cut) && (cut.getPlacement()?.host ?? null),
      ).toBe(h);
      // …and into the ROOM, exactly as the rack does.
      expect(MixinApi.isContainable(cut) && cut.getContainer()).toBe(room);
    });

    it("⭐ `dry X on hook` works too — `from`'s row lists `on` as a secondary", async () => {
      // `on` reaching a `from`-only host is the DOCUMENT's claim, not the
      // engine's: `from`'s placement lists `on` as a secondary word.
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
        Placements.FROM,
      );
    });

    it('⭐ a hung thing is FULLY exposed — the exposure is the row\'s number', async () => {
      // ⭐ The exposure is the SUPPORT's own claim (`Moisture`'s exposure
      // read, W7c — the controller no longer computes it): hung from the
      // hook, the thing sits on the hook, and the hook says 1.
      const { room, cut } = scene(40);
      const h = hook();
      ContainmentApi.move(h as never, room as never);
      ContainmentApi.move(cut as never, h as never, Placements.FROM);
      const support = MixinApi.isContainable(cut) ? (cut.getPlacement()?.host ?? null) : null;
      expect(support).toBe(h);
      expect(h.getAirExposure()).toBe(1);
    });

    it('the rack is unchanged — `on` still resolves, and still reads `on`', async () => {
      const { room, cook, rack, cut } = scene(40);
      await makeStuff(() => new DryController()).execute(
        { target: bound(cut, 'cut'), rack: bound(rack, 'rack', 'on') } as DryModel,
        ctx(cook, room),
      );
      expect(MixinApi.isContainable(cut) && cut.getPlacement()?.name).toBe(Placements.ON);
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

describe('`dry <thing> with <cloth>` — the second shape, its own controller (W7c)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    installV1QuantityMarshallers();
  });
  afterEach(() => vi.restoreAllMocks());

  function rubScene() {
    const room = makeStuff(() => new Location());
    const cook = makeStuff(() => {
      const a = new Cook();
      a.setName('the cook');
      return a;
    });
    const towel = makeStuff(() => {
      const c = new Cloth();
      c.setMass(Quantity.of(0.5, 'kg'));
      return c;
    });
    const thing = makeStuff(() => {
      const g = new Good();
      g.setMass(Quantity.of(0.5, 'kg'));
      return g;
    });
    ContainmentApi.move(cook as never, room as never);
    ContainmentApi.move(towel as never, cook as never);
    ContainmentApi.move(thing as never, cook as never);
    return { room, cook, towel, thing };
  }

  it('a dry thing is refused — there is no water in it to take out', async () => {
    const { room, cook, towel, thing } = rubScene();
    const c = ctx(cook, room);
    await makeStuff(() => new DryRubController()).execute(
      { target: bound(thing, 'thing'), cloth: bound(towel, 'towel') } as DryRubModel,
      c,
    );
    expect(c.getNotes().map((n) => JSON.stringify(n)).join(' ')).toContain('not-dryable');
  });

  it('a wet thing rubbed with a towel gives its water to the towel', async () => {
    const { room, cook, towel, thing } = rubScene();
    if (!MixinApi.isWet(thing) || !MixinApi.isWet(towel)) throw new Error('both should take water');
    thing.wet(0.9);
    const before = thing.getWetness();
    const c = ctx(cook, room);
    await makeStuff(() => new DryRubController()).execute(
      { target: bound(thing, 'thing'), cloth: bound(towel, 'towel') } as DryRubModel,
      c,
    );
    expect(c.getNotes().filter((n) => n.kind === 'controller-rejected').map((n) => JSON.stringify(n))).toEqual([]);
    expect(thing.getWetness()).toBeLessThan(before);
    expect(towel.getWetness()).toBeGreaterThan(0);
  });
});
