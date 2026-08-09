/**
 * Witness pattern tests — exercises the optional Witness hooks on
 * Containable / Mobile / Container / Exitable / HasInteractive that
 * fire from the chokepoint Apis (`ContainmentApi.move`,
 * `Mobile.traverse`, `ConnectionApi.transfer` / `detach`).
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { ContainmentApi, ContainmentError } from '../containment';
import { ConnectionApi } from '../connection';
import { ShadowApi } from '../shadow';
import { StuffApi } from '../stuff';
import { Stuff } from '../../lib/stuff/Stuff';
import { Shadow } from '../../lib/stuff/Shadow';
import { Idea } from '../../lib/stuff/Idea';
import {
  ContainableMixin,
  type Containable,
} from '../../lib/spatial/Containable';
import { DestructError, type VetoResult } from '../../lib/errors';
import { ContainerMixin, type Container } from '../../lib/spatial/Container';
import { ExitableMixin, type Exitable } from '../../lib/boundary/Exitable';
import { MobileMixin, type Mobile } from '../../lib/spatial/Mobile';
import Exit from '../../lib/boundary/Exit';
import { HasInteractiveMixin } from '../../lib/connection/HasInteractive';
import Interactive from '../../obj/Interactive';
import { SecurityError } from '../../lib/security/errors';
import { Shadowing } from '../../lib/security/decorators';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class HookableThing extends ContainableMixin(Idea) {
  public moves: Array<[
    (Stuff & Container) | null,
    (Stuff & Container) | null,
  ]> = [];
  public veto: VetoResult | null = null;

  canMove?(_to: (Stuff & Container) | null): VetoResult {
    return this.veto ?? { ok: true };
  }
  onMoved?(
    from: (Stuff & Container) | null,
    to: (Stuff & Container) | null
  ): void {
    this.moves.push([from, to]);
  }
}

class HookableBox extends ContainableMixin(ContainerMixin(Idea)) {
  public adds: Array<Stuff & Containable> = [];
  public removes: Array<Stuff & Containable> = [];
  public addVeto: VetoResult | null = null;
  public removeVeto: VetoResult | null = null;

  canAddContainable?(_item: Stuff & Containable): VetoResult {
    return this.addVeto ?? { ok: true };
  }
  canRemoveContainable?(_item: Stuff & Containable): VetoResult {
    return this.removeVeto ?? { ok: true };
  }
  onContainableAdded?(item: Stuff & Containable): void {
    this.adds.push(item);
  }
  onContainableRemoved?(item: Stuff & Containable): void {
    this.removes.push(item);
  }
}

describe('Containment Witness hooks (ContainmentApi.move)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('fires onContainableAdded on the destination, onContainableRemoved on the source, onMoved on the item', () => {
    const item = makeStuff(() => new HookableThing());
    const source = makeStuff(() => new HookableBox());
    const dest = makeStuff(() => new HookableBox());

    ContainmentApi.move(item, source);
    expect(source.adds).toEqual([item]);
    expect(item.moves).toEqual([[null, source]]);

    ContainmentApi.move(item, dest);
    expect(source.removes).toEqual([item]);
    expect(dest.adds).toEqual([item]);
    expect(item.moves).toHaveLength(2);
    expect(item.moves[1]).toEqual([source, dest]);
  });

  it('detach fires onMoved(from, null) and onContainableRemoved on the source', () => {
    const item = makeStuff(() => new HookableThing());
    const source = makeStuff(() => new HookableBox());
    ContainmentApi.move(item, source);
    ContainmentApi.move(item, null);
    expect(source.removes).toEqual([item]);
    expect(item.moves[1]).toEqual([source, null]);
  });

  it('canAddContainable veto throws ContainmentError and rolls back', () => {
    const item = makeStuff(() => new HookableThing());
    const dest = makeStuff(() => new HookableBox());
    dest.addVeto = { ok: false, reason: 'full' };
    expect(() => ContainmentApi.move(item, dest)).toThrow(ContainmentError);
    expect(item.getContainer()).toBeNull();
    expect(dest.adds).toEqual([]);
  });

  it('canMove veto on the item itself blocks before any other hook fires', () => {
    const item = makeStuff(() => new HookableThing());
    const dest = makeStuff(() => new HookableBox());
    item.veto = { ok: false, reason: 'rooted' };
    expect(() => ContainmentApi.move(item, dest)).toThrow(/rooted/);
    expect(dest.adds).toEqual([]);
  });
});

describe('setContainer lockdown', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('rejects direct setContainer calls from outside ContainmentApi', () => {
    const item = makeStuff(() => new HookableThing());
    const env = makeStuff(() => new HookableBox());
    expect(() => item.setContainer(env)).toThrow(SecurityError);
  });

  it('rejects direct setContainer(null) — detach goes through ContainmentApi.move', () => {
    const item = makeStuff(() => new HookableThing());
    const env = makeStuff(() => new HookableBox());
    ContainmentApi.move(item, env);
    expect(() => item.setContainer(null)).toThrow(SecurityError);
    // The legitimate detach succeeds.
    expect(() => ContainmentApi.move(item, null)).not.toThrow();
  });
});

describe('Traversal Witness hooks (Mobile.traverse)', () => {
  class HookableLocation
    extends ExitableMixin(ContainableMixin(ContainerMixin(Idea)))
    implements Exitable
  {
    public entered: Array<[unknown, Exit]> = [];
    public exited: Array<[unknown, Exit]> = [];
    public enterVeto: VetoResult | null = null;

    canEnter?(_mover: Stuff & Mobile & Containable, _via: Exit): VetoResult {
      return this.enterVeto ?? { ok: true };
    }
    onEntered?(mover: Stuff & Mobile & Containable, via: Exit): void {
      this.entered.push([mover, via]);
    }
    onExited?(mover: Stuff & Mobile & Containable, via: Exit): void {
      this.exited.push([mover, via]);
    }
  }

  class HookableMover extends MobileMixin(ContainableMixin(Idea)) {
    public traverses: Array<Exit> = [];
    public traverseVeto: VetoResult | null = null;

    canTraverse?(_via: Exit): VetoResult {
      return this.traverseVeto ?? { ok: true };
    }
    onTraversed?(via: Exit): void {
      this.traverses.push(via);
    }
  }

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('fires the full hook quartet on a successful traverse', async () => {
    const source = makeStuff(() => new HookableLocation());
    const dest = makeStuff(() => new HookableLocation());
    const mover = makeStuff(() => new HookableMover());
    ContainmentApi.move(mover, source);
    const exit = StuffApi.createSync(() => new Exit({
      direction: 'north',
      source: source as unknown as Stuff & Container,
      destination: dest as unknown as Stuff & Container,
      door: null,
    }));
    await mover.traverse(exit, 'walk');
    expect(mover.traverses).toEqual([exit]);
    expect(source.exited).toHaveLength(1);
    expect(dest.entered).toHaveLength(1);
    expect(mover.getContainer()).toBe(dest);
  });

  it('canEnter veto blocks traversal before move runs', async () => {
    const source = makeStuff(() => new HookableLocation());
    const dest = makeStuff(() => new HookableLocation());
    dest.enterVeto = { ok: false, reason: 'sealed' };
    const mover = makeStuff(() => new HookableMover());
    ContainmentApi.move(mover, source);
    const exit = StuffApi.createSync(() => new Exit({
      direction: 'north',
      source: source as unknown as Stuff & Container,
      destination: dest as unknown as Stuff & Container,
      door: null,
    }));
    await expect(mover.traverse(exit, 'walk')).rejects.toThrow(/sealed/);
    expect(mover.getContainer()).toBe(source);
    expect(dest.entered).toEqual([]);
  });
});

describe('HasInteractive Witness hooks (ConnectionApi)', () => {
  class HookableHolder extends HasInteractiveMixin(Idea) {
    public attaches: Interactive[] = [];
    public detaches = 0;
    public linkdead = 0;
    public restored = 0;

    onConnectionAttached?(conn: Interactive): void {
      this.attaches.push(conn);
    }
    onConnectionDetached?(): void {
      this.detaches++;
    }
    onLinkdead?(): void {
      this.linkdead++;
    }
    onLinkRestored?(): void {
      this.restored++;
    }
  }

  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('fires onConnectionAttached and onLinkRestored on first attach', async () => {
    const holder = makeStuff(() => new HookableHolder());
    const interactive = await StuffApi.create(
      () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never)
    );
    ConnectionApi.transfer(interactive, holder);
    expect(holder.attaches).toEqual([interactive]);
    expect(holder.restored).toBe(1);
    expect(holder.linkdead).toBe(0);
  });

  it('fires onConnectionDetached and onLinkdead on last detach', async () => {
    const holder = makeStuff(() => new HookableHolder());
    const interactive = await StuffApi.create(
      () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never)
    );
    ConnectionApi.transfer(interactive, holder);
    ConnectionApi.detach(interactive);
    expect(holder.detaches).toBe(1);
    expect(holder.linkdead).toBe(1);
  });
});

describe('Witness hooks via shadows', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('a shadow overrides the host onMoved when both are defined', () => {
    class HostItem extends ContainableMixin(Idea) {
      public called: Array<[unknown, unknown]> = [];
      onMoved?(
        from: (Stuff & Container) | null,
        to: (Stuff & Container) | null
      ): void {
        this.called.push([from, to]);
      }
    }
    class WrappingShadow extends Shadow {
      public seen: Array<[unknown, unknown]> = [];
      @Shadowing('onMoved')
      wrap(
        from: (Stuff & Container) | null,
        to: (Stuff & Container) | null
      ): void {
        this.seen.push([from, to]);
        // Don't call down — the host's own hook is replaced.
      }
    }
    const item = makeStuff(() => new HostItem());
    const dest = makeStuff(() => new HookableBox());
    const shadow = makeStuff(() => new WrappingShadow());
    ShadowApi.attach(item, shadow);
    ContainmentApi.move(item, dest);
    expect(shadow.seen).toEqual([[null, dest]]);
    // Host's own hook didn't fire — shadow replaced it.
    expect(item.called).toEqual([]);
  });
});

describe('Destruct Witness hooks (StuffApi.destruct / forceDestruct)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  class DestructHookable extends Idea {
    public veto: VetoResult | null = null;
    public destructCalled = 0;

    canDestruct?(): VetoResult {
      return this.veto ?? { ok: true };
    }
    override onDestruct(): void {
      this.destructCalled += 1;
    }
  }

  it('canDestruct veto throws DestructError and aborts the destroy chain', () => {
    const target = makeStuff(() => new DestructHookable());
    target.veto = { ok: false, reason: 'pinned' };
    expect(() => StuffApi.destruct(target)).toThrow(DestructError);
    expect(() => StuffApi.destruct(target)).toThrow(/pinned/);
    // The witness vetoed, so onDestruct never ran and the object
    // remains live in the registry.
    expect(target.destructCalled).toBe(0);
    expect(target.isDestroyed()).toBe(false);
  });

  it('onDestruct fires while target is still live, then destroy unregisters', () => {
    const target = makeStuff(() => new DestructHookable());
    StuffApi.destruct(target);
    expect(target.destructCalled).toBe(1);
    expect(target.isDestroyed()).toBe(true);
  });

  it('forceDestruct rejects calls from outside DestructController (narrow-entry pattern)', () => {
    // `forceDestruct` carries
    // `@CallSecurity(FromController(DestructController))` — the
    // narrow-entry pattern reserves this entry point for the verb
    // controller. Anything else (including a test file) is denied
    // by the gate before the body runs.
    const target = makeStuff(() => new DestructHookable());
    target.veto = { ok: false, reason: 'pinned' };
    expect(() => StuffApi.forceDestruct(target)).toThrow(
      /FromModule.*DestructController/,
    );
    expect(target.isDestroyed()).toBe(false);
    expect(target.destructCalled).toBe(0);
  });

  it('canDestruct absent → destruct proceeds normally', () => {
    class Bare extends Idea {}
    const target = makeStuff(() => new Bare());
    expect(() => StuffApi.destruct(target)).not.toThrow();
    expect(target.isDestroyed()).toBe(true);
  });
});

describe('forceMove narrow-entry gating (ContainmentApi.forceMove)', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('rejects calls from outside the teleport/goto controllers', () => {
    // `forceMove` carries
    // `@CallSecurity(FromController(TeleportController, GotoController))`.
    // Anything else (including a test file) is denied by the gate
    // before the body runs.
    const item = makeStuff(() => new HookableThing());
    const dest = makeStuff(() => new HookableBox());
    expect(() => ContainmentApi.forceMove(item, dest)).toThrow(/AnyOf/);
    expect(item.getContainer()).toBeNull();
  });
});
