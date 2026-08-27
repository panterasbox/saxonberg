/**
 * EnrollController → chronicle seeding. Drives `commit` UNMOCKED (same
 * orchestration as EnrollController.commit.test.ts) but with the
 * persistence layer connected to an in-memory store, asserting that a
 * freshly enrolled character ends up with BOTH a seeded prologue
 * (`claim` entries from the chosen aspiration) AND a founding `deed`.
 *
 * `avatar.enter` is stubbed here, so the first-arrival deed (minted
 * inside `enter`) does NOT fire — only the commit-level seedClaims +
 * founding deed do, which is exactly what this test isolates.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EnrollController from '../EnrollController';
import Login from '../../../Login';
import Interactive from '../../../Interactive';
import Avatar from '../../../../agent/Avatar';
import Species from '../../../species/Species';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { AppApi } from '../../../../../api/app';
import { TemplateApi } from '../../../../../api/template';
import { Template } from '../../../../../lib/stuff/Template';
import { ConnectionApi } from '../../../../../api/connection';
import { ContainmentApi } from '../../../../../api/containment';
import { SlotApi } from '../../../../../api/slot';
import { MessageApi } from '../../../../../api/message';
import { WorldClockApi } from '../../../../../api/worldclock';
import { PersistenceManager } from '../../../../../../backend/PersistenceManager';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../../api/command';

const SAPIENS =
  '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens';

describe('EnrollController.commit → chronicle seeding', () => {
  let login: Login;
  let ctrl: EnrollController;
  let ctx: CommandContext;
  let user: { _id: string; playerIds: string[]; save: ReturnType<typeof vi.fn> };
  let avatarPath: string;
  let store: Map<string, Record<string, unknown>>;
  let idCounter: number;

  beforeEach(() => {
    vi.restoreAllMocks();
    EnrollController.resetConfigCache();

    // In-memory PM store so chronicle mints actually persist.
    store = new Map();
    idCounter = 0;
    const pm = PersistenceManager.get();
    vi.spyOn(pm, 'isConnected').mockReturnValue(true);
    vi.spyOn(pm, 'find').mockImplementation(
      async (_col: string, query: Record<string, unknown>) =>
        [...store.values()].filter((d) =>
          Object.entries(query).every(([k, v]) => d[k] === v)
        ) as never
    );
    vi.spyOn(pm, 'save').mockImplementation(
      async (_col: string, doc: Record<string, unknown>) => {
        const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
        store.set(id, { ...doc, _id: id });
        return id;
      }
    );
    WorldClockApi._setNowProviderForTesting(() => 1000);

    vi.spyOn(AppApi, 'setting').mockReturnValue('/world/lounge/warren');

    user = { _id: 'u1', playerIds: [], save: vi.fn().mockResolvedValue(undefined) };
    const interactive = makeStuff(
      () => new Interactive('s', 'sess', user as never)
    );
    login = makeStuff(() => new Login(interactive));
    login.setEnrollmentDraft({
      speciesKey: 'human',
      speciesPath: SAPIENS,
      speciesCommonName: 'human',
      sex: 'female',
      name: 'Bobalu',
      surname: 'Smallberries',
      pronouns: 'she',
      aspiration: 'healer',
    });
    ctrl = makeStuff(() => new EnrollController());

    const species = makeStuff(() => new Species());
    species.setSexDeterminationSystem('dioecious');
    species.setCommonNames(['human']);
    species.setLongDescription('an ordinary-looking person');
    species.setNameBankKeys(['common']);
    vi.spyOn(StuffApi, 'singleton').mockImplementation(async (p: string) =>
      p === SAPIENS ? (species as never) : (undefined as never)
    );
    vi.spyOn(species, 'getBodyPlanPath').mockReturnValue(null as never);

    vi.spyOn(Template, 'findByPath').mockResolvedValue({
      path: Avatar.SEED_TEMPLATE_PATH,
      class: '/platform/agent/Avatar',
      data: { startLocation: '/world/lounge/warren' },
      hydratorClass: '/platform/idea/persistence/PersistentHydrator',
    } as never);
    vi.spyOn(TemplateApi, 'saveTemplate').mockImplementation(
      async (path: string) => path
    );

    // The cloned avatar — a stub that carries a durable templatePath (the
    // chronicle owner key) and a no-op enter (so the first-arrival deed
    // does not fire from here).
    avatarPath = '';
    const avatarStub = {
      setSex: vi.fn(),
      enter: vi.fn().mockResolvedValue(undefined),
      getTemplatePath: () => avatarPath,
      // The identity-keyed producers key on getIdentityPath (sandbox
      // build); an ordinary body's identity IS its templatePath.
      getIdentityPath: () => avatarPath,
      // The commit path grants the onboarding coin to non-guests; this
      // AppApi.setting mock returns a non-numeric string for the stipend
      // key, so no mint fires — the guard just needs the accessor.
      getIsGuest: () => false,
    };
    vi.spyOn(StuffApi, 'clone').mockImplementation(async (path: string) => {
      if (path.startsWith('/platform/agent/Avatar/')) {
        avatarPath = path;
        return avatarStub as never;
      }
      return makeStuff(() => new Idea()) as never;
    });
    vi.spyOn(ContainmentApi, 'move').mockReturnValue(undefined as never);
    vi.spyOn(SlotApi, 'occupyAll').mockReturnValue(undefined as never);
    vi.spyOn(ConnectionApi, 'transfer').mockReturnValue(undefined as never);
    vi.spyOn(StuffApi, 'destruct').mockReturnValue(undefined as never);
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = () => b;
      b.payload = () => b;
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
    WorldClockApi._resetForTesting();
    StuffApi.clearAll();
  });

  it('a freshly enrolled character has >=1 claim AND >=1 founding deed', async () => {
    await ctrl.execute(
      { rest: 'confirm' } as CommandModel & { rest?: string },
      ctx
    );

    const mine = [...store.values()].filter((d) => d.owner === avatarPath);
    const claims = mine.filter((d) => d.kind === 'claim');
    const deeds = mine.filter((d) => d.kind === 'deed');

    // Healer aspiration seeds two claimSeeds in char-gen.yaml.
    expect(claims.length).toBeGreaterThanOrEqual(1);
    expect(deeds.length).toBeGreaterThanOrEqual(1);

    // The founding deed is tagged and ProseApi-rendered with the name.
    const founding = deeds.find((d) =>
      (d.tags as string[] | undefined)?.includes('enroll')
    );
    expect(founding).toBeDefined();
    expect(String(founding!.text)).toContain('Bobalu');
  });
});
