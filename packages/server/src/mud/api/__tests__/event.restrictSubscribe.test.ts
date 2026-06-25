/**
 * EventApi.restrictSubscribe — the receive-gate apparatus (the EventRegistry
 * prop-access `Get` half). Covers:
 *   - the owning consumer may subscribe (the legit tap still works);
 *   - a non-owner subscribe THROWS — the snoop side-channel is closed;
 *   - a different-named class cannot hijack an already-owned event.
 *
 * Originator detection rides the security-proxy frames, so the consumer /
 * intruder are real proxied Stuff (created via `StuffApi.create`) whose
 * methods call `EventApi.on` — the originator is the calling instance's
 * class, exactly as the renown / participation taps subscribe.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import EventRegistry from '../../obj/EventRegistry';
import { Stuff } from '../../lib/stuff/Stuff';
import { Idea } from '../../lib/stuff/Idea';

const EVT = 'test.sensitive';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

class OwningConsumer extends Idea {
  claimAndSubscribe(): boolean {
    EventApi.restrictSubscribe(EVT, OwningConsumer);
    try {
      EventApi.on(EVT, () => {});
      return true;
    } catch {
      return false;
    }
  }
}

class Intruder extends Idea {
  trySubscribe(): boolean {
    try {
      EventApi.on(EVT, () => {});
      return true;
    } catch {
      return false;
    }
  }
  tryHijack(): void {
    EventApi.restrictSubscribe(EVT, Intruder);
  }
}

describe('EventApi.restrictSubscribe', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('lets the owning consumer subscribe', async () => {
    await bootRegistry();
    const c = await StuffApi.create(() => new OwningConsumer());
    expect(c.claimAndSubscribe()).toBe(true);
  });

  it('blocks a non-owner from subscribing (snoop closed)', async () => {
    await bootRegistry();
    const c = await StuffApi.create(() => new OwningConsumer());
    expect(c.claimAndSubscribe()).toBe(true);
    const intruder = await StuffApi.create(() => new Intruder());
    expect(intruder.trySubscribe()).toBe(false);
  });

  it('refuses a different-named class hijacking an owned event', async () => {
    await bootRegistry();
    const c = await StuffApi.create(() => new OwningConsumer());
    expect(c.claimAndSubscribe()).toBe(true);
    const intruder = await StuffApi.create(() => new Intruder());
    intruder.tryHijack(); // refused (warns), policy unchanged
    expect(intruder.trySubscribe()).toBe(false);
  });
});
