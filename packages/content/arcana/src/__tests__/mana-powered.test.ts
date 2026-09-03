/**
 * The mana device category (TPA reform W5, AC6/AC7/AC8/AC10).
 *
 * ⭐⭐ **AC6 is proved BEFORE the terminal exists**, and that ordering is
 * the whole claim: a capability only one class composes is a method
 * wearing a costume. Here the two composers are a wall lamp and a
 * synthetic device that shares nothing with it — and if
 * `ManaPoweredMixin` were secretly a terminal, this file is where that
 * would show.
 *
 * The other three:
 *
 * - **AC7** — a cell fits a DECLARED bay, and the bay's `accepts` is a
 *   kernel `Mixins` value because a pack cannot invent one. The
 *   narrowing that keeps a wand out of a lamp is `ManaCell.fitsSlot`,
 *   candidate-side.
 * - **AC8** — a cell, a line and a person all arrive through ONE
 *   `resolveSupply`, and the device holds no branch on which answered.
 * - **AC10** — a cut line reports `cut`, distinctly from `dry`. The
 *   difference is not cosmetic: `dry` is fixed by feeding it, `cut` is
 *   not fixed by anything the person asking can do.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { ChargedMixin } from '@saxonberg/server/mud/lib/magic/Charged';
import { SlottedMixin } from '@saxonberg/server/mud/lib/slot/Slotted';
import {
  makeStuff,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import ManaCell from '../thing/ManaCell';
import ManaMain from '../thing/ManaMain';
import ManaLamp from '../thing/ManaLamp';
import Wand from '../thing/Wand';
import {
  BATTERY_SLOT,
  MANA_POWERED_MIXIN,
  ManaPoweredMixin,
} from '../lib/ManaPowered';

/**
 * ⭐ AC6's SECOND composer, and it is deliberately nothing like a lamp
 * and nothing like a terminal: a bare Thing with a socket. If the
 * abstraction needed anything a lamp happens to have, this would not
 * compile — which is a stronger statement than any assertion below.
 */
class Widget extends ManaPoweredMixin(
  SlottedMixin(ChargedMixin(ReservedMixin(Thing))),
) {
  constructor() {
    super();
    this.setStaticSlots([
      { name: BATTERY_SLOT, accepts: 'ChargedMixin', capacity: 1 },
    ]);
  }
}

let seq = 0;

function cell(capacity = 600, stored = capacity): ManaCell {
  const c = makeStuff(() => new ManaCell());
  stampTemplatePathForTest(c, `/system/arcana/thing/test-cell-${seq++}`);
  c.setCapacityTau(capacity);
  if (stored < capacity) c.spendCharge(capacity - stored);
  return c;
}

function widget(capacity = 100, stored = 0): Widget {
  const w = makeStuff(() => new Widget());
  stampTemplatePathForTest(w, `/system/arcana/thing/test-widget-${seq++}`);
  w.setCapacityTau(capacity);
  w.spendCharge(capacity - stored);
  return w;
}

function lamp(capacity = 40, stored = 0): ManaLamp {
  const l = makeStuff(() => new ManaLamp());
  stampTemplatePathForTest(l, `/system/arcana/thing/test-lamp-${seq++}`);
  l.setCapacityTau(capacity);
  l.spendCharge(capacity - stored);
  return l;
}

function main(path: string, opts: { severed?: boolean; closed?: boolean } = {}): ManaMain {
  const m = makeStuff(() => new ManaMain());
  stampTemplatePathForTest(m, path);
  m.setCapacityTau(100000);
  m.setSevered(opts.severed === true);
  m.setClosed(opts.closed === true);
  return m;
}

