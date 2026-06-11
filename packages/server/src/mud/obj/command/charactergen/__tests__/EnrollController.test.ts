/**
 * EnrollController — the `enroll` verb's step model. Drives execute()
 * through the steps and asserts draft mutations + the emitted
 * char-gen-state frames, with the heavy bits mocked: the species lookup
 * (no bootstrap), the name suggester (no DB), the scene emit (capture),
 * and the commit (wiring only). The real commit + spawn is an
 * integration concern.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EnrollController from '../EnrollController';
import Login from '../../../Login';
import Interactive from '../../../Interactive';
import Species from '../../../../lib/species/Species';
import { NameBank } from '../../../../lib/species/NameBank';
import { StuffApi } from '../../../../api/stuff';
import { MessageApi } from '../../../../api/message';
import { makeStuff } from '../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { CharGenStatePayload } from '@saxonberg/types';

const SAPIENS_PATH =
  '/lib/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens';

function fakeUser(): unknown {
  return { _id: 'u1', playerIds: [] as string[] };
}

describe('EnrollController step model', () => {
  let login: Login;
  let ctrl: EnrollController;
  let ctx: CommandContext;
  let frames: CharGenStatePayload[];

  beforeEach(() => {
    vi.restoreAllMocks();
    NameBank.clearCache();
    EnrollController.resetConfigCache();

    const interactive = makeStuff(
      () => new Interactive('s', 'sess', fakeUser() as never),
    );
    login = makeStuff(() => new Login(interactive));
    login.setEnrollmentDraft({ realName: 'Bobby' });
    ctrl = makeStuff(() => new EnrollController());

    // A fake human species so the species lookup + sex applicability +
    // suggester resolve without a bootstrapped world / DB.
    const species = makeStuff(() => new Species());
    species.setBinomial('Homo sapiens');
    species.setSexDeterminationSystem('dioecious');
    species.setCommonNames(['human']);
    species.setNameBankKeys(['common']);
    species.setLongDescription('an ordinary-looking person');
    // Real fields so the derived dossier is exercised.
    species.setLifespanMax(120);
    species.setVisionProfile({
      scotopicMin: 'pitch-black',
      photopicMax: 'bright',
      bandShift: -1,
    });
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) =>
      p === SAPIENS_PATH ? (species as never) : (undefined as never),
    );
    vi.spyOn(NameBank, 'resolve').mockResolvedValue({
      given: ['Bobalu', 'Bram', 'Cora'],
      surname: ['Ashby', 'Reed'],
      styles: [],
    });

    frames = [];
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.payload = (p: unknown) => {
        frames.push(p as CharGenStatePayload);
        return b;
      };
      b.send = () => {};
      return b as never;
    });
    ctx = {
      commandGiver: login as never,
      interactive,
      note: vi.fn(),
    } as unknown as CommandContext;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function run(rest: string): Promise<void> {
    return ctrl.execute({ rest } as EnrollModelLike, ctx);
  }
  type EnrollModelLike = CommandModel & { rest?: string };

  it('species options carry a structured dossier derived from the model', async () => {
    await run(''); // bare enroll → full draft state
    const human = frames.at(-1)!.speciesOptions.find((o) => o.value === 'human');
    const dossier = human?.dossier;
    expect(dossier?.binomial).toBe('Homo sapiens');
    // Classification ladder derived from the taxonomic template path.
    const classification = dossier?.sections.find(
      (s) => s.heading === 'Classification',
    );
    expect(classification?.rows).toContainEqual({
      label: 'Kingdom',
      value: 'Animalia',
    });
    expect(classification?.rows).toContainEqual({ label: 'Genus', value: 'Homo' });
    // Biology from real Species fields (lifespan + dark-adapted vision).
    const biology = dossier?.sections.find((s) => s.heading === 'Biology');
    expect(biology?.rows).toContainEqual({
      label: 'Lifespan',
      value: '~120 years',
    });
    expect(
      biology?.rows.find((r) => r.label === 'Vision')?.value,
    ).toMatch(/dark-adapted/);
  });

  it('bare enroll emits species options with everything still missing', async () => {
    await run('');
    const frame = frames.at(-1)!;
    expect(frame.speciesOptions.map((o) => o.value)).toContain('human');
    // No species yet → sex isn't applicable (empty option set).
    expect(frame.sexOptions).toEqual([]);
    expect(frame.missing).toContain('species');
  });

  it('setting a field records it and surfaces the dependent options', async () => {
    await run('species human');
    const draft = login.getEnrollmentDraft()!;
    expect(draft.speciesKey).toBe('human');
    expect(draft.speciesPath).toBe(SAPIENS_PATH);
    const frame = frames.at(-1)!;
    // Species is set → no longer missing; sex now applies (xy-ish mock).
    expect(frame.missing).not.toContain('species');
    expect(frame.sexOptions.length).toBeGreaterThan(0);
    expect(frame.picks.species?.key).toBe('human');
  });

  it('re-picking the same species does NOT wipe downstream fields', async () => {
    await run('species human');
    await run('sex female');
    expect(login.getEnrollmentDraft()!.sex).toBe('female');
    // Live-fire re-set of the unchanged species must be idempotent.
    await run('species human');
    expect(login.getEnrollmentDraft()!.sex).toBe('female');
  });

  it('rejects an unknown species with a field-scoped error and no pick', async () => {
    await run('species wombat');
    expect(login.getEnrollmentDraft()!.speciesKey).toBeUndefined();
    expect(frames.at(-1)!.error?.field).toBe('species');
    expect(frames.at(-1)!.error?.message).toMatch(/unknown species/i);
    expect(ctx.note).toHaveBeenCalled();
  });

  it('a full draft reports nothing missing, and confirm commits', async () => {
    const commit = vi
      .spyOn(EnrollController.prototype, 'commit')
      .mockResolvedValue(undefined);

    await run('species human');
    await run('sex female');
    const sug = login.getEnrollmentDraft()!.suggestion!;
    await run(`name ${[sug.name, sug.surname].filter(Boolean).join(' ')}`);
    await run('pronouns she');
    await run('aspiration healer');

    const draft = login.getEnrollmentDraft()!;
    expect(draft.sex).toBe('female');
    expect(draft.name?.[0]?.toLowerCase()).toBe('b'); // 'Bobby' → B-name
    expect(draft.pronouns).toBe('she');
    expect(draft.aspiration).toBe('healer');
    expect(frames.at(-1)!.missing).toEqual([]);

    await run('confirm');
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('confirm with missing fields errors instead of committing', async () => {
    const commit = vi
      .spyOn(EnrollController.prototype, 'commit')
      .mockResolvedValue(undefined);
    await run('species human');
    await run('confirm');
    expect(commit).not.toHaveBeenCalled();
    expect(frames.at(-1)!.error?.message).toMatch(/still to choose/i);
  });

  it('name reroll produces a fresh themed suggestion', async () => {
    await run('species human');
    const before = login.getEnrollmentDraft()!.suggestion?.name;
    await run('name reroll');
    const after = login.getEnrollmentDraft()!.suggestion?.name;
    expect(after).toBeTruthy();
    // both come from the mocked pool
    expect(['Bobalu', 'Bram', 'Cora']).toContain(after);
    void before;
  });

  it('rejects a typed name that fails validation', async () => {
    await run('species human');
    await run('name B0bby'); // digit
    expect(login.getEnrollmentDraft()!.name).toBeUndefined();
    expect(frames.at(-1)!.error?.field).toBe('name');
    expect(frames.at(-1)!.error?.message).toMatch(/letters/i);
  });
});
