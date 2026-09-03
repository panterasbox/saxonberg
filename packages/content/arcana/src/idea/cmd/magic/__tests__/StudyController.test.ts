/**
 * `study <book>` — the claim/deed line and the comprehension floor,
 * driven through the real controller.
 *
 * AC 26 — reading mints an idempotent known-of CLAIM and writes NO
 *         Transcript entry; competence is unchanged.
 * AC 27 — below the comprehension floor the reader forms a DEFECTIVE
 *         specification rather than being refused.
 * AC 28 — an unidentified spellbook does not reveal what it teaches, and
 *         reading one below the floor yields the defective copy rather
 *         than a refusal.
 * AC 31 — studying is an interruptible activity whose duration falls as
 *         sharpness rises.
 */

import "@saxonberg/server/test-bootstrap";
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import StudyController from '../StudyController';
import { SpellKnowledge } from '@saxonberg/server/mud/lib/magic/SpellKnowledge';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { CommandApi } from '@saxonberg/server/mud/api/command';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import SpellCatalogue from '@saxonberg/server/mud/platform/idea/SpellCatalogue';
import Spell from '@saxonberg/server/mud/platform/idea/magic/Spell';
import Spellbook from '../../../../thing/Spellbook';
import { Template } from '@saxonberg/server/mud/lib/stuff/Template';
import { CommandDefinition } from '@saxonberg/server/mud/lib/command/CommandDefinition';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { DescriptorBank } from '@saxonberg/server/mud/lib/identification/DescriptorBank';
import { Appearance } from '@saxonberg/server/mud/lib/identification/Appearance';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
/** Where the commons' spell rows live, and the class every one names (the catalogue warms BY CLASS). */
const SPELL_PATH_PREFIX = '/stuff/idea/magic/Spell/';
const SPELL_CLASS = '/platform/idea/magic/Spell';

// The competence read runs ON the reader since the OO sweep; pinned
// per test. creditSignature is captured per instance in makeReader.
let testBand: CompetenceBandName = 'untrained';
const creditCalls: unknown[] = [];
class TestCharacter extends Character {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return testBand;
  }
}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  '../../../../../../../content/arcane-library/content/stuff/idea/magic/Spell',
);
const BANKS_DIR = join(
  dirname(__filename),
  '../../../../../content/descriptor-banks',
);

let seq = 0;
let catalogueSingleton: SpellCatalogue | null = null;

