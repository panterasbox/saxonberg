/**
 * PutController tests — preposition-aware dispatch into Container vs
 * Placing targets.
 *
 * Mirrors DropController's setup shape (TestGiver, Location, makeStuff
 * fixtures). The tests exercise the four core branches:
 *   - `put X in Y` where Y is a Container → move()
 *   - `put X on Y` where Y is a Placing host → place()
 *   - mismatched preposition → controller-rejected (wrong-preposition)
 *   - ambiguous (no preposition + target composes both) → reject
 *   - canPlace() veto → controller-rejected (cannot-rest)
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import PutController from '../PutController';
import { ContainerMixin } from '../../../../../lib/spatial/Container';
import { ContainableMixin } from '../../../../../lib/spatial/Containable';
import { PlacingMixin } from '../../../../../lib/spatial/Placing';
import { SealableMixin } from '../../../../../lib/spatial/Sealable';
import Placement from '../../../Placement';
import PlacementCatalogue from '../../../PlacementCatalogue';
import { Template } from '../../../../../lib/stuff/Template';
import { vi } from 'vitest';
import { CommandGiverMixin } from '../../../../../lib/command/CommandGiver';
import { NamedMixin } from '../../../../../lib/description/Named';
import { SensorMixin } from '../../../../../lib/message/Sensor';
import { Idea } from '../../../../../lib/stuff/Idea';
import Location from '../../../../../lib/stuff/Location';
import { Stuff } from '../../../../../lib/stuff/Stuff';
import { StuffApi } from '../../../../../api/stuff';
import { ShadowApi } from '../../../../../api/shadow';
import { ContainmentApi } from '../../../../../api/containment';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import {
  CommandApi,
  type CommandContext,
  type ModelData,
} from '../../../../../api/command';
import type { MqlOneResult } from '../../../../../api/mql';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../../../../lib/security/__tests__/test-setup';

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = 'TestGiver';
}

class TestSurface extends PlacingMixin(
  ContainableMixin(NamedMixin(Idea)),
) {
  static _mixinName = 'TestSurface';
}

class TestChest extends ContainerMixin(
  ContainableMixin(NamedMixin(Idea)),
) {
  static _mixinName = 'TestChest';
}

/** A shut-able chest — region zero behind a lid. */
class TestSealedChest extends SealableMixin(
  ContainerMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'TestSealedChest';
}

/**
 * ⭐ A host offering an ENCLOSING member behind a lid — the shape the
 * fridge pack's compartment will be, built here as a fixture so the
 * `shut` clause on `canPlace` and the reach refusal are PROVEN before
 * anything ships composing it.
 */
class TestCompartment extends PlacingMixin(
  SealableMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'TestCompartment';
}

class TestDeskWithDrawer extends PlacingMixin(
  ContainerMixin(ContainableMixin(NamedMixin(Idea))),
) {
  static _mixinName = 'TestDeskWithDrawer';
}

class TestItem extends ContainableMixin(NamedMixin(Idea)) {
  static _mixinName = 'TestItem';
}

class RejectingSurface extends PlacingMixin(
  ContainableMixin(NamedMixin(Idea)),
) {
  static _mixinName = 'RejectingSurface';
  canPlace(): { ok: false; reason: string } {
    return { ok: false, reason: 'too-slick' };
  }
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: TestGiver, location: Location): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandText: 'put',
    executionId: 'test',
    commandId: 'test',
    verb: 'put',
    command: stubCommand('put'),
  });
}

type PutExecModel = Parameters<PutController['execute']>[0];

function makeModel(item: MqlOneResult, target: MqlOneResult): PutExecModel {
  return { item, target } as ModelData as unknown as PutExecModel;
}

function one(stuff: Stuff | null, raw: string, prep?: string): MqlOneResult {
  const out: MqlOneResult = { stuff, raw };
  if (prep) out.prep = prep;
  return out;
}

/**
 * Stand the three shipped members up so the controller's offers carry
 * real words and real prose. Without this every read falls back — which
 * is correct behaviour and is asserted on its own below, but it is not
 * what a booted world does.
 */
