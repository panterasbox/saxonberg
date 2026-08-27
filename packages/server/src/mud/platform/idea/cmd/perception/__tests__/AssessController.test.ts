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

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AssessController from '../AssessController';
import { Creature } from '../../../../../lib/creature/Creature';
import { MessageApi } from '../../../../../api/message';
import { Mml } from '../../../../../api/mml';
import { StuffApi } from '../../../../../api/stuff';
import { WorldClockApi } from '../../../../../api/worldclock';
import { PersistenceManager } from '../../../../../../backend/PersistenceManager';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import type { Trauma } from '../../../Condition';
import Condition from '../../../Condition';

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
    stampTemplatePathForTest(me, '/platform/agent/Avatar/self');
    me.afflict(footWound());
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('severity');
    expect(captured.toLowerCase()).toContain('bleeding');
  });

  it('a low-competence other reads no precise severity', async () => {
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/platform/agent/Avatar/viewer');
    const them = makeStuff(() => new Creature());
    stampTemplatePathForTest(them, '/platform/agent/Avatar/patient');
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
    stampTemplatePathForTest(me, '/platform/agent/Avatar/self');
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
    stampTemplatePathForTest(me, '/platform/agent/Avatar/patient2');

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

describe('AssessController — the affliction readout', () => {
  /** An authored Condition, live at its template path. */
  function condition(path: string, name: string, signs: string[]): void {
    const c = makeStuff(() => new Condition());
    c.setName(name);
    c.setObservableSigns(signs);
    stampTemplatePathForTest(c, path);
  }

  const RECOVERING = '/platform/idea/Condition/mortality/recovering';

  it('shows an affliction that is not a wound at all', async () => {
    // The gap this closes: the floor route's diminishment lives on the
    // body as an `affliction`, and `assess` used to render only trauma —
    // so a freshly re-embodied player read as "unhurt" and the price of
    // dying was invisible to the person who had just paid it.
    condition(RECOVERING, 'recovering', ['unsteady', 'hollow']);
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/platform/agent/Avatar/revived');
    me.afflict({
      kind: 'affliction',
      templatePath: RECOVERING,
      stage: 0,
      elapsed: 0,
    });

    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured.toLowerCase()).toContain('recovering');
    // Still reports the wound line honestly — an affliction is not a wound.
    expect(captured).toContain('No visible wounds.');
  });

  it('an untrained looker sees the SIGN, not the diagnosis', async () => {
    // Competence buys information: naming the condition is a diagnosis.
    condition(RECOVERING, 'recovering', ['unsteady', 'hollow']);
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/platform/agent/Avatar/looker');
    const them = makeStuff(() => new Creature());
    stampTemplatePathForTest(them, '/platform/agent/Avatar/patient3');
    them.afflict({
      kind: 'affliction',
      templatePath: RECOVERING,
      stage: 0,
      elapsed: 0,
    });

    await makeStuff(() => new AssessController()).execute(
      targetArg(them),
      ctxFor(me, null)
    );
    expect(captured.toLowerCase()).toContain('unsteady');
    expect(captured.toLowerCase()).not.toContain('recovering');
  });

  it('degrades to the path leaf when the Condition Idea is not live', async () => {
    // Today this is the ONLY path that runs in the real world: condition
    // seeds are inserted as template rows and nothing clones them into
    // Ideas, so `findByTemplatePath` answers null for every condition.
    // The readout must still say something, and must never leak a raw
    // template path into player-facing prose.
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/platform/agent/Avatar/orphan');
    me.afflict({
      kind: 'affliction',
      templatePath: '/platform/idea/Condition/mortality/recovering',
      stage: 0,
      elapsed: 0,
    });

    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured.toLowerCase()).toContain('recovering');
    expect(captured).not.toContain('/platform/idea/Condition/mortality');
    expect(captured).toContain('No visible wounds.');
  });

  it('the leaf fallback still withholds the diagnosis from the untrained', async () => {
    // A leaf IS the condition's name, so handing it to a novice would
    // route around the competence rule the resolved path obeys.
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/platform/agent/Avatar/looker2');
    const them = makeStuff(() => new Creature());
    stampTemplatePathForTest(them, '/platform/agent/Avatar/patient4');
    them.afflict({
      kind: 'affliction',
      templatePath: '/platform/idea/Condition/mortality/recovering',
      stage: 0,
      elapsed: 0,
    });

    await makeStuff(() => new AssessController()).execute(
      targetArg(them),
      ctxFor(me, null)
    );
    expect(captured.toLowerCase()).toContain('unwell');
    expect(captured.toLowerCase()).not.toContain('recovering');
  });
});
