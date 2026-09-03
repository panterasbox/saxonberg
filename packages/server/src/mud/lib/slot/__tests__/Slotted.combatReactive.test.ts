/**
 * Slotted × CombatReactive — the arming witness chain (combat-hooks
 * DECISION C): `onWielded` fires from `occupy` (per slot — a 2H claim
 * hears it once per claimed slot), `onUnwielded` from
 * `vacate`/`vacateSole` AFTER the generic `onSlotReleased` witness, and
 * through `cleanupOnDestruct` / the host `occupyAll` restore path.
 * A non-CombatReactive occupant fires nothing.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { SlottedMixin } from '../Slotted';
import type { Slotted } from '../Slotted';
import { SlottableMixin } from '../Slottable';
import { CombatReactiveMixin } from '../../combat/CombatReactive';
import type { CombatHookContext } from '../../combat/CombatHookContext';
import type { InflictSpec } from '../../../api/condition';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class Body extends SlottedMixin(Idea) {
  constructor() {
    super();
    this.staticSlots = [
      { name: 'hand:left', accepts: 'SlottableMixin', capacity: 1 },
      { name: 'hand:right', accepts: 'SlottableMixin', capacity: 1 },
    ];
  }
}

class PlainItem extends SlottableMixin(Idea) {
  public released: string[] = [];
  onSlotReleased?(_host: unknown, slotName: string): void {
    this.released.push(slotName);
  }
}

class ReactiveItem extends CombatReactiveMixin(SlottableMixin(Idea)) {
  /** Interleaved event log — proves witness ordering. */
  public events: string[] = [];
  onSlotReleased?(_host: unknown, slotName: string): void {
    this.events.push(`released:${slotName}`);
  }
  onWielded(host: Stuff & Slotted, slot: string): void {
    this.events.push(`wielded:${slot}`);
    super.onWielded(host, slot);
  }
  onUnwielded(host: Stuff & Slotted, slot: string): void {
    this.events.push(`unwielded:${slot}`);
    super.onUnwielded(host, slot);
  }
  // Type surface exercised only — never dispatched here.
  augmentInflict(spec: InflictSpec, ctx: CombatHookContext): InflictSpec {
    return super.augmentInflict(spec, ctx);
  }
}

describe('Slotted × CombatReactive — the arming witnesses', () => {
  let body: Body;

  beforeEach(() => {
    StuffApi.clearAll();
    body = makeStuff(() => new Body());
  });

  it('occupy fires onWielded after the successful add', () => {
    const item = makeStuff(() => new ReactiveItem());
    body.occupy(item, 'hand:left');
    expect(item.events).toEqual(['wielded:hand:left']);
    // The add really happened first — the item is in the slot.
    expect(body.getOccupant('hand:left')).toBe(item);
  });

  it('a failed occupy fires nothing', () => {
    const item = makeStuff(() => new ReactiveItem());
    expect(() => body.occupy(item, 'nope')).toThrow(/unknown slot/);
    expect(item.events).toEqual([]);
  });

  it('a two-slot (2H) claim fires once per slot — symmetric on release', () => {
    const item = makeStuff(() => new ReactiveItem());
    // The restore/wield chokepoint — the host's occupyAll is exactly what
    // WieldController and the persistence spine's re-wear both call, so
    // a restored clone being armed fires the same witnesses.
    body.occupyAll(item, ['hand:left', 'hand:right']);
    expect(item.events).toEqual(['wielded:hand:left', 'wielded:hand:right']);

    item.events.length = 0;
    body.vacate('hand:left', item);
    body.vacate('hand:right', item);
    expect(item.events).toEqual([
      'released:hand:left',
      'unwielded:hand:left',
      'released:hand:right',
      'unwielded:hand:right',
    ]);
  });

  it('vacate fires onUnwielded AFTER onSlotReleased (generic first)', () => {
    const item = makeStuff(() => new ReactiveItem());
    body.occupy(item, 'hand:left');
    item.events.length = 0;
    body.vacate('hand:left', item);
    expect(item.events).toEqual([
      'released:hand:left',
      'unwielded:hand:left',
    ]);
  });

  it('vacateSole fires the same ordered pair', () => {
    const item = makeStuff(() => new ReactiveItem());
    body.occupy(item, 'hand:right');
    item.events.length = 0;
    body.vacateSole('hand:right');
    expect(item.events).toEqual([
      'released:hand:right',
      'unwielded:hand:right',
    ]);
  });

  it('cleanupOnDestruct routes through vacate — onUnwielded fires', () => {
    const item = makeStuff(() => new ReactiveItem());
    body.occupy(item, 'hand:left');
    item.events.length = 0;
    StuffApi.destruct(body);
    expect(item.events).toEqual([
      'released:hand:left',
      'unwielded:hand:left',
    ]);
  });

  it('a non-CombatReactive occupant fires no combat witnesses', () => {
    const plain = makeStuff(() => new PlainItem());
    body.occupy(plain, 'hand:left');
    body.vacate('hand:left', plain);
    // Only the generic witness fired; nothing threw.
    expect(plain.released).toEqual(['hand:left']);
  });
});
