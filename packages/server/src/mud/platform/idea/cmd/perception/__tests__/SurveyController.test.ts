/**
 * `survey` — the room read (residences D15/D4).
 *
 * What it must say, and what it must never do:
 *
 *   - the room archetypes, satisfied or not, and BY WHAT — the report
 *     names whatever object actually answered;
 *   - at home, the whole holding rather than the one room, plus the two
 *     things only a home has: the shell's condition BAND with its cause,
 *     and who owes the upkeep, said in words rather than in a key;
 *   - never a number, never a gauge, never a score;
 *   - and it decides nothing — an unrecognized room is reported as such
 *     and works identically (the no-enforcement pin lives beside the
 *     value object, in `ArchetypeSatisfaction.test.ts`).
 *
 * The holding half is reached through the `WarrenMember` back-ref BY
 * SHAPE — the residential programme is a capability pack's class and the
 * kernel does not import packs — so the fixture here is a duck, and that
 * is the seam under test as much as the prose is.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import SurveyController from '../SurveyController';
import ArchetypeCatalogue from '../../../ArchetypeCatalogue';
import SingletonCartesianLocation from '../../../../location/SingletonCartesianLocation';
import CartesianZone from '../../../location/CartesianZone';
import { BiomeApi } from '../../../../../api/biome';
import FurnishableRoom from '../../../../location/FurnishableRoom';
import { InnerWarren } from '../../../../../lib/location/InnerWarren';
import Chair from '../../../../thing/Chair';
import { DocumentApi } from '../../../../../api/document';
import { MessageApi } from '../../../../../api/message';
import { CommandApi } from '../../../../../api/command';
import { StuffApi } from '../../../../../api/stuff';
import { ContainmentApi } from '../../../../../api/containment';
import { Mml } from '../../../../../api/mml';
import { PerceiverMixin } from '../../../../../lib/description/Perceiver';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { CommandContext, CommandModel } from '../../../../../api/command';
import type { StoredDocument } from '../../../../../lib/document/StoredDocument';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { Container } from '../../../../../lib/spatial/Container';
import type { Containable } from '../../../../../lib/spatial/Containable';

const ARCHETYPE_DIR = fileURLToPath(
  new URL(
    '../../../../../../../../content/generic-objects/content/archetypes/',
    import.meta.url,
  ),
);

/** The same tiny reader the satisfaction suite uses — the REAL rows. */
function roomArchetypeDocs(): StoredDocument[] {
  return readdirSync(ARCHETYPE_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => readFileSync(join(ARCHETYPE_DIR, f), 'utf8'))
    .map((raw) => {
      const lines = raw.split('\n').filter((l) => !l.trimStart().startsWith('#'));
      const capabilities = lines
        .filter((l) => l.trimStart().startsWith('- { key:'))
        .map((l) => {
          const key = /key:\s*([\w-]+)/.exec(l)![1]!;
          const needs = /needs:\s*\{([^}]*)\}/.exec(l)![1]!;
          const [nk, nvRaw] = needs.split(':').map((x) => x.trim());
          const nv =
            nvRaw === 'true'
              ? true
              : Number.isFinite(Number(nvRaw))
                ? Number(nvRaw)
                : nvRaw;
          return { key, needs: { [nk!]: nv }, default: null };
        });
      const data = {
        archetypeId: lines
          .find((l) => l.startsWith('archetypeId:'))!
          .slice('archetypeId:'.length)
          .trim(),
        label: lines
          .find((l) => l.startsWith('label:'))!
          .slice('label:'.length)
          .trim(),
        capabilities,
      };
      return {
        getPath: () => `/generic-objects/archetypes/${data.archetypeId}`,
        getData: () => data as Record<string, unknown>,
        getKind: () => 'archetype',
      } as unknown as StoredDocument;
    });
}

/**
 * A synthetic archetype doc, for the two scopes the shipped rows do not
 * exercise yet. The logistics build adds five industry-less archetypes;
 * without `surveyScope` all five would land on every `survey` in the
 * game, in every bedroom, for every player.
 */
