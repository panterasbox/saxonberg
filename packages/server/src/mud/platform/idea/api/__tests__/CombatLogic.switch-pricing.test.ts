/**
 * ⭐ Combat prices its own switch (size and carrying W8; D16): a carrier's
 * switch costs what its holder sets — a sheath is the draw (1.5 s), an open
 * pouch a reach (3 s); a shut one is refused before any beat. One
 * half only (D-W10-3): nothing is put away for you, so a hand in the way is
 * a refusal, never a price. Read off the switch's beats at a half-second tick.
 */
import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../../../api/stuff';
import { ContainmentApi } from '../../../../api/containment';
import { CombatApi } from '../../../../api/combat';
import { AppApi } from '../../../../api/app';
import { EventApi } from '../../../../api/event';
import { SchedulerApi } from '../../../../api/scheduler';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import { CombatTerms } from '../../../../lib/combat/CombatTerms';
import type { CombatSession } from '../../../../lib/combat/CombatSession';
import { installV1QuantityMarshallers } from '../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeBody, tool, hold, wornBag } from '../../../../lib/slot/__tests__/carrying-fixture';
import { makeStuff, stampTemplatePathForTest } from '../../../../lib/security/__tests__/test-setup';
import EventRegistry from '../../EventRegistry';
import Location from '../../../../lib/location/Location';

const opened: CombatSession[] = [];

/** Beats a switch to `item` takes, at a half-second tick: seconds × 2. */
function beatsTo(me: ReturnType<typeof makeBody>['me'], item: Parameters<typeof me.ready>[0]): number {
  const s = CombatApi.sessionFor(me)!;
  const state = s.getState(me)!;
  state.weaponSwitch = null;
  expect(me.beginWeaponSwitch(item).ok).toBe(true);
  return state.weaponSwitch!.getRemaining();
}

describe('CombatLogic — a carrier\'s switch is priced by its holders', () => {
  beforeEach(async () => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    SchedulerApi._clearAllForTesting();
    // The fight's events need the registry (the CombatLogic suite's boot).
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

  it('a sheath is the draw; an open pouch a reach; a hand in the way is a refusal', () => {
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

    const dagger = tool('dagger', 0.4);
    dagger.setSlotClaims({ [plan]: ['sidearm'] });
    me.seatInSlot(dagger, 'sidearm');
    expect(beatsTo(me, dagger)).toBe(3); // 1.5 s

    const pouch = wornBag(me, plan, 'pouch', 'torso');
    const bandage = tool('bandage', 0.1);
    ContainmentApi.move(bandage, pouch);
    expect(beatsTo(me, bandage)).toBe(6); // 3 s
    // A shut pouch is no longer priced slower: it is refused before any
    // beat (`canReach` — `open` it first, its own beat; D-W10-12).

    // Both hands full: `ready` refuses before any switch — no price.
    hold(me, plan, tool('torch', 0.5), 'hand:right');
    hold(me, plan, tool('club', 1), 'hand:left');
    const state = CombatApi.sessionFor(me)!.getState(me)!;
    state.weaponSwitch = null;
    const r = me.ready(dagger);
    expect(r !== null && !r.ok ? r.reason : null).toBe('hands-needed');
    expect(state.weaponSwitch).toBeNull();
  });
});
