/**
 * ⭐⭐ `rinse` — stopping the wound that is still happening.
 *
 * A caustic is the one injury in the game that keeps working after it
 * lands. Everything else in the trauma table is a record of something
 * that already finished, so every other treatment is *applied*; this one
 * is the **removal of a cause**, with a clock on it.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RinseController from '../RinseController';
import { Creature } from '../../../../../lib/creature/Creature';
import Location from '../../../../../lib/stuff/Location';
import Material from '../../../../../lib/material/Material';
import Receptacle from '../../../../thing/Receptacle';
import { ContainmentApi } from '../../../../../api/containment';
import { Quantity } from '../../../../../lib/quantity';
import { makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
import { MessageApi } from '../../../../../api/message';
import { Mml } from '../../../../../api/mml';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR } from '../../../Condition';
import type { Trauma } from '../../../Condition';

let captured: string;
let note: ReturnType<typeof vi.fn>;

function captureBody(): void {
  captured = '';
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body.toString();
      return b;
    };
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

const ctxFor = (actor: unknown): CommandContext =>
  ({ commandGiver: actor, location: null, note } as unknown as CommandContext);

const patientArg = (stuff: unknown): { patient: MqlOneResult } => ({
  patient: { stuff, raw: 'them' } as unknown as MqlOneResult,
});

const WATER = '/stuff/idea/material/_test/rinse-water';

/** A material tagged `water`, which is all `findWater` reads. */
function ensureWater(): Material {
  return (
    StuffApi.findByTemplatePath<Material>(WATER) ??
    (makeStuffAtPath(() => {
      const m = new Material();
      m.setName('water');
      m.setTags(['water', 'liquid']);
      return m;
    }, WATER) as unknown as Material)
  );
}

/**
 * A litre of water in a plain `Receptacle`. ⚠ Not a `CraftVessel`:
 * `findWater` skips crafted holders (you do not wash a glass in a glass),
 * and a first draft of this fixture used one and could not find its own
 * water.
 */
function waterJug(): Receptacle {
  const jug = makeStuff(() => new Receptacle());
  (jug as unknown as { interiorBulk: boolean }).interiorBulk = true;
  (jug as unknown as { interiorMaterial: string }).interiorMaterial = WATER;
  jug.setInteriorCapacity(Quantity.of(2, 'L'));
  jug.setInteriorAmount(Quantity.of(1, 'L'));
  return jug;
}

/** A body standing in a room with a jug of water in it. */
function atWater(): Creature {
  ensureWater();
  const room = makeStuff(() => new Location());
  const jug = waterJug();
  ContainmentApi.move(jug, room);
  const c = makeStuff(() => new Creature());
  ContainmentApi.move(c, room);
  return c;
}

/** A body in a dry room. */
function dry(): Creature {
  const room = makeStuff(() => new Location());
  const c = makeStuff(() => new Creature());
  ContainmentApi.move(c, room);
  return c;
}

function causticOn(c: Creature, severity = 1): Trauma {
  const t: Trauma = {
    kind: 'trauma',
    type: 'caustic',
    site: 'body.leg.left.foot',
    severity,
  };
  c.afflict(t);
  TRAUMA_BEHAVIOR.caustic.onset(c, t);
  return t;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  note = vi.fn();
  WorldClockApi._setNowProviderForTesting(() => 100);
  captureBody();
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('the caustic keeps working until it is rinsed', () => {
  it('⭐⭐ onset arms the agent, and ticking makes it WORSE', () => {
    // The claim that makes this wound different in kind. Every other
    // `tick` in the table heals or bleeds; this one grows.
    const c = makeStuff(() => new Creature());
    const burn = causticOn(c, 1);
    expect(burn.agentActive).toBe(true);

    TRAUMA_BEHAVIOR.caustic.tick(c, burn, 60);
    expect(burn.severity).toBeGreaterThan(1);
  });

  it('⭐ …and it is CAPPED — the rinse is a decision, not a formality', () => {
    // Unbounded growth would make an unrinsed caustic lethal on a clock
    // nobody can read, which is punishment without information.
    const c = makeStuff(() => new Creature());
    const burn = causticOn(c, 1);
    TRAUMA_BEHAVIOR.caustic.tick(c, burn, 100_000);
    expect(burn.severity).toBe(HARM_DEFAULTS.CAUSTIC_MAX_SEVERITY);
  });

  it('⭐⭐ rinsing STOPS it — and does not heal it', () => {
    const c = makeStuff(() => new Creature());
    const burn = causticOn(c, 2);
    TRAUMA_BEHAVIOR.caustic.resolve(c, burn);
    expect(burn.agentActive).toBe(false);
    // Still a real burn at the severity it reached…
    expect(burn.severity).toBe(2);
    // …and now it decays like one, instead of growing.
    TRAUMA_BEHAVIOR.caustic.tick(c, burn, 60);
    expect(burn.severity).toBeLessThan(2);
  });
});

describe('RinseController', () => {
  it('⭐⭐ needs WATER in reach — and says so before anything else', async () => {
    // The first cut of this controller said "you sluice the water over
    // it" while looking for none, so a carried jug let you wash a glass
    // and not rinse your own foot. The refusal comes FIRST because it is
    // the one a player can act on: go and find water.
    const me = dry();
    const burn = causticOn(me, 1);
    await makeStuff(() => new RinseController()).execute({}, ctxFor(me));
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'no-water' }),
    );
    // …and the agent is still eating.
    expect(burn.agentActive).toBe(true);
  });

  it('⭐ a CARRIED jug is water in reach, exactly as it is for `wash`', async () => {
    ensureWater();
    const room = makeStuff(() => new Location());
    const me = makeStuff(() => new Creature());
    ContainmentApi.move(me, room);
    const jug = waterJug();
    ContainmentApi.move(jug, me);
    const burn = causticOn(me, 1);
    await makeStuff(() => new RinseController()).execute({}, ctxFor(me));
    expect(burn.agentActive).toBe(false);
  });

  it('rinses every active caustic on a self-target', async () => {
    const me = atWater();
    const a = causticOn(me, 1);
    const b = causticOn(me, 2);
    await makeStuff(() => new RinseController()).execute({}, ctxFor(me));
    expect(a.agentActive).toBe(false);
    expect(b.agentActive).toBe(false);
    expect(captured).toContain('stopped getting worse');
  });

  it('rinses somebody else', async () => {
    const me = atWater();
    const them = makeStuff(() => new Creature());
    ContainmentApi.move(them, me.getContainer()!);
    const burn = causticOn(them, 1);
    await makeStuff(() => new RinseController()).execute(
      patientArg(them),
      ctxFor(me),
    );
    expect(burn.agentActive).toBe(false);
  });

  it('⚠ refuses a body with nothing water would help — with a REASON', async () => {
    const me = atWater();
    me.afflict({
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 1,
      bleeding: true,
    });
    await makeStuff(() => new RinseController()).execute({}, ctxFor(me));
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'nothing-to-rinse' }),
    );
  });

  it('⚠ a caustic already rinsed is not re-rinsed', async () => {
    // `agentActive` is the gate, so a body carrying a stopped caustic
    // reads as having nothing water would help — which is true.
    const me = atWater();
    const burn = causticOn(me, 1);
    TRAUMA_BEHAVIOR.caustic.resolve(me, burn);
    await makeStuff(() => new RinseController()).execute({}, ctxFor(me));
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'nothing-to-rinse' }),
    );
  });
});