function scopedDoc(
  archetypeId: string,
  label: string,
  surveyScope: string,
): StoredDocument {
  const data = {
    archetypeId,
    label,
    surveyScope,
    capabilities: [{ key: 'shelter', needs: { seating: 1 }, default: null }],
  };
  return {
    getPath: () => `/test/archetypes/${archetypeId}`,
    getData: () => data as Record<string, unknown>,
    getKind: () => 'archetype',
  } as unknown as StoredDocument;
}

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

function ctxFor(actor: unknown, location: unknown): CommandContext {
  return {
    commandGiver: actor,
    location,
    note: vi.fn(),
  } as unknown as CommandContext;
}

function bed(): Chair {
  const b = makeStuff(() => new Chair());
  b.setStaticSlots([
    { name: 'lie:1', accepts: 'SlottableMixin', capacity: 1, postures: ['lie', 'sit'] },
  ]);
  b.setRestQuality(2.0);
  b.setShortDescription('a bed');
  return b;
}

/**
 * A programme's duck: a real Warren (so the back-ref wiring is the real
 * wiring) that also answers for the shell and the term. Deliberately NOT
 * the residential class — the point of the seam is that the kernel never
 * names it, and a stand-in with the right SHAPE proves exactly that.
 */
class FakeProgramme extends InnerWarren {
  public band = 'sound';
  public cause: string | null = null;
  conditionBand(): string {
    return this.band;
  }
  conditionCause(): string | null {
    return this.cause;
  }
  getUpkeepTerm(): string {
    return 'landlord-shell';
  }
  protected async createMember(): Promise<Stuff & Container> {
    throw new Error('not used');
  }
  async admitArrival(): Promise<void> {
    /* not used */
  }
  protected attachmentFor(): never {
    throw new Error('not used');
  }
  protected async reconcile(): Promise<void> {
    /* not used */
  }
  protected async wireHostFixtures(): Promise<void> {
    /* not used */
  }
  protected async unwireHostFixtures(): Promise<void> {
    /* not used */
  }
}

/** Put `rooms` in a holding whose shell reads `band` because of `cause`. */
function holding(
  rooms: FurnishableRoom[],
  band: string,
  cause: string | null,
): FakeProgramme {
  const p = makeStuff(() => new FakeProgramme());
  p.band = band;
  p.cause = cause;
  for (const r of rooms) p.addMember(r as unknown as Stuff & Container);
  return p;
}

const survey = async (
  actor: unknown,
  room: unknown,
): Promise<CommandContext> => {
  const controller = makeStuff(() => new SurveyController());
  const ctx = ctxFor(actor, room);
  await controller.execute({} as CommandModel, ctx);
  return ctx;
};

