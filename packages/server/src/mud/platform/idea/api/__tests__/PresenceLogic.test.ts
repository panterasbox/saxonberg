/**
 * PresenceLogic.statusOf — the derived session-liveness, in
 * display-precedence order (reconnecting > engaged > idle > active), and
 * the idle derivation against the `social.idleAfter` AppSetting + the
 * session's `lastInputAt`. Pure derive-on-read; substrate stubbed.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, afterEach, vi } from 'vitest';
import { MixinApi } from '../../../../api/mixin';
import { AppApi } from '../../../../api/app';
import { StuffApi } from '../../../../api/stuff';
import { ProxyApi } from '../../../../api/proxy';
import { PresenceLogic } from '../PresenceLogic';
import type Avatar from '../../../agent/Avatar';

/**
 * White-box: the RAW (unproxied) logic instance — the avatar fakes are
 * not Stuff, so `statusOf` is called directly (no gate; no circle scope
 * so the read aperture is the identity branch). `Stuff.RAW_TARGET` is
 * the sanctioned raw-state test seam.
 */
function statusOf(target: Avatar): string {
  const proxy = StuffApi.createSync(() => new PresenceLogic());
  const raw = (proxy as never as Record<symbol, PresenceLogic>)[
    ProxyApi.RAW_TARGET
  ]!;
  return raw.statusOf(target);
}

/** A connected/linkdead avatar stub with one interactive at `lastInput`. */
function makeAvatar(opts: {
  connected: boolean;
  lastInputAgoMs?: number;
  engaged?: boolean;
}): Avatar {
  const last = new Date(Date.now() - (opts.lastInputAgoMs ?? 0));
  const interactives = new Set([{ getLastInputAt: () => last }]);
  return {
    stuffId: 'a1',
    isConnected: () => opts.connected,
    isDestroyed: () => false,
    getInteractives: () => interactives,
    getEngagements: () => (opts.engaged ? [{}] : []),
  } as unknown as Avatar;
}

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('SocialApi.statusOf precedence', () => {
  it('reads linkdead-but-lingering as reconnecting', () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('300');
    vi.spyOn(MixinApi, 'isEngaged').mockReturnValue(true);
    expect(statusOf(makeAvatar({ connected: false }))).toBe(
      'reconnecting'
    );
  });

  it('reads engaged above idle/active', () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('300');
    vi.spyOn(MixinApi, 'isEngaged').mockReturnValue(true);
    expect(
      statusOf(makeAvatar({ connected: true, engaged: true, lastInputAgoMs: 10_000_000 }))
    ).toBe('engaged');
  });

  it('derives idle past the social.idleAfter threshold', () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('300'); // 5 minutes
    vi.spyOn(MixinApi, 'isEngaged').mockReturnValue(false);
    expect(
      statusOf(makeAvatar({ connected: true, lastInputAgoMs: 6 * 60 * 1000 }))
    ).toBe('idle');
  });

  it('reads recent input as active', () => {
    vi.spyOn(AppApi, 'setting').mockReturnValue('300');
    vi.spyOn(MixinApi, 'isEngaged').mockReturnValue(false);
    expect(
      statusOf(makeAvatar({ connected: true, lastInputAgoMs: 5_000 }))
    ).toBe('active');
  });
});
