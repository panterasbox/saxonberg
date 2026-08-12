/**
 * The legacy `cockpit.layout` → (mode, arrangement) migration.
 *
 * Acceptance criterion 5. ⚠ **These tests use real STORED legacy
 * values, never a fresh default.** A fresh-default test passes whether
 * or not the migration exists — it proves nothing, and writing one is
 * the easy way to ship a migration that never runs.
 *
 * ⭐ The `watch` row is the case that matters: `livestream-viewer` and
 * `streamer` collapse into ONE mode carrying *different* arrangements.
 * A test that only covers `builder` would pass against a migration that
 * had dropped the arrangement column entirely.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { HasInteractiveMixin } from '../HasInteractive';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import {
  COCKPIT_MODES,
  COCKPIT_ARRANGEMENTS,
  LEGACY_LAYOUT_MIGRATION,
  type LayoutName,
} from '@saxonberg/types';

class TestHost extends HasInteractiveMixin(Idea) {}

/**
 * A host that played before the mode axis existed: a stored
 * `cockpit.layout`, and no `cockpit.mode` at all. Written through
 * `setClientState` so it goes in the way a real legacy save did.
 */
function legacyHost(layout: LayoutName): TestHost {
  const h = makeStuff(() => new TestHost());
  h.setClientState('cockpit.layout', layout);
  return h;
}

describe('legacy cockpit.layout migration', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('leaves a genuinely fresh host on the default mode', () => {
    const h = makeStuff(() => new TestHost());
    expect(h.getCockpitMode()).toBe('play');
    expect(h.getCockpitArrangement()).toBe('default');
  });

  /*
   * ⭐ Two legacy values, one mode, two arrangements. This is the only
   * row where the mode column alone loses information.
   */
  it('collapses both livestream layouts into watch with DIFFERENT arrangements', () => {
    const viewer = legacyHost('livestream-viewer');
    const streamer = legacyHost('streamer');

    expect(viewer.getCockpitMode()).toBe('watch');
    expect(streamer.getCockpitMode()).toBe('watch');
    expect(viewer.getCockpitMode()).toBe(streamer.getCockpitMode());

    expect(viewer.getCockpitArrangement()).toBe('viewer');
    expect(streamer.getCockpitArrangement()).toBe('streamer');
    expect(viewer.getCockpitArrangement()).not.toBe(
      streamer.getCockpitArrangement(),
    );
  });

  it('maps every legacy value to its mode and arrangement', () => {
    for (const [layout, expected] of Object.entries(LEGACY_LAYOUT_MIGRATION)) {
      const h = legacyHost(layout as LayoutName);
      expect(h.getCockpitMode()).toBe(expected.mode);
      expect(h.getCockpitArrangement()).toBe(expected.arrangement);
      StuffApi.clearAll();
    }
  });

  it('lets an explicitly set mode win over the legacy layout', () => {
    const h = legacyHost('builder');
    expect(h.getCockpitMode()).toBe('build');
    h.setClientState('cockpit.mode', 'chat');
    expect(h.getCockpitMode()).toBe('chat');
  });

  /*
   * The legacy arrangement is scoped to the mode it migrated to. A
   * `livestream-viewer` host asked about `play` must get play's own
   * default — 'viewer' is not an arrangement `play` has ever heard of,
   * and answering with it would leak one mode's vocabulary into another.
   */
  it('does not let a legacy arrangement answer for a different mode', () => {
    const h = legacyHost('livestream-viewer');
    expect(h.getCockpitArrangement('watch')).toBe('viewer');
    expect(h.getCockpitArrangement('play')).toBe('default');
    expect(h.getCockpitArrangement('build')).toBe('default');
  });

  it('prefers a remembered arrangement over the legacy one', () => {
    const h = legacyHost('streamer');
    expect(h.getCockpitArrangement()).toBe('streamer');
    h.setClientState('cockpit.arrangements', { watch: 'viewer' });
    expect(h.getCockpitArrangement()).toBe('viewer');
  });

  /*
   * The client owns zero semantics, so the snapshot it receives must
   * already be migrated. A raw snapshot would hand a legacy player
   * `cockpit.mode: null` and make the CLIENT decide what that means.
   */
  it('emits a resolved mode on the wire, never null', () => {
    const h = legacyHost('builder');
    const snap = h.snapshotClientState();
    expect(snap['cockpit.mode']).toBe('build');
    expect(
      (snap['cockpit.arrangements'] as Record<string, string>).build,
    ).toBe('default');

    const fresh = makeStuff(() => new TestHost());
    expect(fresh.snapshotClientState()['cockpit.mode']).toBe('play');
  });
});

describe('the cockpit mode vocabulary', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('ships the slate’s five front doors', () => {
    expect([...COCKPIT_MODES]).toEqual([
      'chat',
      'play',
      'watch',
      'build',
      'govern',
    ]);
  });

  it('gives every mode at least one shipped arrangement', () => {
    for (const mode of COCKPIT_MODES) {
      expect(COCKPIT_ARRANGEMENTS[mode].length).toBeGreaterThan(0);
    }
    // watch ships two — the migration table depends on it.
    expect([...COCKPIT_ARRANGEMENTS.watch]).toEqual(['viewer', 'streamer']);
  });

  it('only ever migrates a legacy value to a real mode and a real arrangement', () => {
    for (const { mode, arrangement } of Object.values(
      LEGACY_LAYOUT_MIGRATION,
    )) {
      expect(COCKPIT_MODES).toContain(mode);
      expect(COCKPIT_ARRANGEMENTS[mode]).toContain(arrangement);
    }
  });

  it('rejects an unknown mode at the client-state boundary', () => {
    const h = makeStuff(() => new TestHost());
    expect(() => h.setClientState('cockpit.mode', 'nonsense')).toThrow(
      /unknown cockpit mode/,
    );
  });
});
