/**
 * ⭐ A hand act in a fight is the switch's guarded beat, priced by holder
 * (size and carrying D-W10-5; D-W10-13 — combat only): in a session `put`
 * starts a beat and the thing moves at its landing, not before; `drop` is
 * free; a holster is the draw and a pocket a reach; `unwield` a reach; a
 * pack off the back the switch dial; one beat at a time; outside a session
 * every act lands at once.
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { CombatApi } from '../../../../api/combat';
import { AppApi } from '../../../../api/app';
import { EventApi } from '../../../../api/event';
import { SchedulerApi } from '../../../../api/scheduler';
import { CommandApi, type ModelData } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { CombatTerms } from '../../../../lib/combat/CombatTerms';
import type { CombatSession } from '../../../../lib/combat/CombatSession';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { installShapes } from '../../../../lib/spatial/__tests__/size-fixture';
import { makeBody, tool, hold, wornBag, pack } from '../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';
import EventRegistry from '../../EventRegistry';
import Location from '../../../../lib/location/Location';
import PutController from '../../cmd/inventory/PutController';

const opened: CombatSession[] = [];
const one = (stuff: Stuff | null, raw: string, prep?: string): MqlOneResult => ({ stuff, raw, ...(prep ? { prep } : {}) });

function ctx(giver: Stuff, loc: Stuff, verb: string) {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandText: verb,
    executionId: 'test',
    commandId: 'test',
    verb,
    command: CommandDefinition.fromYaml(`verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`, '<test>'),
  });
}

describe('CombatLogic — a hand act in a fight is a guarded beat (D-W10-5)', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    installShapes();
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      stampTemplatePathForTest(r, '/platform/idea/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
    const real = AppApi.setting.bind(AppApi);
    vi.spyOn(AppApi, 'setting').mockImplementation((key: string) =>
      key === AppSettingKeys.combatTickSeconds ? '0.5' : real(key),
    );
  });
  afterEach(() => {
    for (const s of opened.splice(0)) s.dissolve();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  function fight() {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    const { me: other } = makeBody();
    ContainmentApi.move(me, room);
    ContainmentApi.move(other, room);
    const res = CombatApi.openSession(me as never, other as never, CombatTerms.agreed(
      me.getTemplatePath() ?? 'a',
      { lethality: 'non-lethal', stopCondition: 'yield', stakes: '' },
      true,
    ));
    if (!res.ok) throw new Error(`openSession failed: ${res.reason}`);
    opened.push(res.session);
    const state = res.session.getState(me)!;
    return { room, me, plan, state };
  }

  it('`put mug in pouch` starts a beat of a reach, and the mug moves at the landing, not before', async () => {
    const { room, me, plan, state } = fight();
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    pouch.setDimensions({ width: 0.3, depth: 0.15, height: 0.3 });
    const mug = hold(me, plan, tool('mug', 0.35, [0.09, 0.09, 0.1]));
    await makeStuff(() => new PutController()).execute(
      { item: one(mug, 'mug'), target: one(pouch, 'pouch', 'in') } as ModelData as never,
      ctx(me, room, 'put'),
    );
    expect(state.weaponSwitch?.getRemaining()).toBe(6); // 3 s at a half-second tick
    expect(me.tierOf(mug)).toBe('hand');
    // The beat lands: the act runs.
    const land = state.weaponSwitch!.getLanding()!;
    state.weaponSwitch = null;
    land();
    await new Promise((r) => setTimeout(r, 0));
    expect(mug.getContainer()).toBe(pouch);
  });

  it('a second hand act while one is live is `already-switching`', () => {
    const { me } = fight();
    expect(me.beginHandAct(3, () => {}).ok).toBe(true);
    expect(me.beginHandAct(3, () => {})).toEqual({ ok: false, reason: 'already-switching' });
  });

  it('the prices: a holster is the draw, a pocket or the floor a reach, a pack off the switch dial; unwield a reach', () => {
    const { room, me, plan } = fight();
    const holster = pack('holster', 0.3, [0.12, 0.08, 0.3]);
    holster.setSlotClaims({ [plan]: ['waist'] });
    me.seatInSlot(holster as never, 'waist');
    const pistol = tool('pistol', 1, [0.03, 0.06, 0.2]);
    ContainmentApi.move(pistol, holster);
    holster.setShapedTo('/stuff/thing/arms/flintlock-pistol');
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    const key = tool('key', 0.02, [0.06, 0.025, 0.003]);
    ContainmentApi.move(key, pouch);
    const stone = tool('stone', 1);
    ContainmentApi.move(stone, room);
    expect(me.handActSeconds(key)).toBe(3);
    expect(me.handActSeconds(stone)).toBe(3);
    expect(me.handActSeconds(pistol)).toBe(1.5); // a shaped holder: the draw
    const held = hold(me, plan, tool('mug', 0.35));
    expect(me.handActSeconds(held, me)).toBe(3); // unwield: a reach
    const rucksack = wornBag(me, plan, 'rucksack', 'back');
    expect(me.handActSeconds(rucksack, 'take-off')).toBe(6);
    expect(me.handActSeconds(pouch, 'unfasten')).toBe(3);
  });

  it('outside a session every act lands at once', async () => {
    const room = makeStuff(() => new Location());
    const { me, plan } = makeBody();
    ContainmentApi.move(me, room);
    const pouch = wornBag(me, plan, 'pouch', 'torso');
    pouch.setDimensions({ width: 0.3, depth: 0.15, height: 0.3 });
    const mug = hold(me, plan, tool('mug', 0.35, [0.09, 0.09, 0.1]));
    await makeStuff(() => new PutController()).execute(
      { item: one(mug, 'mug'), target: one(pouch, 'pouch', 'in') } as ModelData as never,
      ctx(me, room, 'put'),
    );
    expect(mug.getContainer()).toBe(pouch);
  });
});