describe('survey', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    captureBody();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
      kind === 'archetype' ? roomArchetypeDocs() : [],
    );
    const catalogue = makeStuffAtPath(
      () => new ArchetypeCatalogue(),
      '/platform/idea/ArchetypeCatalogue',
    );
    await catalogue.warm();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('reads the bare room against all four, and says no to each', async () => {
    const room = makeStuff(() => new SingletonCartesianLocation());
    const actor = makeStuff(() => new SingletonCartesianLocation()); // any Stuff will do as a giver
    await survey(actor, room);
    expect(captured).toContain('You take stock of the room');
    for (const label of ['a bedroom', 'a kitchen', 'a bathroom', 'a living room']) {
      expect(captured).toContain(`${label}: no`);
    }
    // No home, so no shell line and no term line.
    expect(captured).not.toContain('Upkeep here is');
  });

  it('names what answered — the bed, by name', async () => {
    const room = makeStuff(() => new SingletonCartesianLocation());
    const b = bed();
    ContainmentApi.move(
      b as unknown as Stuff & Containable,
      room as unknown as Stuff & Container,
    );
    await survey(makeStuff(() => new SingletonCartesianLocation()), room);
    expect(captured).toContain('a bedroom: yes');
    expect(captured).toMatch(/sleeping \(.*bed.*\)/);
  });

  it('at home it reads the WHOLE place, and adds the shell and the term', async () => {
    const hall = makeStuff(() => new FurnishableRoom());
    const bedroom = makeStuff(() => new FurnishableRoom());
    ContainmentApi.move(
      bed() as unknown as Stuff & Containable,
      bedroom as unknown as Stuff & Container,
    );
    holding(
      [hall, bedroom],
      'worn',
      'the paint has gone; rain has gotten into the sills',
    );

    // Standing in the HALL, which has nothing in it at all.
    await survey(makeStuff(() => new SingletonCartesianLocation()), hall);
    expect(captured).toContain('You take stock of the place as a whole');
    // The bedroom next door answers for the whole holding.
    expect(captured).toContain('a bedroom: yes');
    expect(captured).toContain('The fabric of the place is worn');
    expect(captured).toContain('rain has gotten into the sills');
    expect(captured).toContain(
      'Upkeep here is the landlord’s for the shell; yours for what you put in it',
    );
  });

  it('bands and words only — no number anywhere in the readout', async () => {
    const hall = makeStuff(() => new FurnishableRoom());
    holding([hall], 'sound', null);
    await survey(makeStuff(() => new SingletonCartesianLocation()), hall);
    // The one thing D4 forbids: a gauge. `0.87` or `87%` must never appear.
    expect(captured).not.toMatch(/\d+(\.\d+)?\s*%/);
    expect(captured).not.toMatch(/\b0\.\d+\b/);
  });

  /* ── surveyScope (logistics D19 / P6) ────────────────────────── */

  /** Re-warm the catalogue with the shipped rows PLUS `extra`. */
  const warmWith = async (extra: StoredDocument[]): Promise<void> => {
    vi.spyOn(DocumentApi, 'listOfKind').mockImplementation(async (kind: string) =>
      kind === 'archetype' ? [...roomArchetypeDocs(), ...extra] : [],
    );
    const catalogue = StuffApi.findByTemplatePath<ArchetypeCatalogue>(
      '/platform/idea/ArchetypeCatalogue',
    )!;
    await catalogue.warm();
  };

  it("an `off-room` archetype never appears in a room survey", async () => {
    await warmWith([scopedDoc('haulage-rig', 'a haulage rig', 'off-room')]);
    const room = makeStuff(() => new SingletonCartesianLocation());
    await survey(makeStuff(() => new SingletonCartesianLocation()), room);
    // A rig is surveyed by NAMING it, never by standing somewhere.
    expect(captured).not.toContain('a haulage rig');
    // …and the shipped four are untouched.
    expect(captured).toContain('a bedroom: no');
  });

  it("a `corridor` archetype stays off an INDOOR survey", async () => {
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const room = makeStuff(() => new SingletonCartesianLocation());
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(false);
    await survey(makeStuff(() => new SingletonCartesianLocation()), room);
    // ⭐ The whole point of the second field: five new archetypes must not
    // print in every bedroom in the game.
    expect(captured).not.toContain('a way');
  });

  it("a `corridor` archetype reports over ALL of a corridor's rooms at once (AC15l)", async () => {
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const zone = makeStuff(() => new CartesianZone());
    const here = makeStuff(() => new SingletonCartesianLocation());
    const along = makeStuff(() => new SingletonCartesianLocation());
    zone.addLocation(here, 0, 0, 0);
    zone.addLocation(along, 0, 1, 0);
    // The shelter is a room AWAY — the union is the point.
    ContainmentApi.move(
      bed() as unknown as Stuff & Containable,
      along as unknown as Stuff & Container,
    );
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);

    await survey(makeStuff(() => new SingletonCartesianLocation()), here);
    expect(captured).toContain('a way: yes');
  });

  it('a corridor missing its shelter reports the gap and blocks nothing', async () => {
    await warmWith([scopedDoc('corridor', 'a way', 'corridor')]);
    const zone = makeStuff(() => new CartesianZone());
    const here = makeStuff(() => new SingletonCartesianLocation());
    zone.addLocation(here, 0, 0, 0);
    vi.spyOn(BiomeApi, 'isSkyExposed').mockReturnValue(true);

    const ctx = await survey(
      makeStuff(() => new SingletonCartesianLocation()),
      here,
    );
    expect(captured).toContain('a way: no');
    expect(captured).toContain('wants shelter');
    // Reported, never enforced: nothing was rejected and nothing penalised.
    expect(ctx.note).not.toHaveBeenCalled();
  });

  it('is afforded actor-side, beside `look`', () => {
    class Viewer extends PerceiverMixin(SingletonCartesianLocation) {}
    const verbs = CommandApi.collectSelfDefs(Viewer)
      .map((d) => d.verbs)
      .flat();
    expect(verbs).toContain('survey');
    expect(verbs).toContain('look');
  });
});
