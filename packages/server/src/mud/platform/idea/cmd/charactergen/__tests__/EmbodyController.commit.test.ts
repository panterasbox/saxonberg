/**
 * EmbodyController commit — the `embody confirm` pipeline, run UNMOCKED
 * (the orchestration the step-model test mocks out) with the underlying
 * Apis spied. Asserts the commit sequence and the data assembled onto
 * the per-character template: fork (with picks) → register ownership →
 * clone Avatar → set sex → dress → hand off → destruct Login. The real
 * clone-cascade + spawn is covered end-to-end by the browser e2e
 * (e2e/tests/chargen.spec.ts).
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EmbodyController from '../EmbodyController';
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
import { ContainmentApi } from '../../../../../api/containment';
import { MessageApi } from '../../../../../api/message';
import { BankingApi, Money } from '../../../../../api/banking';
import { ContractApi } from '../../../../../api/contract';
import { makeStuff } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../../api/command';

const SAPIENS =
  '/stuff/idea/species/animalia/chordata/mammalia/primates/hominidae/homo/sapiens';
const BIPED = '/stuff/idea/species/BodyPlan/biped';

// A real Wearable+Containable garment so the dressing block's mixin
// predicates (`isContainable`/`isWearable`) narrow it rather than skip.
class TestGarment extends WearableMixin(SlottableMixin(ContainableMixin(Idea))) {}

describe('EmbodyController.commit', () => {
  let login: Login;
  let ctrl: EmbodyController;
  let ctx: CommandContext;
  let user: { _id: string; playerIds: string[]; save: ReturnType<typeof vi.fn> };
  let savedTemplate: { path: string; data: Record<string, unknown> } | null;
  let avatar: {
    setSex: ReturnType<typeof vi.fn>;
    enter: ReturnType<typeof vi.fn>;
    getIsGuest: ReturnType<typeof vi.fn>;
    getIdentityPath: ReturnType<typeof vi.fn>;
      seedChronicleClaims: ReturnType<typeof vi.fn>;
    recordDeed: ReturnType<typeof vi.fn>;
    recordChronicleOnce: ReturnType<typeof vi.fn>;
    occupyAll: ReturnType<typeof vi.fn>;
  };
  let transfer: ReturnType<typeof vi.fn>;
  let destruct: ReturnType<typeof vi.fn>;
  let dressed: string[];

  beforeEach(() => {
    vi.restoreAllMocks();
    EmbodyController.resetConfigCache();

    // The mint path now sources the new avatar's startLocation from app
    // config; mock the cached read (no AppSettings boot warm in this unit).
    // Key-aware: the compact currency needs a currency key, everything else
    // the spawn home.
    vi.spyOn(AppApi, 'setting').mockImplementation((k: string) =>
      k === 'banking.compactCurrency' ? 'zorkmid' : '/world/lounge/idea/warren',
    );
    // ⭐ The Arrival Note (economic bootstrap D10) is the contract face's —
    // spy it (no banking harness in this unit); `credit.note.test.ts`
    // proves the row, the coin and the paper.
    vi.spyOn(ContractApi, 'issueNote').mockResolvedValue({
      ok: true,
      contractId: 'note-1',
      principal: 20,
      paperPath: '/home/p-1/papers/arrival-note',
    });

    user = { _id: 'u1', playerIds: [], save: vi.fn().mockResolvedValue(undefined) };
    const interactive = makeStuff(
      () => new Interactive('s', 'sess', user as never),
    );
    login = makeStuff(() => new Login(interactive));
    login.setCharacterDraft({
      speciesKey: 'human',
      speciesPath: SAPIENS,
      speciesCommonName: 'human',
      sex: 'female',
      name: 'Bobalu',
      surname: 'Smallberries',
      pronouns: 'she',
      aspiration: 'healer',
    });
    ctrl = makeStuff(() => new EmbodyController());

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
    // identity path is minted via `asIdentityPath` (D17). Capture both off
    // the seed-clone call for the overlay assertions.
    savedTemplate = null;

    // Clone: avatar for the seed path, a real Wearable garment for
    // everything else (claims a torso slot on the biped body plan).
    avatar = {
      setSex: vi.fn(),
      enter: vi.fn().mockResolvedValue(undefined),
      getIsGuest: vi.fn().mockReturnValue(false),
      getIdentityPath: vi.fn().mockReturnValue('/platform/agent/Avatar/p-1'),
      // The chronicle owner face (the OO sweep): commit seeds claims and
      // mints the founding deed ON the avatar.
      seedChronicleClaims: vi.fn().mockResolvedValue(undefined),
      recordDeed: vi.fn().mockResolvedValue(undefined),
      recordChronicleOnce: vi.fn().mockResolvedValue(undefined),
      // The dressing loop claims slots ON the avatar since the OO sweep.
      occupyAll: vi.fn(),
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
          asIdentityPath?: string;
        },
      ) => {
        if (path === Avatar.SEED_TEMPLATE_PATH) {
          savedTemplate = {
            path: opts?.asIdentityPath ?? path,
            data: opts?.dataOverlay ?? {},
          };
          return avatar as never;
        }
        dressed.push(path);
        return garment as never;
      },
    );
    vi.spyOn(ContainmentApi, 'move').mockReturnValue(undefined as never);
    
    transfer = vi.spyOn(interactive, 'transferTo').mockReturnValue(undefined as never) as never;
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
    expect(avatar.occupyAll).toHaveBeenCalled();
    expect(transfer).toHaveBeenCalled();
    expect(avatar.enter).toHaveBeenCalledTimes(1);
    expect(destruct).toHaveBeenCalledWith(login);
  });

  it('⭐ a committed non-guest ISSUES the Arrival Note (one issueNote — no mint, no stipend)', async () => {
    await confirm();
    expect(ContractApi.issueNote).toHaveBeenCalledTimes(1);
    const [key] = (ContractApi.issueNote as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!;
    expect(String(key)).toMatch(/^\/platform\/agent\/Avatar\//);
    expect(avatar.recordChronicleOnce).toHaveBeenCalledWith(
      'economy:note:signed',
      expect.objectContaining({ template: expect.stringMatching(/Arrival Note/) }),
    );
  });

  it('a guest issues no note', async () => {
    avatar.getIsGuest.mockReturnValue(true);
    await confirm();
    expect(ContractApi.issueNote).not.toHaveBeenCalled();
  });
});