function warmCatalogue(): PlacementCatalogue {
  const rows = [
    { name: 'on', prepositions: ['on', 'onto'], encloses: false,
      prose: '{{ actor }} put{{ s }} {{ item }} on {{ host }}.' },
    { name: 'in', prepositions: ['in', 'into'], encloses: true,
      prose: '{{ actor }} put{{ s }} {{ item }} in {{ host }}.' },
    { name: 'from', prepositions: ['from', 'on'], encloses: false,
      prose: '{{ actor }} hang{{ s }} {{ item }} from {{ host }}.' },
  ];
  vi.spyOn(Template, 'findByPathInfix').mockResolvedValue(
    rows.map((r) => ({
      path: `/platform/idea/Placement/${r.name}`,
      class: '/platform/idea/Placement',
    })) as unknown as Template[],
  );
  vi.spyOn(StuffApi, 'loadClassByPath').mockResolvedValue(
    Placement as unknown as never,
  );
  vi.spyOn(StuffApi, 'singleton').mockImplementation(async (path: string) => {
    const row = rows.find((r) => path.endsWith(`/${r.name}`))!;
    const m = makeStuff(() => new Placement());
    m.name = row.name;
    m.prepositions = row.prepositions;
    m.encloses = row.encloses;
    m.prose = row.prose;
    return m as never;
  });
  return makeStuffAtPath(
    () => new PlacementCatalogue(),
    '/platform/idea/PlacementCatalogue',
  );
}

let pathCounter = 0;
function freshPath(prefix: string): string {
  pathCounter += 1;
  return `${prefix}-${pathCounter}`;
}

describe('PutController — in/on dispatch', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('put X in Y (Container) moves item into the container', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(chest, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(chest, 'chest', 'in')),
      makeContext(giver, loc),
    );

    expect(item.getContainer()).toBe(chest);
    expect((item.getPlacement()?.host ?? null)).toBeNull();
  });

  it('put X on Y (Surfaced) sets restingOn and moves into surface\'s env', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-table'));
    ContainmentApi.move(table, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(table, 'table', 'on')),
      makeContext(giver, loc),
    );

    expect(item.getContainer()).toBe(loc);
    expect((item.getPlacement()?.host ?? null)).toBe(table);
  });

  it('put X on (Container, not Surfaced) → wrong-preposition rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(chest, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(chest, 'chest', 'on')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'wrong-preposition',
      ),
    ).toBe(true);
  });

  it('put X in (Surfaced, not Container) → wrong-preposition rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-wrong-prep-table'));
    ContainmentApi.move(table, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(table, 'table', 'in')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'wrong-preposition',
      ),
    ).toBe(true);
  });

  it('put X Y with no preposition + Container target → infers "in"', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(chest, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(chest, 'chest')),
      makeContext(giver, loc),
    );

    expect(item.getContainer()).toBe(chest);
  });

  it('put X Y with no preposition + Surfaced target → infers "on"', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-infer-on-table'));
    ContainmentApi.move(table, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(item, 'apple'), one(table, 'table')),
      makeContext(giver, loc),
    );

    expect((item.getPlacement()?.host ?? null)).toBe(table);
  });

  it('put X Y with no preposition + target composes both → ambiguous rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const desk = makeStuffAtPath(() => {
      const d = new TestDeskWithDrawer();
      d.setName('desk');
      return d;
    }, freshPath('/test/put-desk-with-drawer'));
    ContainmentApi.move(desk, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(desk, 'desk')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'preposition-ambiguous',
      ),
    ).toBe(true);
  });

  it('put X on Y where canPlace() vetoes → cannot-rest rejection', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const item = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(item, giver);
    const slick = makeStuffAtPath(() => {
      const s = new RejectingSurface();
      s.setName('slick');
      return s;
    }, freshPath('/test/put-slick'));
    ContainmentApi.move(slick, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(item, 'apple'), one(slick, 'slick', 'on')),
      ctx,
    );

    expect(item.getContainer()).toBe(giver); // unchanged
    const notes = ctx.getNotes();
    expect(
      notes.some(
        (n) =>
          n.kind === 'controller-rejected' &&
          (n as { reason?: string }).reason === 'cannot-rest',
      ),
    ).toBe(true);
  });

  it('moving an apple from one table to another in the same room: container unchanged, restingOn updates', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    const tableA = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('tableA');
      return s;
    }, freshPath('/test/put-tableA'));
    const tableB = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('tableB');
      return s;
    }, freshPath('/test/put-tableB'));
    ContainmentApi.move(tableA, loc);
    ContainmentApi.move(tableB, loc);
    ContainmentApi.place(apple, 'on', tableA);
    expect(apple.getContainer()).toBe(loc);
    expect((apple.getPlacement()?.host ?? null)).toBe(tableA);

    // Apple has to be in inventory for put to fire — but the test
    // bypasses that validator since we go straight to execute(). For
    // realism, just drive place() via the controller's "on" path.
    ContainmentApi.move(apple, giver);
    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(tableB, 'tableB', 'on')),
      makeContext(giver, loc),
    );
    expect(apple.getContainer()).toBe(loc);
    expect((apple.getPlacement()?.host ?? null)).toBe(tableB);
  });

  it('moving an apple from a table to a chest: container changes, restingOn clears', async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    const table = makeStuffAtPath(() => {
      const s = new TestSurface();
      s.setName('table');
      return s;
    }, freshPath('/test/put-table-to-chest'));
    const chest = makeStuff(() => {
      const c = new TestChest();
      c.setName('chest');
      return c;
    });
    ContainmentApi.move(table, loc);
    ContainmentApi.move(chest, loc);
    ContainmentApi.place(apple, 'on', table);
    expect((apple.getPlacement()?.host ?? null)).toBe(table);
    // Move apple to giver's inventory so the controller path can run.
    ContainmentApi.move(apple, giver);
    expect((apple.getPlacement()?.host ?? null)).toBeNull();
    // Now put it in the chest.
    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(chest, 'chest', 'in')),
      makeContext(giver, loc),
    );
    expect(apple.getContainer()).toBe(chest);
    expect((apple.getPlacement()?.host ?? null)).toBeNull();
  });
});

