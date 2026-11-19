/**
 * The phone (aether-devices D1, D4): it tunes whoever bears it in hand or
 * ready — a hand, a pocket, a satchel worn on the torso — and nobody when
 * it is packed, switched off, or borne by nobody, and it says why. A bag
 * moved with the phone inside re-tunes. Its installed apps are a
 * persistent field.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handsSpecies, wornBag, Body } from '../../../lib/slot/__tests__/carrying-fixture';
import { CommandGiverMixin } from '../../../lib/command/CommandGiver';
import { AetherMixin } from '../../../lib/message/Aether';
import { ContainmentApi } from '../../../api/containment';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { makeStuff, stampTemplatePathForTest } from '../../../lib/security/__tests__/test-setup';
import Location from '../../../lib/location/Location';
import Phone from '../Phone';
import { WorldClockApi } from '../../../api/worldclock';
import App from '../../idea/App';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { AnyConstructor } from '../../../api/mixin';

/** A carrying body that gives commands and can be tuned — a player's shape. */
class Bearer extends AetherMixin(CommandGiverMixin(Body)) {}

let bearers = 0;
function bearer(): { me: Bearer; plan: string } {
  const { species, plan } = handsSpecies();
  const me = makeStuff(() => new Bearer());
  stampTemplatePathForTest(me, `/platform/agent/Avatar/bearer-${++bearers}`);
  me.setSpecies(species);
  return { me, plan };
}

function phone(): Phone {
  const p = makeStuff(() => new Phone());
  p.standbyW = 0.1;
  p.acceptW = 10;
  p.setCapacityWh(12);
  p.setOn(true);
  p.setShortDescription('phone');
  p.setKeywords(['phone']);
  return p;
}

const tuned = (b: Stuff): boolean => MixinApi.isActive(b, 'AetherMixin');

describe('Phone', () => {
  let room: Location;
  beforeEach(() => {
    room = makeStuff(() => new Location());
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const a = makeStuff(() => new App());
      stampTemplatePathForTest(a, path);
      return a;
    }) as never);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('borne by nobody: not-borne, confers nothing', () => {
    const p = phone();
    ContainmentApi.move(p, room);
    expect(p.conferralRefusal()).toBe('not-borne');
    expect(p.confers()).toEqual([]);
  });

  it('in a hand: tunes the bearer', () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    p.setSlotClaims({ [plan]: ['hand:right'] });
    me.seatInSlot(p, 'hand:right');
    expect(p.conferralRefusal()).toBeNull();
    expect(tuned(me)).toBe(true);
  });

  it('in a satchel worn on the torso (ready): tunes; in a rucksack on the back (packed): does not, and says packed', () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const satchel = wornBag(me as unknown as Body, plan, 'satchel', 'torso');
    const rucksack = wornBag(me as unknown as Body, plan, 'rucksack', 'back');
    const p = phone();
    ContainmentApi.move(p, satchel);
    expect(p.conferralRefusal()).toBeNull();
    expect(tuned(me)).toBe(true);
    ContainmentApi.move(p, rucksack);
    expect(p.conferralRefusal()).toBe('packed');
    expect(tuned(me)).toBe(false);
  });

  it('a bag moved with the phone inside re-tunes (the recency stack follows)', () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    const bag = wornBag(me as unknown as Body, plan, 'satchel', 'torso');
    ContainmentApi.move(p, bag);
    expect(tuned(me)).toBe(true);
    ContainmentApi.move(bag, room); // set the satchel down, phone inside
    // The phone's answer is memoized for one game second (D1's hot path);
    // the bag moved, not the phone, so the next second reads it fresh.
    WorldClockApi.advance('1 second');
    expect(tuned(me)).toBe(false);
    expect(p.conferralRefusal()).toBe('not-borne');
  });

  it('switch off and on', () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    p.setSlotClaims({ [plan]: ['hand:right'] });
    me.seatInSlot(p, 'hand:right');
    p.setOn(false);
    expect(p.conferralRefusal()).toBe('off');
    expect(tuned(me)).toBe(false);
    p.setOn(true);
    expect(tuned(me)).toBe(true);
  });

  it('a carried phone affords `apps` to its bearer', () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    const bag = wornBag(me as unknown as Body, plan, 'satchel', 'torso');
    ContainmentApi.move(p, bag);
    expect(me.getCommandSources('environment')).toContain(p);
  });

  it('its installed apps are a persistent field (they ride the phone)', async () => {
    const p = phone();
    await p.installApp(App.MESSAGES_PATH);
    expect(MixinApi.getAllPersistentFields(Phone as unknown as AnyConstructor)).toContain(
      'installedApps',
    );
    expect(p.hasApp('messages')).toBe(true);
  });

  it('ownership is the lock: a locked phone runs only for its title-holder; unstamped runs for anyone', () => {
    const { me, plan } = bearer();
    ContainmentApi.move(me, room);
    const p = phone();
    p.ownerLocked = true;
    p.setSlotClaims({ [plan]: ['hand:right'] });
    me.seatInSlot(p, 'hand:right');
    // Unstamped: runs for whoever bears it.
    expect(p.conferralRefusal()).toBeNull();
    // Somebody else's title: a brick.
    const owner = vi.spyOn(p, 'stampedOwner').mockReturnValue({
      kind: 'player',
      templatePath: '/platform/agent/Avatar/somebody-else',
    });
    p.setOn(true); // drop the memo
    expect(p.conferralRefusal()).toBe('not-yours');
    expect(tuned(me)).toBe(false);
    // The bearer's own title: it runs.
    owner.mockReturnValue({ kind: 'player', templatePath: me.getIdentityPath()! });
    p.setOn(true);
    expect(p.conferralRefusal()).toBeNull();
  });
});
