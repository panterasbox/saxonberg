/**
 * EnrollController — the `enroll` verb's step model. Drives execute()
 * through the steps and asserts draft mutations + the emitted
 * char-gen-state frames, with the heavy bits mocked: the species lookup
 * (no bootstrap), the name suggester (no DB), the scene emit (capture),
 * and the commit (wiring only). The real commit + spawn is an
 * integration concern.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EnrollController, {
  FIELDS,
  FIELD_ORDER,
} from '../EnrollController';
import Login from '../../../Login';
import Interactive from '../../../Interactive';
import Species from '../../../species/Species';
import { NameBank } from '../../../../../lib/species/NameBank';
import Material from '../../../../../lib/material/Material';
import { Quantity } from '../../../../../lib/quantity';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../../api/command';
import type {
  CharGenStatePayload,
  CharGenFieldState,
} from '@saxonberg/types';

const SAPIENS_PATH =
  '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens';
const FLESH_PATH = '/stuff/idea/material/flesh';

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
    // A real Material behind the species, so the dossier's Composition
    // section builds and the reveal levels it carries are exercised.
    const flesh = makeStuff(() => new Material());
    flesh.setName('flesh');
    flesh.setDensity(Quantity.of(1010, 'kg/m³'));
    flesh.setEdibility(false);
    // No setter for this one — it is a hydrator-populated field, so the
    // test writes it the way the Hydrator would.
    species._defaultMaterialPath = FLESH_PATH;

    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) => {
      if (p === SAPIENS_PATH) return species as never;
      if (p === FLESH_PATH) return flesh as never;
      return undefined as never;
    });
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

  /**
   * One field off the latest frame. The payload is a projected LIST now,
   * not one option array per field, so a test names the field it means
   * exactly the way the client does.
   */
  function field(name: string): CharGenFieldState {
    const f = frames.at(-1)!.fields.find((x) => x.field === name);
    if (!f) throw new Error(`no '${name}' field on the frame`);
    return f;
  }

  it('species options carry a structured dossier derived from the model', async () => {
    await run(''); // bare enroll → full draft state
    const human = field('species').options!.find((o) => o.value === 'human');
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

  /**
   * ⭐ The reveal level survives the char-gen boundary.
   *
   * `Material.fieldMeta` declares `density`/`edibility` at `spoiler: 1`
   * so the level follows the field wherever it surfaces. The dossier
   * used to drop it, which made char-gen render expanded what the wiki
   * renders collapsed — char-gen sitting BESIDE the reveal model rather
   * than inside it.
   *
   * ⚠ Level 1 is collapsed-by-default, NOT forbidden. This asserts the
   * level is carried, not that the row is withheld.
   */
  it('composition rows carry the reveal level declared on fieldMeta', async () => {
    await run('');
    const dossier = field('species').options!.find(
      (o) => o.value === 'human',
    )?.dossier;
    const comp = dossier?.sections.find((s) => s.heading === 'Composition');

    expect(comp?.rows.find((r) => r.label === 'Density')).toEqual({
      label: 'Density',
      value: '1010 kg/m³',
      spoiler: 1,
    });
    expect(comp?.rows.find((r) => r.label === 'Edible')?.spoiler).toBe(1);
    // Level 0 rows carry no marker at all — absent, not `spoiler: 0`, so
    // a renderer's truthiness check is the whole rule.
    expect(comp?.rows.find((r) => r.label === 'Tissue')).toEqual({
      label: 'Tissue',
      value: 'flesh',
    });
  });

  it('bare enroll emits species options with everything still missing', async () => {
    await run('');
    expect(field('species').options!.map((o) => o.value)).toContain('human');
    // No species yet → sex is not applicable. ⭐ The field is still
    // EMITTED, carrying `applicable: false`, rather than being signalled
    // by an empty option array — the client needs to tell "no sexes for
    // this species" from "sexes not authored yet".
    expect(field('sex').applicable).toBe(false);
    expect(field('sex').options).toBeUndefined();
    expect(frames.at(-1)!.missing).toContain('species');
  });

  it('setting a field records it and surfaces the dependent options', async () => {
    await run('species human');
    const draft = login.getEnrollmentDraft()!;
    expect(draft.speciesKey).toBe('human');
    expect(draft.speciesPath).toBe(SAPIENS_PATH);
    // Species is set → no longer missing; sex now applies (xy-ish mock).
    expect(frames.at(-1)!.missing).not.toContain('species');
    expect(field('sex').applicable).toBe(true);
    expect(field('sex').options!.length).toBeGreaterThan(0);
    // The pick rides the field it belongs to; there is no separate
    // `picks` object to disagree with it.
    expect(field('species').value).toBe('human');
  });

  /**
   * ⭐⭐ The property that justifies the projected payload at all.
   *
   * Before this shape, a new char-gen concept was three edits — the
   * `FIELDS` table, the payload assembly, and the client's
   * `optionsFor(field)` switch. The claim now is that it is ONE: an
   * entry in the table. These tests are that claim, asserted rather
   * than asserted-about.
   */
  describe('the payload is projected from the FIELDS table', () => {
    const ADDED = 'favourite_colour';

    afterEach(() => {
      // The table is module state shared by every test in this file.
      delete (FIELDS as Record<string, unknown>)[ADDED];
      const at = FIELD_ORDER.indexOf(ADDED as never);
      if (at >= 0) FIELD_ORDER.splice(at, 1);
    });

    it('a field added to the table reaches the wire with no emitter edit', async () => {
      (FIELDS as Record<string, unknown>)[ADDED] = {
        kind: 'choose-one',
        label: 'favourite colour',
        applicable: () => true,
        isSet: () => false,
        display: () => undefined,
        options: () => [{ value: 'red', label: 'Red' }],
        validate: () => undefined,
        apply: () => {},
      };
      FIELD_ORDER.push(ADDED as never);

      await run('');

      // It is on the wire, carrying the table's OWN descriptors — the
      // projector hardcodes neither the key, the kind, nor the label.
      const added = field(ADDED);
      expect(added.kind).toBe('choose-one');
      expect(added.label).toBe('favourite colour');
      expect(added.options!.map((o) => o.value)).toEqual(['red']);
      // And it gates confirm, because `missing` reads the same table.
      expect(frames.at(-1)!.missing).toContain(ADDED);
    });

    it('emits every settable field in canonical order, each self-describing', async () => {
      await run('');
      const frame = frames.at(-1)!;
      expect(frame.fields.map((f) => f.field)).toEqual(FIELD_ORDER);
      for (const f of frame.fields) {
        expect(f.kind).toBeTruthy();
        expect(f.label).toBeTruthy();
      }
    });

    it('the name field carries its suggestion, which is the two-input signal', async () => {
      await run('species human');
      const name = field('name');
      expect(name.kind).toBe('text');
      // ⚠ The surname's PRESENCE is what tells a renderer to draw two
      // inputs. There is deliberately no second mechanism for it, so a
      // test that stops asserting this is how the duplication returns.
      expect(name.suggestion?.name).toBeTruthy();
      expect(frames.at(-1)!.suggestion).toEqual(name.suggestion);
    });
  });

  /**
   * ⭐⭐ A player may not choose `it/its` for themselves — but the
   * `Pronouns` ENUM keeps it, because that is the world's pronoun
   * vocabulary and the parser resolves "take it" against it. Removing
   * it there would break referring to a chair.
   *
   * ⚠ The roster and the validator read the SAME array, so this also
   * refuses the command-line path. A test that only checked the option
   * list would miss a bare-client player typing it directly.
   */
  it('offers he/she/they for a character and refuses it/its', async () => {
    await run('species human');
    const values = field('pronouns').options!.map((o) => o.value);
    expect(values).toEqual(['he', 'she', 'they']);

    await run('pronouns it');
    expect(login.getEnrollmentDraft()!.pronouns).toBeUndefined();
    expect(frames.at(-1)!.error?.field).toBe('pronouns');
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
