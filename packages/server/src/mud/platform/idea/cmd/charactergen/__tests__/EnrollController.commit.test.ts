/**
 * EnrollController commit — the `enroll confirm` pipeline, run UNMOCKED
 * (the orchestration the step-model test mocks out) with the underlying
 * Apis spied. Asserts the commit sequence and the data assembled onto
 * the per-character template: fork (with picks) → register ownership →
 * clone Avatar → set sex → dress → hand off → destruct Login. The real
 * clone-cascade + spawn is covered end-to-end by the browser e2e
 * (e2e/tests/chargen.spec.ts).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EnrollController from '../EnrollController';
import Login from '../../../Login';
import Interactive from '../../../Interactive';
import Avatar from '../../../../agent/Avatar';
import Species from '../../../species/Species';
import { WearableMixin } from '../../../../../lib/slot/Wearable';
import { SlottableMixin } from '../../../../../lib/slot/Slottable';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { Idea } from '../../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../../api/stuff';
import { AppApi } from '../../../../../api/app';
import { Template } from '../../../../../lib/stuff/Template';
import { ConnectionApi } from '../../../../../api/connection';
import { ContainmentApi } from '../../../../../api/containment';
import { SlotApi } from '../../../../../api/slot';
import { MessageApi } from '../../../../../api/message';
import { BankingApi, Money } from '../../../../../api/banking';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../../api/command';

const SAPIENS =
  '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens';
const BIPED = '/stuff/idea/species/BodyPlan/biped';

// A real Wearable+Containable garment so the dressing block's mixin
// predicates (`isContainable`/`isWearable`) narrow it rather than skip.
class TestGarment extends WearableMixin(SlottableMixin(ContainableMixin(Idea))) {}

describe('EnrollController.commit', () => {
  let login: Login;
  let ctrl: EnrollController;
  let ctx: CommandContext;
  let user: { _id: string; playerIds: string[]; save: ReturnType<typeof vi.fn> };
  let savedTemplate: { path: string; data: Record<string, unknown> } | null;
  let avatar: {
    setSex: ReturnType<typeof vi.fn>;
    enter: ReturnType<typeof vi.fn>;
    getIsGuest: ReturnType<typeof vi.fn>;
  };
  let transfer: ReturnType<typeof vi.fn>;
  let destruct: ReturnType<typeof vi.fn>;
  let dressed: string[];

  beforeEach(() => {
    vi.restoreAllMocks();
    EnrollController.resetConfigCache();

    // The mint path now sources the new avatar's startLocation from app
    // config; mock the cached read (no AppSettings boot warm in this unit).
    // Key-aware: the onboarding stipend needs a number, everything else the
    // spawn home.
    vi.spyOn(AppApi, 'setting').mockImplementation((k: string) =>
      k === 'banking.onboardingStipend' ? '20' : '/world/lounge/idea/warren',
    );
    // Onboarding coin is minted through the CB faucet — spy it (no banking
    // harness in this unit); the dedicated tests assert the call shape.
    vi.spyOn(BankingApi, 'issueCash').mockResolvedValue(undefined as never);

    user = { _id: 'u1', playerIds: [], save: vi.fn().mockResolvedValue(undefined) };
    const interactive = makeStuff(
      () => new Interactive('s', 'sess', user as never),
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
      p === SAPIENS ? (species as never) : (undefined as never),
    );
    // Species.getBodyPlanPath isn't set on this bare instance; stub it.
    vi.spyOn(species, 'getBodyPlanPath').mockReturnValue(BIPED);

    // Seed template + persistence
    vi.spyOn(Template, 'findByPath').mockResolvedValue({
      path: Avatar.SEED_TEMPLATE_PATH,
      class: '/platform/agent/Avatar',
      data: { startLocation: '/world/lounge/idea/warren' },
      hydratorClass: '/platform/idea/persistence/PersistentHydrator',
    } as never);
    // No per-player template row is written anymore (the identity
    // doctrine): the picks ride the clone's `dataOverlay` and the
    // identity path is minted via `asTemplatePath`. Capture both off
    // the seed-clone call for the overlay assertions.
    savedTemplate = null;

    // Clone: avatar for the seed path, a real Wearable garment for
    // everything else (claims a torso slot on the biped body plan).
    avatar = {
      setSex: vi.fn(),
      enter: vi.fn().mockResolvedValue(undefined),
      getIsGuest: vi.fn().mockReturnValue(false),
    };
    dressed = [];
    const garment = makeStuff(() => new TestGarment());
    garment.setSlotClaim(BIPED, ['torso']);
    vi.spyOn(StuffApi, 'clone').mockImplementation(
      async (
        path: string,
        _context?: unknown,
        opts?: {
          dataOverlay?: Record<string, unknown>;
          asTemplatePath?: string;
        },
      ) => {
        if (path === Avatar.SEED_TEMPLATE_PATH) {
          savedTemplate = {
            path: opts?.asTemplatePath ?? path,
            data: opts?.dataOverlay ?? {},
          };
          return avatar as never;
        }
        dressed.push(path);
        return garment as never;
      },
    );
    vi.spyOn(ContainmentApi, 'move').mockReturnValue(undefined as never);
    vi.spyOn(SlotApi, 'occupyAll').mockReturnValue(undefined as never);
    transfer = vi.spyOn(ConnectionApi, 'transfer').mockReturnValue(undefined as never) as never;
    destruct = vi.spyOn(StuffApi, 'destruct').mockReturnValue(undefined as never) as never;

    // Scene emit (welcome/narration) → no-op chainable.
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
    StuffApi.clearAll();
  });

  function confirm(): Promise<void> {
    return ctrl.execute({ rest: 'confirm' } as CommandModel & { rest?: string }, ctx);
  }

  it('mints the identity path with the picks as the clone overlay (no row)', async () => {
    await confirm();
    expect(savedTemplate).not.toBeNull();
    expect(savedTemplate!.path).toMatch(/^\/platform\/agent\/Avatar\//);
    const d = savedTemplate!.data;
    expect(d.name).toBe('Bobalu');
    expect(d.surname).toBe('Smallberries');
    expect(d._speciesPath).toBe(SAPIENS);
    expect(d.pronouns).toBe('she');
    expect(d.aspiration).toBe('healer');
    // Spawn home injected from app config (defaultStartLocation), not the
    // seed literal.
    expect(d.startLocation).toBe('/world/lounge/idea/warren');
    expect(String(d.bio)).toMatch(/mend/i); // healer bioSeed from char-gen.yaml
    // Species' generic appearance lands on the avatar's longDescription
    // (its look) now that Species speaks the Visible interface.
    expect(d.longDescription).toBe('an ordinary-looking person');
  });

  it('registers ownership (playerIds + save) as the atomicity boundary', async () => {
    await confirm();
    expect(user.playerIds).toHaveLength(1);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it('clones the avatar, sets sex, dresses, hands off, and destructs Login', async () => {
    await confirm();
    expect(avatar.setSex).toHaveBeenCalledWith('female');
    // Healer outfit garments cloned + worn (tolerant loop).
    expect(dressed.length).toBeGreaterThan(0);
    expect(SlotApi.occupyAll).toHaveBeenCalled();
    expect(transfer).toHaveBeenCalled();
    expect(avatar.enter).toHaveBeenCalledTimes(1);
    expect(destruct).toHaveBeenCalledWith(login);
  });

  it('grants the onboarding coin to a committed non-guest (one issueCash mint)', async () => {
    await confirm();
    expect(BankingApi.issueCash).toHaveBeenCalledTimes(1);
    const [into, amount] = (BankingApi.issueCash as unknown as {
      mock: { calls: unknown[][] };
    }).mock.calls[0]!;
    expect(into).toBe(avatar);
    expect((amount as Money).minor).toBe(20);
  });

  it('grants a guest no onboarding coin', async () => {
    avatar.getIsGuest.mockReturnValue(true);
    await confirm();
    expect(BankingApi.issueCash).not.toHaveBeenCalled();
  });

  it('grants nothing when the stipend is 0', async () => {
    (AppApi.setting as unknown as { mockImplementation: (f: (k: string) => string) => void }).mockImplementation(
      (k: string) => (k === 'banking.onboardingStipend' ? '0' : '/world/lounge/idea/warren'),
    );
    await confirm();
    expect(BankingApi.issueCash).not.toHaveBeenCalled();
  });
});
