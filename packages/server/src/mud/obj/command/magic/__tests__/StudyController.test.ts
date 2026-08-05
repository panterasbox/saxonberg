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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';
import StudyController from '../StudyController';
import { AdvancementApi } from '../../../../api/advancement';
import { ChronicleApi } from '../../../../api/chronicle';
import { RecognitionApi } from '../../../../api/recognition';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { CommandApi } from '../../../../api/command';
import type { CommandContext } from '../../../../api/command';
import '../../../WorldClockRegistry';
import SpellCatalogue from '../../../SpellCatalogue';
import Spell from '../../../magic/Spell';
import Spellbook from '../../../magic/Spellbook';
import { Template } from '../../../../lib/stuff/Template';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { Character } from '../../../../lib/character/Character';
import Species from '../../../species/Species';
import { DescriptorBank } from '../../../../lib/identification/DescriptorBank';
import { Appearance } from '../../../../lib/identification/Appearance';
import type { MqlOneResult } from '../../../../api/mql';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';

class TestCharacter extends Character {}

const __filename = fileURLToPath(import.meta.url);
const SPELL_SEEDS_DIR = join(
  dirname(__filename),
  '../../../../seeds/obj/magic/Spell',
);
const BANKS_DIR = join(
  dirname(__filename),
  '../../../../../../../content/arcane-descriptors/content/descriptor-banks',
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
    .spyOn(Template, 'findDescendants')
    .mockImplementation(async (prefix: string): Promise<Template[]> => {
      if (!prefix.startsWith(Spell.TEMPLATE_PATH_PREFIX)) return [];
      return seeds.map((seed) => ({
        path: `${Spell.TEMPLATE_PATH_PREFIX}${String(seed.spellId)}`,
        data: seed,
      })) as unknown as Template[];
    });
  if (!catalogueSingleton) {
    catalogueSingleton = makeStuff(() => new SpellCatalogue());
    stampTemplatePathForTest(catalogueSingleton, '/obj/SpellCatalogue');
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
  stampTemplatePathForTest(species, `/obj/species/test/study-${n}`);
  const actor = makeStuff(() => new TestCharacter());
  actor.setSpecies(species);
  stampTemplatePathForTest(actor, `/obj/test/study-reader-${n}`);
  return actor;
}

function makeBook(over: Partial<Spellbook> = {}): Spellbook {
  const book = makeStuff(() => new Spellbook());
  stampTemplatePathForTest(book, `/obj/test/primer-${seq++}`);
  book.setShortDescription('a slim grey primer');
  book.setIdentifiedName('a primer of glowlight');
  book.setDescriptorClass('spellbook');
  book.setTeachesSpellPath('/obj/magic/Spell/glowlight');
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
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
    const credit = vi
      .spyOn(AdvancementApi, 'recordSignature')
      .mockResolvedValue(undefined);
    const claim = vi
      .spyOn(ChronicleApi, 'recordOnce')
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
    const [, key, entry] = claim.mock.calls[0]!;
    // The claim keys on the PATH, not the short name — a chronicle entry
    // is a durable identity record, and "I know a working called
    // firebolt" is exactly the ambiguity the path exists to remove.
    expect(key).toBe('spell-known:/obj/magic/Spell/glowlight');
    expect((entry as { kind: string }).kind).toBe('claim');

    // …and competence was NOT touched. A book that granted skill would
    // have to write evidence of practice that never happened.
    expect(credit).not.toHaveBeenCalled();
    expect(reader.holdsSpell('/obj/magic/Spell/glowlight')).toBe(true);
  });

  it('AC26 — the claim is idempotent (recordOnce, distinct key)', async () => {
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    const claim = vi
      .spyOn(ChronicleApi, 'recordOnce')
      .mockResolvedValue(undefined as never);
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      (activity as unknown as { onComplete(): void }).onComplete();
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    await controller().execute(model(book) as never, context(reader));
    await controller().execute(model(book) as never, context(reader));

    // Both go through `recordOnce`, which dedups on {owner, key} — the
    // ledger stays honest without the controller tracking anything.
    for (const call of claim.mock.calls) {
      expect(call[1]).toBe('spell-known:/obj/magic/Spell/glowlight');
    }
  });

  it('AC27/28 — BELOW the comprehension floor you get a defective copy, not a refusal', async () => {
    // Untrained reader, book with a `competent` floor.
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('untrained');
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(ChronicleApi, 'recordOnce').mockResolvedValue(undefined as never);
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
    const held = reader.getMemorizedSpell('/obj/magic/Spell/glowlight');
    expect(held).toBeTruthy();
    expect(held!.defective).toBe(true);
    // …and it costs you, on every cast, until you fix it. That is the
    // legible signal, and it is the only one you get.
    expect(reader.costMultiplierFor('/obj/magic/Spell/glowlight')).toBeGreaterThan(1);
  });

  it('AC27 — ABOVE the floor the copy is clean', async () => {
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(ChronicleApi, 'recordOnce').mockResolvedValue(undefined as never);
    vi.spyOn(SchedulerApi, 'start').mockImplementation((activity) => {
      (activity as unknown as { onComplete(): void }).onComplete();
      return { ok: true } as never;
    });

    const reader = makeReader();
    const book = makeBook();
    book.setComprehensionBand('novice');
    await controller().execute(model(book) as never, context(reader));

    expect(reader.getMemorizedSpell('/obj/magic/Spell/glowlight')!.defective).toBe(false);
    expect(reader.costMultiplierFor('/obj/magic/Spell/glowlight')).toBe(1);
  });

  it('AC28 — an UNIDENTIFIED book does not reveal what it teaches', () => {
    const reader = makeReader();
    const book = makeBook();
    // Books are identified items on the same axis as potions (D29), so
    // an uncatalogued one reads as its derived look — which puts a
    // library's product where it belongs: the CATALOG, not the books.
    const shown = RecognitionApi.describe(reader, book);
    expect(shown).not.toContain('primer of glowlight');
    expect(shown).toMatch(/spellbook/);
  });

  it('AC31 — the study is an ACTIVITY, and its duration falls as sharpness rises', async () => {
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    vi.spyOn(ChronicleApi, 'recordOnce').mockResolvedValue(undefined as never);
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
    vi.spyOn(AdvancementApi, 'bandFor').mockResolvedValue('competent');
    vi.spyOn(AdvancementApi, 'recordSignature').mockResolvedValue(undefined);
    const claim = vi
      .spyOn(ChronicleApi, 'recordOnce')
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
    expect(reader.holdsSpell('/obj/magic/Spell/glowlight')).toBe(false);
    expect(claim).not.toHaveBeenCalled();
  });

  it('a book that teaches nothing is refused legibly', async () => {
    const reader = makeReader();
    const blank = makeBook();
    blank.setTeachesSpellPath('');
    const ctx = context(reader);
    await controller().execute(model(blank) as never, ctx);
    expect(reader.holdsSpell('/obj/magic/Spell/glowlight')).toBe(false);
  });
});
