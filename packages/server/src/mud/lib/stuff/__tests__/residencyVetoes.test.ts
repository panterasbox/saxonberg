/**
 * Phase 4 — the canEvict veto roster. Each veto reads the object's own
 * knowledge; base Stuff stays permissive and vetoes compose via super.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { EvictionContext } from '../Stuff';
import Thing from '../Thing';
import Location from '../Location';
import Exit from '../../boundary/Exit';
import { ContainerMixin } from '../../spatial/Container';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { WarrenMemberMixin } from '../../location/WarrenMember';
import { BehavedMixin } from '../../behavior/Behaved';
import type { BehaviorSpec } from '../../behavior/brain';
import { Shadow } from '../Shadow';
import { Shadowing } from '../../security/decorators';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import TopicCatalogue from '../../../obj/TopicCatalogue';
import { makeStuff } from '../../security/__tests__/test-setup';

const IDLE: EvictionContext = { idleMs: 9_000_000_000, reason: 'idle' };

class Box extends ContainerMixin(Thing) {}
class Holder extends HasInteractiveMixin(ContainerMixin(Thing)) {}
class Bot extends BehavedMixin(Thing) {}
class MemberRoom extends WarrenMemberMixin(Location) {}
class TestShadow extends Shadow {
  @Shadowing('getPresentation')
  public decorate(): string {
    return 'shadowed';
  }
}

describe('residency veto roster', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('Container: vetoes while non-empty, cullable when empty', () => {
    const box = makeStuff(() => new Box());
    const thing = makeStuff(() => new Thing());
    expect(box.canEvict(IDLE)).toEqual({ ok: true }); // empty → falls through

    ContainmentApi.move(thing, box);
    expect(box.canEvict(IDLE).ok).toBe(false); // non-empty → veto

    ContainmentApi.move(thing, null);
    expect(box.canEvict(IDLE)).toEqual({ ok: true }); // emptied → cullable
  });

  it('Containable: vetoes while inside an interactive holder', () => {
    const holder = makeStuff(() => new Holder());
    const thing = makeStuff(() => new Thing());
    expect(thing.canEvict(IDLE)).toEqual({ ok: true }); // free → cullable

    ContainmentApi.move(thing, holder);
    expect(thing.canEvict(IDLE).ok).toBe(false); // inside holder → veto
  });

  it('HasInteractive holder itself vetoes', () => {
    const holder = makeStuff(() => new Holder());
    expect(holder.canEvict(IDLE).ok).toBe(false);
  });

  it('shadow: vetoes on a live host, cullable when orphaned', () => {
    const host = makeStuff(() => new Thing());
    const shadow = makeStuff(() => new TestShadow());
    // Not attached → no host → cullable garbage.
    expect(shadow.canEvict(IDLE)).toEqual({ ok: true });
    // Attached to a live host → veto (asked on the proxy, as the sweep does,
    // so the proxy-keyed host resolves).
    ShadowApi.attach(host, shadow);
    expect(shadow.canEvict(IDLE).ok).toBe(false);
  });

  it('Behaved: vetoes with a behavior spec, cullable without', () => {
    const bot = makeStuff(() => new Bot());
    expect(bot.canEvict(IDLE)).toEqual({ ok: true }); // no spec → cullable

    bot.behaviors = [{ brain: 'idles' } as unknown as BehaviorSpec];
    expect(bot.canEvict(IDLE).ok).toBe(false); // authored cast → veto
  });

  it('Location: an empty, unaffiliated room is cullable (re-clones on entry)', () => {
    const room = makeStuff(() => new Location());
    expect(room.canEvict(IDLE)).toEqual({ ok: true });
  });

  it('WarrenMember: vetoes while in a warren, cullable once detached', () => {
    const room = makeStuff(() => new MemberRoom());
    const fakeWarren = makeStuff(() => new Thing());
    (room as unknown as { setWarren(w: unknown): void }).setWarren(fakeWarren);
    expect(room.canEvict(IDLE).ok).toBe(false); // active member → veto
    (room as unknown as { setWarren(w: unknown): void }).setWarren(null);
    expect(room.canEvict(IDLE)).toEqual({ ok: true }); // detached → cullable
  });

  it('Exit: vetoes while its source room is alive', () => {
    const source = makeStuff(() => new Box());
    const exit = makeStuff(
      () =>
        new Exit({ direction: 'north', source, destinationPath: '/nowhere' })
    );
    expect(exit.canEvict(IDLE).ok).toBe(false); // live source → veto

    StuffApi.destruct(source);
    expect(exit.canEvict(IDLE)).toEqual({ ok: true }); // orphaned → cullable
  });

  it('Registry singleton (TopicCatalogue) vetoes', () => {
    const cat = makeStuff(() => new TopicCatalogue());
    expect(cat.canEvict(IDLE).ok).toBe(false);
  });
});
