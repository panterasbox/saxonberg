/**
 * The `maintains` beat — the agency that performs the upkeep a tenure
 * term owes (residences D5).
 *
 * A term is a claim about who is responsible. A claim nobody acts on is
 * set dressing, so the institution's property manager walks their
 * extent and does the work. Three things make that honest, and they are
 * what this pins:
 *
 *   - it acts through the **literal verb**, so everything gating a typed
 *     `maintain` gates the beat (take the kit off Katie and the dorm
 *     weathers — nothing here is a power a player lacks);
 *   - it works only **its own extent** — a property manager does not
 *     wander into somebody else's building;
 *   - it **skips sound shells** and bounds the beat by `batch`, so a big
 *     building is covered over several rounds rather than one thundering
 *     pass.
 *
 * The programmes here are stand-ins named for the class the brain looks
 * up — the brain resolves them through MQL by class NAME, never by
 * import, because the residential programme is a capability pack's class
 * and the kernel does not import packs. A fake with the right name and
 * shape is therefore the exact contract under test.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { brain } from '../maintains';
import { InnerWarren } from '../../location/InnerWarren';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
import Avatar from '../../../platform/agent/Avatar';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import type { Containable } from '../../spatial/Containable';
import type { BrainContext } from '../brain';

const DORMS = '/test/duncan/dorms';
const OTHER = '/test/elsewhere/units';

/**
 * A stand-in programme. The NAME is the contract — `world:[class.
 * HoldingWarren]` matches on it — and so are the three methods.
 */
class HoldingWarren extends InnerWarren {
  public key = '';
  public band = 'sound';
  public entry: Stuff | null = null;
  holdingKey(): string | null {
    return this.key;
  }
  conditionBand(): string {
    return this.band;
  }
  entryRoom(): Stuff | null {
    return this.entry;
  }
  protected async createMember(): Promise<Stuff & Container> {
    throw new Error('unused');
  }
  async admitArrival(): Promise<void> {}
  protected attachmentFor(): never {
    throw new Error('unused');
  }
  protected async reconcile(): Promise<void> {}
  protected async wireHostFixtures(): Promise<void> {}
  protected async unwireHostFixtures(): Promise<void> {}
}

function programme(key: string, band: string): HoldingWarren {
  const p = makeStuff(() => new HoldingWarren());
  p.key = key;
  p.band = band;
  p.entry = makeStuff(() => new SingletonCartesianLocation()) as unknown as Stuff;
  return p;
}

function ctxFor(
  host: Stuff,
  config: Record<string, unknown>,
): BrainContext {
  return {
    host,
    config,
    state: {},
    trigger: { source: 'cadence', raw: 'cadence:17m' },
    say: () => {},
    emote: async () => {},
    emoteFree: () => {},
  } as unknown as BrainContext;
}

let issued: Array<{ actor: Stuff; line: string }>;

/** Just the maintenance lines — never the arrival looks a teleport fires. */
const maintains = (): Array<{ actor: Stuff; line: string }> =>
  issued.filter((c) => c.line === 'maintain');

function keeper(desk: SingletonCartesianLocation): Avatar {
  const k = makeStuffAtPath(() => new Avatar(), '/platform/agent/Avatar/katie');
  ContainmentApi.move(
    k as unknown as Stuff & Containable,
    desk as unknown as Stuff & Container,
  );
  captureCommands(k as unknown as Stuff);
  return k;
}

beforeEach(() => {
  StuffApi.clearAll();
  issued = [];
});

/**
 * Capture a host's runtime-fired commands. Dispatch is
 * `host.forceCommand(line)` since the OO sweep, so the host is the
 * capture seam.
 */
function captureCommands(actor: Stuff): void {
  vi.spyOn(
    actor as unknown as { forceCommand: (line: string) => Promise<void> },
    'forceCommand',
  ).mockImplementation(async (line: string) => {
    issued.push({ actor, line });
  });
}
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the maintains beat', () => {
  it('works the worn holdings in its extent, through the literal verb', async () => {
    programme(`${DORMS}/f1-r1`, 'worn');
    programme(`${DORMS}/f1-r2`, 'shabby');
    const desk = makeStuff(() => new SingletonCartesianLocation());
    const katie = keeper(desk);

    await brain.act(ctxFor(katie as unknown as Stuff, { extent: DORMS }));

    // ⚠ Filter to the ACT. Arriving anywhere issues the look the engine
    // gives every arrival, so the raw command log is never just the
    // beat's own line — asserting on its length would pin the arrival
    // ritual rather than the work.
    expect(maintains()).toHaveLength(2);
    expect(maintains().every((c) => c.actor === (katie as unknown as Stuff))).toBe(
      true,
    );
  });

  it('skips sound shells — a beat that finds nothing to do does nothing', async () => {
    programme(`${DORMS}/f1-r1`, 'sound');
    const desk = makeStuff(() => new SingletonCartesianLocation());
    await brain.act(ctxFor(keeper(desk) as unknown as Stuff, { extent: DORMS }));
    expect(maintains()).toHaveLength(0);
  });

  it('never wanders outside its own extent', async () => {
    programme(`${OTHER}/f1-u1`, 'dilapidated');
    const desk = makeStuff(() => new SingletonCartesianLocation());
    await brain.act(ctxFor(keeper(desk) as unknown as Stuff, { extent: DORMS }));
    expect(maintains()).toHaveLength(0);
  });

  it('bounds the round by `batch`, and comes back to the desk', async () => {
    for (let i = 1; i <= 5; i += 1) programme(`${DORMS}/f1-r${i}`, 'worn');
    const desk = makeStuff(() => new SingletonCartesianLocation());
    const katie = keeper(desk);

    await brain.act(ctxFor(katie as unknown as Stuff, { extent: DORMS, batch: 2 }));

    expect(maintains()).toHaveLength(2);
    // A property manager who ends the beat in somebody's kitchen is a
    // bug a player would report.
    expect((katie as unknown as Containable).getContainer()).toBe(desk);
  });

  it('does nothing at all without an authored extent — a remit is authored, never inferred', async () => {
    programme(`${DORMS}/f1-r1`, 'worn');
    const desk = makeStuff(() => new SingletonCartesianLocation());
    await brain.act(ctxFor(keeper(desk) as unknown as Stuff, {}));
    expect(maintains()).toHaveLength(0);
  });
});
