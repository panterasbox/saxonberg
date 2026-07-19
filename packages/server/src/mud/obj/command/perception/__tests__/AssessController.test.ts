/**
 * AssessController — the perception-gated condition readout.
 *
 * Covers the self-vs-other fidelity split (self reads precise severity; a
 * low-competence other reads only the qualitative state + band) and the
 * dressed-vs-undressed readout difference (a dressed wound reads
 * "controlled" and hides severity; an open one reads "bleeding").
 *
 * Mongo is faked so `bandFor` runs; the emitted scene body is captured.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AssessController from '../AssessController';
import { Creature } from '../../../../lib/creature/Creature';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { StuffApi } from '../../../../api/stuff';
import { WorldClockApi } from '../../../../api/worldclock';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Trauma } from '../../../../lib/vitals/Condition';

let captured: string;
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

function fakeMongo(): void {
  const pm = PersistenceManager.get();
  vi.spyOn(pm, 'isConnected').mockReturnValue(true);
  vi.spyOn(pm, 'find').mockResolvedValue([] as never);
  vi.spyOn(pm, 'save').mockResolvedValue('id-0' as never);
}

function ctxFor(actor: unknown, location: unknown): CommandContext {
  return {
    commandGiver: actor,
    location,
    note: vi.fn(),
  } as unknown as CommandContext;
}

function targetArg(stuff: unknown): { target: MqlOneResult } {
  return { target: { stuff, raw: 'them' } as unknown as MqlOneResult };
}

const footWound = (dressed = false): Trauma => ({
  kind: 'trauma',
  type: 'laceration',
  site: 'body.leg.left.foot',
  severity: 1.5,
  bleeding: !dressed,
  dressed,
});

beforeEach(() => {
  installV1QuantityMarshallers();
  fakeMongo();
  WorldClockApi._setNowProviderForTesting(() => 100);
  captureBody();
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('AssessController — self vs other fidelity', () => {
  it('self reads precise severity', async () => {
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/obj/Avatar/self');
    me.afflict(footWound());
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('severity');
    expect(captured.toLowerCase()).toContain('bleeding');
  });

  it('a low-competence other reads no precise severity', async () => {
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/obj/Avatar/viewer');
    const them = makeStuff(() => new Creature());
    stampTemplatePathForTest(them, '/obj/Avatar/patient');
    them.afflict(footWound());
    await makeStuff(() => new AssessController()).execute(
      targetArg(them),
      ctxFor(me, null)
    );
    expect(captured).not.toContain('severity'); // untrained → gated
    expect(captured.toLowerCase()).toContain('bleeding'); // qualitative gist
  });

  it('self-assess conjugates for the second person ("You look", not "You looks")', async () => {
    // Grammar regression: BAND_PHRASE is third-person singular ("looks
    // unhurt"), which disagrees with the self subject "You" — a live run
    // rendered "You looks hurt". Self reads use the second-person phrase.
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/obj/Avatar/self');
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    // (the subject "You" carries <strong> markup, so it isn't adjacent to
    // the verb in the raw string — assert on the phrase + absence of "looks")
    expect(captured).toContain('look unhurt');
    expect(captured).not.toContain('looks');
  });
});

describe('AssessController — dressed vs open readout', () => {
  it('a dressed wound reads controlled; an open one reads bleeding', async () => {
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/obj/Avatar/patient2');

    me.afflict(footWound(true)); // dressed
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    const dressedReadout = captured.toLowerCase();
    expect(dressedReadout).toContain('controlled');
    expect(dressedReadout).not.toContain('bleeding laceration');

    // Re-open it and re-assess.
    const w = me.getConditions()[0] as Trauma;
    w.dressed = false;
    w.bleeding = true;
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured.toLowerCase()).toContain('bleeding');
  });
});
