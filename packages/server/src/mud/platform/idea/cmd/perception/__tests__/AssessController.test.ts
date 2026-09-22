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
import { AppApi } from '../../../../../api/app';
import BodyPlan from '../../../species/BodyPlan';
import Species from '../../../species/Species';

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
  vi.spyOn(AppApi, 'setting').mockReturnValue('');
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

describe('AssessController — the weight in words (nutrition-and-fitness W3)', () => {
  const bodyOf = (stature: number, kg: number, path: string): Creature => {
    const c = makeStuff(() => new Creature());
    stampTemplatePathForTest(c, path);
    // The controller reads the species for the vital profile and the
    // body plan too; only the stature is what this block needs.
    vi.spyOn(c, 'bodyMassIndex').mockReturnValue(kg / (stature * stature));
    return c;
  };

  it('self sees the band in words, and no digits anywhere in it', async () => {
    const me = bodyOf(1.75, 95, '/platform/agent/Avatar/heavy');
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('You are heavily overweight.');
    expect(captured).not.toMatch(/\d/);
  });

  it('an untrained looker gets no weight line on another body', async () => {
    const me = makeStuff(() => new Creature());
    stampTemplatePathForTest(me, '/platform/agent/Avatar/looker');
    const them = bodyOf(1.75, 95, '/platform/agent/Avatar/heavy2');
    await makeStuff(() => new AssessController()).execute(targetArg(them), ctxFor(me, null));
    expect(captured).not.toContain('overweight');
    expect(captured).not.toContain('healthy weight');
  });

  it('a healthy frame reads healthy', async () => {
    const me = bodyOf(1.75, 70, '/platform/agent/Avatar/fine');
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('of a healthy weight');
  });
});

/* ────── the injury build: interiority + the anatomy block ────── */

/**
 * A body with a torso, a liver under it, and a left hand — enough to show
 * an interior wound, a function band and a covering stack.
 */
function anatomical(path: string): Creature {
  const plan = makeStuff(() => new BodyPlan());
  plan.setName('assess-biped');
  plan.setBodyParts([
    {
      key: 'body.torso',
      parent: null,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 20 }],
    },
    {
      key: 'body.torso.liver',
      parent: 'body.torso',
      governs: ['clearance'],
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/flesh', mass: 1.5 }],
    },
    {
      key: 'body.arm.left.hand',
      parent: 'body.torso',
      serves: ['manipulation'],
      severable: true,
      tissues: [{ tissuePath: '/stuff/idea/material/tissue/bone', mass: 0.4 }],
    },
  ]);
  stampTemplatePathForTest(plan, `/stuff/idea/species/BodyPlan/assess-${path}`);
  const species = makeStuff(() => new Species());
  species.setBodyPlan(plan);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/assess-${path}`);
  const c = makeStuff(() => new Creature());
  c.setSpecies(species);
  stampTemplatePathForTest(c, `/platform/agent/Avatar/${path}`);
  return c;
}

const liverWound = (): Trauma => ({
  kind: 'trauma',
  type: 'rupture',
  site: 'body.torso.liver',
  severity: 2,
  bleeding: true,
});

describe('AssessController — an interior wound (D10)', () => {
  it('⭐⭐ SELF is told something is wrong and NOT what', async () => {
    // The asymmetry the build wants: you know less about your own body
    // than a competent stranger does.
    const me = anatomical('self-interior');
    me.afflict(liverWound());
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('Something is wrong inside');
    // ⚠ The WOUND is unnamed; the PART is still listed, because knowing
    // you have a liver is not a diagnosis. What must not appear is what
    // is wrong with it.
    expect(captured).not.toContain('rupture');
    expect(captured).not.toContain('torso liver — ');
  });

  it('⚠ an untrained OTHER sees no sign of it at all', async () => {
    const me = anatomical('viewer-interior');
    const them = anatomical('patient-interior');
    them.afflict(liverWound());
    await makeStuff(() => new AssessController()).execute(
      targetArg(them),
      ctxFor(me, null),
    );
    expect(captured).not.toContain('liver');
    // …and it does not lie by claiming they are unwounded.
    expect(captured).toContain('cannot read');
  });
});

describe('AssessController — the anatomy block (D12)', () => {
  it('lists parts with their function band', async () => {
    const me = anatomical('self-anatomy');
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('Your body:');
    expect(captured).toContain('arm left hand');
    expect(captured).toContain('full');
  });

  it('⭐ a MISSING part says gone, not a band', async () => {
    // "left hand — lost" reads as an injury; the hand is not there.
    const me = anatomical('self-missing');
    me.severPart('body.arm.left.hand');
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('arm left hand — gone');
  });

  it('⭐⭐ SELF sees its organs LISTED but not BANDED — the drive found this', async () => {
    // An untrained self-assess showed ten exterior parts and no brain,
    // spine or liver, because naming an interior part was gated on
    // medicine competence. "Do I have a liver" is not a diagnosis. What
    // stays gated is the BAND: `liver — failing` is exactly the
    // diagnosis D10 says you cannot make about yourself.
    const me = anatomical('self-organs');
    await makeStuff(() => new AssessController()).execute({}, ctxFor(me, null));
    expect(captured).toContain('torso liver');
    expect(captured).not.toContain('torso liver — ');
  });

  it('⚠ an untrained reader is not shown the INTERIOR parts', async () => {
    const me = anatomical('viewer-anatomy');
    const them = anatomical('patient-anatomy');
    await makeStuff(() => new AssessController()).execute(
      targetArg(them),
      ctxFor(me, null),
    );
    expect(captured).toContain('Their body:');
    expect(captured).not.toContain('liver');
  });
});
