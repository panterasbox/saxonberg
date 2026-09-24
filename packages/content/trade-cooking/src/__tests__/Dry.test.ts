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
 * is a rate (the rates are the kernel's, in `Cured.test.ts`):
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

function bound(stuff: Stuff | null, raw = 'x'): DryModel['target'] {
  return { raw, stuff } as unknown as DryModel['target'];
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
    expect(MixinApi.isContainable(cut) && cut.getRestingOn()).toBe(rack);
    // …and `placeOn` moved it into the ROOM, not into the rack — which is
    // exactly why `getRestingOn()` is the only thing that tells a racked
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
    expect(MixinApi.isContainable(rock) && rock.getRestingOn()).toBe(null);
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
    ContainmentApi.placeOn(dry.cut as never, dry.rack as never);
    const dryLine = probe.prospect(dry.cut, dry.room);
    expect(dryLine).toMatch(/^In this air it will take about /);
    // ⚠ No figure anywhere in it — the answer is a rate, and a number would
    // read as a promise the weather is free to break.
    expect(dryLine).not.toMatch(/\d/);

    const wet = scene(100, 0);
    ContainmentApi.placeOn(wet.cut as never, wet.rack as never);
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
    ContainmentApi.placeOn(breezy.cut as never, breezy.rack as never);
    ContainmentApi.placeOn(still.cut as never, still.rack as never);
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
});
