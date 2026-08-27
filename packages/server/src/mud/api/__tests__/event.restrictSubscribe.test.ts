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

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { EventApi } from '../event';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import EventRegistry from '../../platform/idea/EventRegistry';
import { Stuff } from '../../lib/stuff/Stuff';
import { Idea } from '../../lib/stuff/Idea';

const EVT = 'test.sensitive';

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
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

/**
 * Two-consumer allowlist (the producer-faucet regression). The dispatch
 * signal feeds BOTH the consumer and producer taps, so its receive side is
 * locked to a PAIR. Both taps must assert the full pair: `restrictSubscribe`
 * clobbers the policy with the latest call's list, so a single-class
 * re-assert (after HMR, in any order) would silently evict the other tap.
 */
class PairA extends Idea {
  claimPair(): void {
    EventApi.restrictSubscribe(EVT, PairA, PairB);
  }
  subscribe(): boolean {
    try {
      EventApi.on(EVT, () => {});
      return true;
    } catch {
      return false;
    }
  }
}
class PairB extends Idea {
  claimPair(): void {
    EventApi.restrictSubscribe(EVT, PairA, PairB);
  }
  subscribe(): boolean {
    try {
      EventApi.on(EVT, () => {});
      return true;
    } catch {
      return false;
    }
  }
}

describe('EventApi.restrictSubscribe — two-consumer pair (producer regression)', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
  });

  it('admits BOTH paired consumers and still refuses a third', async () => {
    await bootRegistry();
    const a = await StuffApi.create(() => new PairA());
    const b = await StuffApi.create(() => new PairB());
    a.claimPair();
    b.claimPair();
    expect(a.subscribe()).toBe(true);
    expect(b.subscribe()).toBe(true);

    const intruder = await StuffApi.create(() => new Intruder());
    expect(intruder.trySubscribe()).toBe(false);
  });

  it('a re-assert of the full pair keeps BOTH subscribable (no clobber)', async () => {
    await bootRegistry();
    const a = await StuffApi.create(() => new PairA());
    const b = await StuffApi.create(() => new PairB());
    a.claimPair();
    b.claimPair();
    // Simulate an HMR re-assert by A (the bug: a single-class re-assert here
    // would evict B; asserting the full pair keeps both).
    a.claimPair();
    expect(b.subscribe()).toBe(true);
    expect(a.subscribe()).toBe(true);
  });
});
