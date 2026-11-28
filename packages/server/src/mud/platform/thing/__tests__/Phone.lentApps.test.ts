/**
 * An app's verbs reach whoever bears its device (stream arrival C1, D16).
 *
 * A fixture app class declares one verb in `self`; installed on a phone,
 * the verb lands on the BEARER's recency stack with the app as its source,
 * kept exact on every move: in a pocket, in a bag at any depth, dropped,
 * picked up by somebody else, handed over, uninstalled, carried to another
 * place. A device that will not run (off, dead, packed, not yours) still
 * lends the verb — and the dispatcher refuses with the device's row, or
 * passes over to another offer of the same verb.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handsSpecies, wornBag, Body } from '../../../lib/slot/__tests__/carrying-fixture';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { AetherMixin } from '../../../lib/message/Aether';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, stampTemplatePathForTest } from '../../../lib/security/__tests__/test-setup';
import Location from '../../../lib/place/Location';
import Phone from '../Phone';
import App from '../../idea/App';
import Thing from '../Thing';
import { CommandApi } from '../../../api/command';
import { CommandLineApi } from '../../../api/command-line';
import { TestHarnessApi } from '../../../api/test-harness';
import { WorldClockApi } from '../../../api/worldclock';
import type { CommandContributions } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';

/** A carrying body that gives commands — a player's shape. */
class Bearer extends AetherMixin(CommandGiverMixin(Body)) {}

/** An app that brings one verb (the rename's view, for a real definition). */
class VerbApp extends App {
  static commandContributions: CommandContributions = {
    self: ['platform/cmd/stream/rodney.yaml'],
    peers: [],
    environment: [],
  };
}

/** A thing in a room offering the same verb — "the desk". */
class Desk extends Thing {
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/stream/rodney.yaml'],
    environment: [],
  };
}

const VERB_APP = '/test/idea/app/verbs';

let bearers = 0;
function bearer(): { me: Bearer; plan: string } {
  const { species, plan } = handsSpecies();
  const me = makeStuff(() => new Bearer());
  stampTemplatePathForTest(me, `/platform/agent/Avatar/lent-${++bearers}`);
  me.setSpecies(species);
  return { me, plan };
}

function phone(): Phone {
  const p = makeStuff(() => new Phone());
  p.standbyW = 0.1;
  p.acceptW = 10;
  p.setCapacityWh(12);
  p.setOn(true);
  p.setShortDescription('phone');
  p.setKeywords(['phone']);
  return p;
}

/** The sources lending `rodney` to `who`. */
function rodneySources(who: Bearer): unknown[] {
  return who
    .getAffordances()
    .filter((a) => a.command.verbs.includes('rodney'))
    .map((a) => a.source);
}