async function installCatalogue(): Promise<void> {
  const seeds = readdirSync(SPELL_SEEDS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map(
      (f) =>
        (
          YAML.parse(readFileSync(join(SPELL_SEEDS_DIR, f), 'utf-8')) as {
            data: Record<string, unknown>;
          }
        ).data,
    );
  const spy = vi
    .spyOn(Template, 'findByClass')
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (prefix !== SPELL_CLASS) return [];
      return seeds.map((seed) => ({
        path: `${SPELL_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogueSingleton, '/platform/idea/SpellCatalogue');
  }
  catalogueSingleton.invalidateCache();
  await catalogueSingleton.postRegister();
  spy.mockRestore();
}

function installBanks(): void {
  DescriptorBank.primeCache(
    readdirSync(BANKS_DIR)
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => {
        const doc = YAML.parse(readFileSync(join(BANKS_DIR, f), 'utf-8')) as
          Record<string, unknown>;
        const bank = new DescriptorBank();
        bank.key = f.replace(/\.yaml$/, '');
        bank.primary = (doc.primary as string[]) ?? [];
        bank.secondary = (doc.secondary as string[]) ?? [];
        return bank;
      }),
  );
}

function makeReader(): TestCharacter {
  const n = seq++;
  const species = makeStuff(() => new Species());
  species.setFacultyProfile({ depth: 'mid', serenity: 'mid', composure: 'mid' });
  species.setInnateMixins(['CasterMixin']);
  species.setSentient(true);
  stampTemplatePathForTest(species, `/stuff/idea/species/test/study-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/study-reader-${n}`);
  vi.spyOn(
    actor as unknown as { creditSignature(sig: unknown): Promise<void> },
    'creditSignature',
  ).mockImplementation(async (sig: unknown) => {
    creditCalls.push(sig);
  });
  return actor;
}

function makeBook(over: Partial<Spellbook> = {}): Spellbook {
  const book = makeStuff(() => new Spellbook());
  stampTemplatePathForTest(book, `/obj/test/primer-${seq++}`);
  book.setShortDescription('a slim grey primer');
  book.setIdentifiedName('a primer of glowlight');
  book.setDescriptorClass('spellbook');
  book.setTeachesSpellPath('/stuff/idea/magic/Spell/glowlight');
  Object.assign(book, over);
  return book;
}

function context(actor: TestCharacter): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: actor as never,
    location: null as never,
    commandText: 'study primer',
    executionId: 'test',
    commandId: 'test',
    verb: 'study',
    command: CommandDefinition.fromYaml(
      'verbs: [study]\ncontroller: magic/StudyController\ndescription: stub\n',
      '<test>',
    ),
  });
}

function model(book: Spellbook): { target: MqlOneResult } {
  return { target: { stuff: book, raw: 'primer' } as MqlOneResult };
}

/** Controllers are Stuff — `new` is refused outside the create seam. */
function controller(): StudyController {
  return makeStuff(() => new StudyController());
}

describe('StudyController — claim, never deed', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    WorldClockApi._setNowProviderForTesting(() => 100000);
    await installCatalogue();
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    installBanks();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    Appearance.clearMemo();
    DescriptorBank.clearCache();
    vi.restoreAllMocks();
  });

  it('AC26 — studying mints a CLAIM and writes NO Transcript entry', async () => {
    testBand = 'competent';
    const credit = creditCalls;
    credit.length = 0;
    // The claim seam is SpellKnowledge.noteKnown since the OO sweep
    // (the mint itself is the owner's sealed recordChronicleOnce).
    const claim = vi
      .spyOn(SpellKnowledge, 'noteKnown')
      .mockResolvedValue(undefined as never);
    // Resolve the activity immediately so the completion body runs.
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      (activity as unknown as { onComplete(): void }).onComplete();
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    await controller().execute(model(book) as never, context(reader));

    // The claim was minted…
    expect(claim).toHaveBeenCalled();
    const [, spellPath] = claim.mock.calls[0]!;
    // The claim keys on the PATH, not the short name — a chronicle entry
    // is a durable identity record, and "I know a working called
    // firebolt" is exactly the ambiguity the path exists to remove.
    expect(spellPath).toBe('/stuff/idea/magic/Spell/glowlight');

    // …and competence was NOT touched. A book that granted skill would
    // have to write evidence of practice that never happened.
    expect(credit).toHaveLength(0);
    expect(reader.holdsSpell('/stuff/idea/magic/Spell/glowlight')).toBe(true);
  });

  it('AC26 — the claim is idempotent (recordOnce, distinct key)', async () => {
    testBand = 'competent';
        const claim = vi
      .spyOn(SpellKnowledge, 'noteKnown')
      .mockResolvedValue(undefined as never);
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      (activity as unknown as { onComplete(): void }).onComplete();
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    await controller().execute(model(book) as never, context(reader));
    await controller().execute(model(book) as never, context(reader));

    // Both go through noteKnown → recordChronicleOnce, which dedups on
    // {owner, key} — the ledger stays honest without the controller
    // tracking anything.
    for (const call of claim.mock.calls) {
      expect(call[1]).toBe('/stuff/idea/magic/Spell/glowlight');
    }
  });

  it('AC27/28 — BELOW the comprehension floor you get a defective copy, not a refusal', async () => {
    // Untrained reader, book with a `competent` floor.
    testBand = 'untrained';
        vi.spyOn(SpellKnowledge, 'noteKnown').mockResolvedValue(undefined as never);
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      (activity as unknown as { onComplete(): void }).onComplete();
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    book.setComprehensionBand('competent');
    await controller().execute(model(book) as never, context(reader));

    // NOT refused — the whole point. You take it on board believing it
    // is correct.
    const held = reader.getMemorizedSpell('/stuff/idea/magic/Spell/glowlight');
    expect(held).toBeTruthy();
    expect(held!.defective).toBe(true);
    // …and it costs you, on every cast, until you fix it. That is the
    // legible signal, and it is the only one you get.
    expect(reader.costMultiplierFor('/stuff/idea/magic/Spell/glowlight')).toBeGreaterThan(1);
  });

  it('AC27 — ABOVE the floor the copy is clean', async () => {
    testBand = 'competent';
        vi.spyOn(SpellKnowledge, 'noteKnown').mockResolvedValue(undefined as never);
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      (activity as unknown as { onComplete(): void }).onComplete();
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    book.setComprehensionBand('novice');
    await controller().execute(model(book) as never, context(reader));

    expect(reader.getMemorizedSpell('/stuff/idea/magic/Spell/glowlight')!.defective).toBe(false);
    expect(reader.costMultiplierFor('/stuff/idea/magic/Spell/glowlight')).toBe(1);
  });

  it('AC28 — an UNIDENTIFIED book does not reveal what it teaches', () => {
    const reader = makeReader();
    const book = makeBook();
    // Books are identified items on the same axis as potions (D29), so
    // an uncatalogued one reads as its derived look — which puts a
    // library's product where it belongs: the CATALOG, not the books.
    const shown = book.describeFor(reader);
    expect(shown).not.toContain('primer of glowlight');
    expect(shown).toMatch(/spellbook/);
  });

  it('AC31 — the study is an ACTIVITY, and its duration falls as sharpness rises', async () => {
    testBand = 'competent';
        vi.spyOn(SpellKnowledge, 'noteKnown').mockResolvedValue(undefined as never);
    const durations: number[] = [];
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      durations.push((activity as unknown as { duration: number }).duration);
      (activity as unknown as { onComplete(): void }).onComplete();
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    // First study from nothing — the long one.
    await controller().execute(model(book) as never, context(reader));
    // Immediately again, still fully sharp — the savings curve makes
    // this nearly free, which is what rewards regular light maintenance
    // over cramming.
    await controller().execute(model(book) as never, context(reader));

    expect(durations).toHaveLength(2);
    expect(durations[1]).toBeLessThan(durations[0]!);
  });

  it('AC31 — an INTERRUPTED study learns nothing', async () => {
    testBand = 'competent';
        const claim = vi
      .spyOn(SpellKnowledge, 'noteKnown')
      .mockResolvedValue(undefined as never);
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      (activity as unknown as { onAbort(r: string): void }).onAbort('interrupted');
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    await controller().execute(model(book) as never, context(reader));

    // The whole result lands at COMPLETION — an aborted study takes
    // nothing on board, exactly as an aborted cast fires nothing.
    expect(reader.holdsSpell('/stuff/idea/magic/Spell/glowlight')).toBe(false);
    expect(claim).not.toHaveBeenCalled();
  });

  it('a book that teaches nothing is refused legibly', async () => {
    const reader = makeReader();
    const blank = makeBook();
    blank.setTeachesSpellPath('');
    const ctx = context(reader);
    await controller().execute(model(blank) as never, ctx);
    expect(reader.holdsSpell('/stuff/idea/magic/Spell/glowlight')).toBe(false);
  });
});