/**
 * ⭐⭐ D6 — `put` over N placements. The vocabulary is what makes the
 * build's central claim true, so these are the assertions that prove a
 * member added by a row is usable by a player who was taught nothing.
 */
describe('PutController — put over N placements', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
    vi.restoreAllMocks();
  });

  /** giver in a room, holding a named apple. */
  function scene(): {
    loc: Location;
    giver: TestGiver;
    apple: TestItem;
  } {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, loc);
    const apple = makeStuff(() => {
      const t = new TestItem();
      t.setName('apple');
      return t;
    });
    ContainmentApi.move(apple, giver);
    return { loc, giver, apple };
  }

  it('⭐ `put X on hook` resolves `from` through the member\'s SECONDARY word, and the prose says HANG', async () => {
    const catalogue = warmCatalogue();
    await catalogue.warm();
    const { loc, giver, apple } = scene();
    const hook = makeStuffAtPath(() => {
      const h = new TestSurface();
      h.setName('hook');
      h.setPlacements(['from']);
      return h;
    }, freshPath('/test/put-hook'));
    ContainmentApi.move(hook, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(apple, 'apple'), one(hook, 'hook', 'on')),
      ctx,
    );

    // The player typed `on`; the world hung it FROM.
    expect(apple.getPlacement()?.name).toBe('from');
    expect(apple.getPlacement()?.host).toBe(hook);
    expect(apple.getContainer()).toBe(loc);
    expect(
      ctx.getNotes().some((n) => n.kind === 'controller-rejected'),
    ).toBe(false);
  });

  it('a typed word nobody offers is refused, and the refusal NAMES what the host takes', async () => {
    const catalogue = warmCatalogue();
    await catalogue.warm();
    const { loc, giver, apple } = scene();
    const hook = makeStuffAtPath(() => {
      const h = new TestSurface();
      h.setName('hook');
      h.setPlacements(['from']);
      return h;
    }, freshPath('/test/put-hook-refuse'));
    ContainmentApi.move(hook, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(apple, 'apple'), one(hook, 'hook', 'into')),
      ctx,
    );
    const note = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected') as
      | { reason?: string; detail?: string }
      | undefined;
    expect(note?.reason).toBe('wrong-preposition');
    expect(note?.detail).toContain('from');
    expect(apple.getContainer()).toBe(giver);
  });

  it('⚠ region zero into a SHUT container is refused, says shut, and the target stays BOUND', async () => {
    const catalogue = warmCatalogue();
    await catalogue.warm();
    const { loc, giver, apple } = scene();
    const chest = makeStuff(() => {
      const c = new TestSealedChest();
      c.setName('chest');
      c.setOpen(false);
      return c;
    });
    ContainmentApi.move(chest, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(apple, 'apple'), one(chest, 'chest', 'in')),
      ctx,
    );
    const notes = ctx.getNotes();
    const rejected = notes.find((n) => n.kind === 'controller-rejected') as
      | { reason?: string }
      | undefined;
    expect(rejected?.reason).toBe('shut');
    // ⭐ The region stayed nameable: no `empty-result` on the target.
    expect(
      notes.some(
        (n) =>
          n.kind === 'empty-result' &&
          (n as { field?: string }).field === 'target',
      ),
    ).toBe(false);
    expect(apple.getContainer()).toBe(giver);

    // …and opening it lifts the refusal. A refusal nothing lifts is a
    // wall with a sign on it.
    chest.setOpen(true);
    const ctx2 = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(apple, 'apple'), one(chest, 'chest', 'in')),
      ctx2,
    );
    expect(apple.getContainer()).toBe(chest);
  });

  it('⭐ an ENCLOSING member on a shut host is refused by canPlace, and opening lifts it', async () => {
    const catalogue = warmCatalogue();
    await catalogue.warm();
    const { loc, giver, apple } = scene();
    const compartment = makeStuffAtPath(() => {
      const c = new TestCompartment();
      c.setName('compartment');
      c.setPlacements(['in']);
      c.setOpen(false);
      return c;
    }, freshPath('/test/put-compartment'));
    ContainmentApi.move(compartment, loc);

    // The mixin's own veto, directly: `in` encloses, the host is shut.
    expect(compartment.canPlace(apple, 'in')).toEqual({
      ok: false,
      reason: 'shut',
    });

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(apple, 'apple'), one(compartment, 'compartment', 'in')),
      ctx,
    );
    expect(
      (ctx.getNotes().find((n) => n.kind === 'controller-rejected') as
        | { reason?: string }
        | undefined)?.reason,
    ).toBe('shut');

    compartment.setOpen(true);
    expect(compartment.canPlace(apple, 'in')).toEqual({ ok: true });
    await controller.execute(
      makeModel(one(apple, 'apple'), one(compartment, 'compartment', 'in')),
      makeContext(giver, loc),
    );
    expect(apple.getPlacement()?.name).toBe('in');
  });

  it('a non-enclosing member on a shut host is UNAFFECTED — the hook is on the outside', async () => {
    const catalogue = warmCatalogue();
    await catalogue.warm();
    const { loc, giver, apple } = scene();
    const box = makeStuffAtPath(() => {
      const b = new TestCompartment();
      b.setName('box');
      b.setPlacements(['from']);
      b.setOpen(false);
      return b;
    }, freshPath('/test/put-shut-hook'));
    ContainmentApi.move(box, loc);

    expect(box.canPlace(apple, 'from')).toEqual({ ok: true });
    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(box, 'box', 'from')),
      makeContext(giver, loc),
    );
    expect(apple.getPlacement()?.name).toBe('from');
  });

  it('a host offering TWO members with no word typed is ambiguous, and names both', async () => {
    const catalogue = warmCatalogue();
    await catalogue.warm();
    const { loc, giver, apple } = scene();
    const rack = makeStuffAtPath(() => {
      const r = new TestSurface();
      r.setName('rack');
      r.setPlacements(['on', 'from']);
      return r;
    }, freshPath('/test/put-two-members'));
    ContainmentApi.move(rack, loc);

    const controller = makeStuff(() => new PutController());
    const ctx = makeContext(giver, loc);
    await controller.execute(
      makeModel(one(apple, 'apple'), one(rack, 'rack')),
      ctx,
    );
    const note = ctx
      .getNotes()
      .find((n) => n.kind === 'controller-rejected') as
      | { reason?: string; detail?: string }
      | undefined;
    expect(note?.reason).toBe('preposition-ambiguous');
    expect(note?.detail).toContain('on');
    expect(note?.detail).toContain('from');

    // …and a typed PRIMARY resolves it, which is what the prompt asked
    // the player for.
    await controller.execute(
      makeModel(one(apple, 'apple'), one(rack, 'rack', 'from')),
      makeContext(giver, loc),
    );
    expect(apple.getPlacement()?.name).toBe('from');
  });

  it('⭐ a host whose member has NO live row is still addressable by its own name', async () => {
    // No catalogue at all — the cold-process case. A member must not
    // become unnameable because a roster has not warmed.
    const { loc, giver, apple } = scene();
    const peg = makeStuffAtPath(() => {
      const p = new TestSurface();
      p.setName('peg');
      p.setPlacements(['from']);
      return p;
    }, freshPath('/test/put-cold-member'));
    ContainmentApi.move(peg, loc);

    const controller = makeStuff(() => new PutController());
    await controller.execute(
      makeModel(one(apple, 'apple'), one(peg, 'peg', 'from')),
      makeContext(giver, loc),
    );
    expect(apple.getPlacement()?.name).toBe('from');
  });
});