describe('an app on a device lends its verbs to the bearer (D16)', () => {
  let room: Location;
  let other: Location;
  beforeEach(() => {
    room = makeStuff(() => new Location());
    other = makeStuff(() => new Location());
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const a = makeStuff(() => (path === VERB_APP ? new VerbApp() : new App()));
      stampTemplatePathForTest(a, path);
      return a;
    }) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  async function pocketedPhone(): Promise<{ me: Bearer; plan: string; p: Phone; app: Stuff }> {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    const bag = wornBag(me as unknown as Body, plan, 'satchel', 'torso');
    ContainmentApi.move(p, bag);
    const app = await p.installApp(VERB_APP);
    return { me, plan, p, app };
  }

  it('installed on a phone in a bag the bearer wears: the bearer has the verb, sourced to the app', async () => {
    const { me, app } = await pocketedPhone();
    expect(rodneySources(me)).toEqual([app]);
  });

  it('installed BEFORE it is picked up: the move lends the verb', async () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    ContainmentApi.move(p, room);
    const app = await p.installApp(VERB_APP);
    expect(rodneySources(me)).toEqual([]);
    const bag = wornBag(me as unknown as Body, plan, 'satchel', 'torso');
    ContainmentApi.move(p, bag);
    expect(rodneySources(me)).toEqual([app]);
  });

  it('dropped: gone from the bearer and not lent to the room', async () => {
    const { me, p } = await pocketedPhone();
    ContainmentApi.move(p, room);
    expect(rodneySources(me)).toEqual([]);
  });

  it('handed to somebody else: theirs, not the first bearer\'s', async () => {
    const { me, p, app } = await pocketedPhone();
    const { me: them, plan } = bearer();
    ContainmentApi.move(them, room);
    const bag = wornBag(them as unknown as Body, plan, 'satchel', 'torso');
    ContainmentApi.move(p, bag);
    expect(rodneySources(me)).toEqual([]);
    expect(rodneySources(them)).toEqual([app]);
  });

  it('the bearer walks to another place: kept', async () => {
    const { me, app } = await pocketedPhone();
    ContainmentApi.move(me, other);
    expect(rodneySources(me)).toEqual([app]);
  });

  it('uninstalled: gone', async () => {
    const { me, p } = await pocketedPhone();
    expect(p.uninstallApp('verbs')).toBe(true);
    expect(rodneySources(me)).toEqual([]);
  });

  it('an app on the PERSON is untouched (served as its own self)', async () => {
    const { me } = bearer();
    ContainmentApi.move(me, room);
    expect(rodneySources(me)).toEqual([]);
  });
});

describe('the match: a device that will not run (held, never silent)', () => {
  let room: Location;
  beforeEach(() => {
    room = makeStuff(() => new Location());
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const a = makeStuff(() => (path === VERB_APP ? new VerbApp() : new App()));
      stampTemplatePathForTest(a, path);
      return a;
    }) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  /** Run the match for `line` as `me` — the controller never runs. */
  async function run(me: Bearer, line: string): Promise<{ refused?: string; ran: unknown[] }> {
    const ran: unknown[] = [];
    const giver = me as unknown as {
      _executeOne(...a: unknown[]): Promise<void>;
      _runChain(p: unknown, o: unknown): Promise<ReturnType<typeof CommandApi.createCommandContext>>;
    };
    vi.spyOn(giver, '_executeOne').mockImplementation(async (...a: unknown[]) => {
      ran.push((a[1] as { commandSource?: unknown } | undefined)?.commandSource ?? a);
    });
    const parsed = CommandLineApi.parsePipeline(line).commands[0]!;
    const outer = CommandApi.createCommandContext({
      commandGiver: me as never,
      location: room as never,
      commandText: line,
      executionId: 'test',
      commandId: 'test',
      verb: parsed.verb,
      command: me.getAffordances()[0]!.command,
    });
    const ctx = await TestHarnessApi.actAs(me as never, () => giver._runChain(parsed, outer));
    const refused = ctx.getNotes().find((n) => n.kind === 'refused') as { reason?: string } | undefined;
    return refused?.reason ? { refused: refused.reason, ran } : { ran };
  }

  it('switched off: the verb stays, and typing it is refused with the phone\'s row', async () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    ContainmentApi.move(p, wornBag(me as unknown as Body, plan, 'satchel', 'torso'));
    await p.installApp(VERB_APP);
    p.setOn(false);
    WorldClockApi.advance('1 second');
    expect(rodneySources(me)).toHaveLength(1);
    const r = await run(me, 'rodney back');
    expect(r.refused).toBe('aether-off');
    expect(r.ran).toEqual([]);
  });

  it('with a second source in reach — a desk in the room — that source takes the verb', async () => {
    const { me, plan } = bearer();
    const desk = makeStuff(() => new Desk());
    ContainmentApi.move(desk, room);
    ContainmentApi.move(me, room);
    const p = phone();
    ContainmentApi.move(p, wornBag(me as unknown as Body, plan, 'satchel', 'torso'));
    await p.installApp(VERB_APP);
    p.setOn(false);
    WorldClockApi.advance('1 second');
    expect(rodneySources(me)).toHaveLength(2);
    const r = await run(me, 'rodney back');
    expect(r.refused).toBeUndefined();
  });
});
