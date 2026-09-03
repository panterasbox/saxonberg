/**
 * ArmController — `arm <kit>`: the player-trapper deploy. Asserts the loop
 * + its inline anti-grief:
 *   - a successful deploy clones the kit's trap, sets its concealment to the
 *     placer's stealth-derived level, stamps `placedBy`, places it, and
 *     spends the kit;
 *   - the property gate refuses on another owner's ground and on ungoverned
 *     ground, and allows on government ground nobody privately holds;
 *   - pick-up-your-own: the placer can `get` their un-sprung placed trap; a
 *     non-placer is refused.
 *
 * The heavy Api boundaries (competence read, hide-level derivation, clone,
 * parcel/access lookups, scene) are stubbed; the controller's orchestration
 * is what's under test.
 */

import "../../../../../../test-bootstrap";
import { AdvancementMixin } from '../../../../../lib/advancement/Advancement';
import type { CompetenceBandName } from '../../../../../lib/advancement/CompetenceBand';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ArmController from '../ArmController';
import GetController from '../../inventory/GetController';
import Trap from '../../../../thing/Trap';
import TrapKit from '../../../../thing/TrapKit';
import { Idea } from '../../../../../lib/stuff/Idea';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { AddressableMixin } from '../../../../../lib/address/Addressable';
import { GovernmentApi } from '../../../../../api/government';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { StuffApi } from '../../../../../api/stuff';
import { MessageApi } from '../../../../../api/message';
import { AccessApi } from '../../../../../api/access';
import { ParcelApi } from '../../../../../api/parcel';
import { PerceptionApi } from '../../../../../api/perception';
import { ContainmentApi } from '../../../../../api/containment';
import type { CommandContext } from '../../../../../api/command';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';

class Room extends AddressableMixin(ContainerMixin(Idea)) {}
// The stealth-band read runs ON the placer since the OO sweep; pinned
// at competent (what the old class-static stub returned).
class Placer extends AdvancementMixin(
  ContainerMixin(ContainableMixin(Idea)),
) {
  override async competenceBandFor(): Promise<CompetenceBandName> {
    return 'competent';
  }
}

function stubScene(): void {
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.toPeers = () => b;
    b.send = () => {};
    return b as never;
  });
}

function ctx(
  giver: Stuff,
  location?: Stuff,
): CommandContext & { note: ReturnType<typeof vi.fn> } {
  return {
    commandGiver: giver,
    location,
    note: vi.fn(),
  } as unknown as CommandContext & { note: ReturnType<typeof vi.fn> };
}

let counter = 0;
function scene(): { room: Room; placer: Placer; kit: TrapKit } {
  const room = makeStuffAtPath(() => new Room(), `/world/test/room-${counter++}`);
  room.setAddress(`testville/room-${counter}`);
  const placer = makeStuffAtPath(
    () => new Placer(),
    `/platform/agent/Avatar/trapper-${counter}`,
  );
  ContainmentApi.move(placer, room);
  const kit = makeStuff(() => new TrapKit());
  return { room, placer, kit };
}

beforeEach(() => {
  StuffApi.clearAll();
  stubScene();
  vi.spyOn(PerceptionApi, 'preloadForSenseGate').mockResolvedValue(undefined);
  vi.spyOn(PerceptionApi, 'hideLevelFor').mockReturnValue('hidden');
  vi.spyOn(StuffApi, 'destruct').mockImplementation(() => undefined as never);
});

afterEach(() => vi.restoreAllMocks());

describe('ArmController — deploy', () => {
  it('clones a concealed, placer-stamped trap on government ground nobody privately holds and spends the kit', async () => {
    const { room, placer, kit } = scene();
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false); // not owned by placer
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue(null); // no private title
    vi.spyOn(GovernmentApi, 'governmentAt').mockReturnValue({ key: 'city' } as never); // under a government → allowed
    const deployed = makeStuff(() => new Trap());
    vi.spyOn(StuffApi, 'clone').mockResolvedValue(deployed as never);

    const context = ctx(placer);
    await makeStuff(() => new ArmController()).execute({ target: { stuff: kit } } as never, context);

    expect(deployed.getConcealment()).toBe('hidden');
    expect(deployed.getPlacedBy()).toBe(placer.getTemplatePath());
    expect(deployed.getContainer()).toBe(room);
    expect(StuffApi.destruct).toHaveBeenCalledWith(kit);
    expect(context.note).not.toHaveBeenCalled(); // no rejection
  });

  it('refuses to arm on ground nobody governs (untitled, ungoverned — nowhere-ground)', async () => {
    const { placer, kit } = scene();
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue(null);
    vi.spyOn(GovernmentApi, 'governmentAt').mockReturnValue(null);
    const clone = vi.spyOn(StuffApi, 'clone');
    const context = ctx(placer);
    await makeStuff(() => new ArmController()).execute({ target: { stuff: kit } } as never, context);
    expect(clone).not.toHaveBeenCalled();
    expect(context.note).toHaveBeenCalledWith(expect.objectContaining({ kind: 'controller-rejected' }));
  });

  it('refuses to arm on another owner\'s property', async () => {
    const { placer, kit } = scene();
    vi.spyOn(AccessApi, 'can').mockResolvedValue(false);
    vi.spyOn(ParcelApi, 'ownerOf').mockResolvedValue({
      kind: 'player',
      templatePath: '/home/someoneelse',
    } as never);
    const clone = vi.spyOn(StuffApi, 'clone');

    const context = ctx(placer);
    await makeStuff(() => new ArmController()).execute({ target: { stuff: kit } } as never, context);

    expect(clone).not.toHaveBeenCalled();
    expect(context.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-your-property' }),
    );
  });

  it('rejects a non-kit target', async () => {
    const { placer } = scene();
    const notAKit = makeStuff(() => new Idea());
    const context = ctx(placer);
    await makeStuff(() => new ArmController()).execute(
      { target: { stuff: notAKit } } as never,
      context,
    );
    expect(context.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-a-kit' }),
    );
  });
});

describe('pick-up-your-own-trap (GetController gate)', () => {
  function getModel(trap: Stuff): unknown {
    return { targets: { stuff: [trap], raw: 'trap' } };
  }

  it('the placer can pick up their own un-sprung placed trap', async () => {
    const room = makeStuff(() => new Room());
    const placer = makeStuffAtPath(() => new Placer(), '/platform/agent/Avatar/owner');
    ContainmentApi.move(placer, room);
    const trap = makeStuff(() => new Trap());
    trap.setPlacedBy('/platform/agent/Avatar/owner'); // theirs
    ContainmentApi.move(trap, room);

    await makeStuff(() => new GetController()).execute(
      getModel(trap) as never,
      ctx(placer, room) as never,
    );
    expect(trap.getContainer()).toBe(placer);
  });

  it('a non-placer cannot pick up someone else\'s live trap', async () => {
    const room = makeStuff(() => new Room());
    const stranger = makeStuffAtPath(() => new Placer(), '/platform/agent/Avatar/stranger');
    ContainmentApi.move(stranger, room);
    const trap = makeStuff(() => new Trap());
    trap.setPlacedBy('/platform/agent/Avatar/owner'); // NOT the stranger's
    ContainmentApi.move(trap, room);

    const context = ctx(stranger, room);
    await makeStuff(() => new GetController()).execute(
      getModel(trap) as never,
      context as never,
    );
    expect(trap.getContainer()).toBe(room); // left behind
    expect(context.note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'not-your-trap' }),
    );
  });
});
