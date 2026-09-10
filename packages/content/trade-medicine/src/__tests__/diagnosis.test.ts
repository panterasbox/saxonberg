/**
 * ⭐⭐ The diagnostic ladder — **competence buys INFORMATION, never
 * outcomes.**
 *
 * The whole claim of the medical trade sits in one controller and one
 * monotone staircase: an untrained eye sees that something is wrong, a
 * novice reads the signs, a competent medic gets the candidates that
 * could produce those signs — *plural and unranked* — a proficient one
 * learns what treats it and how it travels, and an expert reads how far
 * it has gone. Nothing on that ladder makes anybody heal harder.
 *
 * ⚠⚠ **The unranked candidate list is the load-bearing assertion.**
 * Handing back a best guess would turn `treat <target> for <condition>`
 * into a rubber stamp and the medic into a reader of the engine's
 * answer. The two fixtures below deliberately SHARE a sign, so a
 * competent read is honestly ambiguous and the choice stays the
 * player's.
 *
 * ⚠ And the reading is of the SIGNS, not of the record: `candidatesFor`
 * walks the catalogue's warmed roster looking for sign overlap, which is
 * exactly what lets a medic be wrong in good faith.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AnalyzePatientController from '../idea/cmd/perception/AnalyzePatientController';
import AnalyzePostmortemController from '../idea/cmd/perception/AnalyzePostmortemController';
import Condition from '@saxonberg/server/mud/platform/idea/Condition';
import ConditionCatalogue from '@saxonberg/server/mud/platform/idea/ConditionCatalogue';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { AdvancementMixin } from '@saxonberg/server/mud/lib/advancement/Advancement';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import {
  makeStuff,
  makeStuffAtPath,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

/**
 * A medic whose band is set rather than earned — the ladder is what is
 * under test, not the estimator (which has its own suite in the kernel).
 */
class Medic extends AdvancementMixin(Creature) {
  static override _mixinName: string = 'Medic';
  public band: CompetenceBandName = 'untrained';
  public override async competenceBandFor(): Promise<CompetenceBandName> {
    return this.band;
  }
}

const FEVER = '/platform/idea/Condition/characterization/marsh-fever';
const CHILL = '/platform/idea/Condition/characterization/gaol-chill';

/** What the controller sent, joined. */
let said: string[];

function stubScene(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toPeers = () => b;
    b.toSelf = (m: unknown) => {
      said.push(String(m));
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

function ctxFor(actor: unknown): CommandContext {
  return {
    commandGiver: actor,
    location: null,
    note: vi.fn(),
  } as unknown as CommandContext;
}

/**
 * Two authored conditions that SHARE a sign — the ambiguity is the
 * point — warmed through the real catalogue so `roster()` answers.
 */
async function warmRoster(): Promise<void> {
  const fever = makeStuffAtPath(() => {
    const c = new Condition();
    c.setName('marsh fever');
    c.setObservableSigns(['a high fever', 'a yellow cast to the eye']);
    c.setResolution({ by: 'tincture' });
    c.setContagion({ vector: 'water' });
    return c;
  }, FEVER);
  const chill = makeStuffAtPath(() => {
    const c = new Condition();
    c.setName('gaol chill');
    c.setObservableSigns(['a high fever', 'a deep cough']);
    c.setResolution({ by: 'rest' });
    return c;
  }, CHILL);

  vi.spyOn(Template, 'findDescendants').mockResolvedValue([
    { path: FEVER, class: '/platform/idea/Condition' },
    { path: CHILL, class: '/platform/idea/Condition' },
  ] as unknown as Template[]);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(
    async (path: string) => (path === FEVER ? fever : chill) as never,
  );
  const catalogue = makeStuffAtPath(
    () => new ConditionCatalogue(),
    TemplatePaths.conditionCatalogue,
  );
  await catalogue.warm();
}

/** A medic at `band`, reading a patient carrying marsh fever at stage 3. */
async function read(band: CompetenceBandName): Promise<string> {
  const medic = makeStuff(() => new Medic());
  medic.band = band;
  const patient = makeStuff(() => new Creature());
  patient.afflict({
    kind: 'affliction',
    templatePath: FEVER,
    stage: 3,
    elapsed: 0,
  });
  said = [];
  const ctrl = makeStuff(() => new AnalyzePatientController());
  await ctrl.execute({ target: { stuff: patient } as never }, ctxFor(medic));
  return said.join('\n');
}

beforeEach(async () => {
  installV1QuantityMarshallers();
  stubScene();
  await warmRoster();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('⭐⭐ the diagnostic ladder', () => {
  it('untrained: something is wrong, and nothing else', async () => {
    const out = await read('untrained');
    expect(out).toMatch(/Something is wrong/);
    expect(out, 'no signs at the floor').not.toMatch(/yellow cast/);
  });

  it('novice: every observable sign, and no candidates', async () => {
    const out = await read('novice');
    expect(out).toMatch(/high fever/);
    expect(out).toMatch(/yellow cast/);
    expect(out, 'naming it is a band away').not.toMatch(/Consistent with/);
  });

  it('⚠⚠ competent: the candidates, PLURAL and UNRANKED', async () => {
    const out = await read('competent');
    // Both rows share "a high fever", so both are consistent with what
    // the body is showing — and the read says so rather than picking.
    expect(out).toMatch(/Consistent with: gaol chill, marsh fever/);
    expect(out).toMatch(/You would have to choose/);
    expect(out, 'what treats it is a band away').not.toMatch(/It wants/);
  });

  it('proficient: what treats it, and how it travels', async () => {
    const out = await read('proficient');
    // Both candidates' resolutions, because the medic has not chosen yet.
    expect(out).toMatch(/It wants rest or tincture/);
    expect(out).toMatch(/It travels by water/);
    expect(out, 'the stage is the expert rung').not.toMatch(/stage 3/);
  });

  it('expert: how far it has gone', async () => {
    const out = await read('expert');
    expect(out).toMatch(/It is at stage 3/);
  });

  it('a sound body reads as sound, at every band', async () => {
    for (const band of ['untrained', 'expert'] as CompetenceBandName[]) {
      const medic = makeStuff(() => new Medic());
      medic.band = band;
      const patient = makeStuff(() => new Creature());
      said = [];
      const ctrl = makeStuff(() => new AnalyzePatientController());
      await ctrl.execute(
        { target: { stuff: patient } as never },
        ctxFor(medic),
      );
      expect(said.join('\n')).toMatch(/Nothing is the matter/);
    }
  });

  it('⚠ a thing with no body is refused, in words', async () => {
    const medic = makeStuff(() => new Medic());
    said = [];
    const note = vi.fn();
    const ctrl = makeStuff(() => new AnalyzePatientController());
    await ctrl.execute(
      { target: { stuff: makeStuff(() => new Condition()) } as never },
      { commandGiver: medic, location: null, note } as unknown as CommandContext,
    );
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-a-body' }),
    );
  });
});

describe('⭐ the postmortem refuses the living', () => {
  it('a body that is not a corpse is declined in its own words', async () => {
    const medic = makeStuff(() => new Medic());
    medic.band = 'expert';
    const alive = makeStuff(() => new Creature());
    said = [];
    const note = vi.fn();
    const ctrl = makeStuff(() => new AnalyzePostmortemController());
    await ctrl.execute(
      { target: { stuff: alive } as never },
      { commandGiver: medic, location: null, note } as unknown as CommandContext,
    );
    expect(note).toHaveBeenCalled();
    expect(said.join('\n').length).toBeGreaterThan(0);
  });
});