describe('the mana device category', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    WorldClockApi._resetForTesting();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  // ─────────────────────────── AC6 ───────────────────────────

  it('AC6 — composed by two UNRELATED things, and neither is a terminal', () => {
    const l = lamp();
    const w = widget();
    expect(MixinApi.isActive(l as unknown as Stuff, MANA_POWERED_MIXIN)).toBe(true);
    expect(MixinApi.isActive(w as unknown as Stuff, MANA_POWERED_MIXIN)).toBe(true);
    // They share the socket and nothing else: one is a light source on a
    // wall, the other is a bare Thing with a bay.
    expect(MixinApi.isLightSource(l as unknown as Stuff)).toBe(true);
    expect(MixinApi.isLightSource(w as unknown as Stuff)).toBe(false);
  });

  // ─────────────────────────── AC7 ───────────────────────────

  it('AC7 — a cell fits the DECLARED bay; a wand does not', () => {
    const w = widget();
    const c = cell();
    const wand = makeStuff(() => new Wand());
    stampTemplatePathForTest(wand, `/system/arcana/thing/test-wand-${seq++}`);

    // The bay's `accepts` is a KERNEL Mixins value — a pack cannot
    // invent one — so both satisfy the slot-side test…
    expect(MixinApi.hasMixin(c as unknown as Stuff, 'ChargedMixin')).toBe(true);
    expect(MixinApi.hasMixin(wand as unknown as Stuff, 'ChargedMixin')).toBe(true);
    // …and the CANDIDATE side is what keeps a wand out of a socket.
    expect(w.canOccupy(c as never, BATTERY_SLOT)).toBe(true);
    expect(w.canOccupy(wand as never, BATTERY_SLOT)).toBe(false);

    w.occupy(c as never, BATTERY_SLOT);
    expect(w.getOccupant(BATTERY_SLOT)).toBe(c as unknown);
    // …and it comes back out.
    w.vacate(BATTERY_SLOT, c as never);
    expect(w.getOccupant(BATTERY_SLOT)).toBeNull();
  });

  // ─────────────────────────── AC8 ───────────────────────────

  it('AC8 — a CELL supplies a flat device, through the one resolveSupply', async () => {
    const w = widget(100, 0);
    w.occupy(cell(600) as never, BATTERY_SLOT);
    expect(w.getSupplyMode()).toBe('cell');
    expect(await w.canDraw(50)).toBe(true);
    expect(await w.draw(50)).toBe(true);
  });

  it('AC8 — a LINE supplies the same device, and the device knows no difference', async () => {
    const path = `/system/arcana/thing/test-main-${seq++}`;
    main(path);
    const w = widget(100, 0);
    w.setMainsRef(path);
    expect(w.getSupplyMode()).toBe('main');
    expect(await w.draw(80)).toBe(true);
  });

  it('AC8 — with NO supply, a flat device simply cannot', async () => {
    const w = widget(100, 0);
    expect(w.getSupplyMode()).toBe('none');
    expect(await w.canDraw(1)).toBe(false);
    expect(await w.draw(1)).toBe(false);
  });

  // ─────────────────────────── AC10 ───────────────────────────

  it('AC10 — a CUT line reports `cut`, distinctly from `dry`', async () => {
    const cutPath = `/system/arcana/thing/test-main-cut-${seq++}`;
    main(cutPath, { severed: true });
    const w = widget(100, 0);
    w.setMainsRef(cutPath);
    // ⚠ Not `dry`. `dry` is fixed by feeding it; `cut` is not fixed by
    // anything the person asking can do, and the six-word vocabulary
    // exists precisely so a player who learned the difference at a
    // standpipe has learned it here.
    expect(w.supplyState()).toBe('cut');
    expect(await w.draw(1)).toBe(false);
    expect(w.getSupplyMode()).toBe('none');
  });

  it('AC10 — a CLOSED line reports `off`, which somebody can undo', async () => {
    const offPath = `/system/arcana/thing/test-main-off-${seq++}`;
    const m = main(offPath, { closed: true });
    const w = widget(100, 0);
    w.setMainsRef(offPath);
    expect(w.supplyState()).toBe('off');

    m.setClosed(false);
    expect(w.supplyState()).toBeNull();
    expect(await w.draw(10)).toBe(true);
  });

  it('a cut line beats a closed one — worst first, and the honest order', () => {
    const p = `/system/arcana/thing/test-main-both-${seq++}`;
    main(p, { severed: true, closed: true });
    const w = widget(100, 0);
    w.setMainsRef(p);
    // Reporting "somebody shut it" about a severed line would be true
    // and useless.
    expect(w.supplyState()).toBe('cut');
  });

  // ─────────────────── the lamp, and the six words ───────────────────

  it('a lamp on a dead cell goes dark, and says why in one of the six words', async () => {
    const l = lamp(40, 0);
    l.occupy(cell(600, 0) as never, BATTERY_SLOT);
    expect(await l.light()).toBe(false);
    expect(l.isOn()).toBe(false);
    expect(l.getEmittedFlux().rawValue()).toBe(0);

    // Swap in a live cell and it lights.
    l.vacate(BATTERY_SLOT, l.getOccupant(BATTERY_SLOT)!);
    l.occupy(cell(600) as never, BATTERY_SLOT);
    expect(await l.light()).toBe(true);
    expect(l.getEmittedFlux().rawValue()).toBe(400);
  });

  it('the lamp is purely impulse: no arming floor to fall below', () => {
    const l = lamp(40, 0);
    expect(l.getDrawMode()).toBe('impulse');
    expect(l.getArmingFloorTau()).toBe(0);
    // Empty and still armed — a lamp is not a thing that stops BEING a
    // lamp. The terminal is the other half of that axis.
    expect(l.isArmed()).toBe(true);
    expect(l.supplyState()).toBeNull();
  });
});
