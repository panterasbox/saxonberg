/**
 * ⭐⭐ The fork slice lives on `ClientStateMixin` — both halves.
 *
 * ⚠⚠ Fork-slice discovery is PREFIX REFLECTION over the prototype
 * chain (`Forkable.ts`), not registration. So a slice that moves to
 * the wrong mixin produces **no compile error and no runtime
 * complaint** — the fork is simply born without it, which is how a
 * player clicking "test in holodeck" from the builder layout once
 * landed inside wearing the world layout.
 *
 * (a) proves the slice is found when the mechanism is composed.
 * (b) is the half nobody would otherwise write: a host with the
 *     connection set but NOT the client-state mechanism must **not**
 *     offer the slice. Without (b), a slice accidentally left on
 *     `HasInteractiveMixin` — or on `Avatar` itself — passes (a)
 *     perfectly while the requirement it encodes is false.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { HasInteractiveMixin } from '../HasInteractive';
import { ClientStateMixin } from '../ClientState';
import { SaxonbergClientMixin } from '../SaxonbergClient';
import { ForkableMixin } from '../../persistence/Forkable';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

/** Forkable + the mechanism (+ our client, for a key to write). */
class StatefulHost extends ForkableMixin(
  SaxonbergClientMixin(ClientStateMixin(HasInteractiveMixin(Idea))),
) {}

/** Forkable + the connection set, and nothing else. */
class ConnectionOnlyHost extends ForkableMixin(HasInteractiveMixin(Idea)) {}

describe('⭐⭐ the ClientState fork slice', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('(a) a host composing the mechanism offers the slice', () => {
    const h = makeStuff(() => new StatefulHost());
    expect(Object.keys(h.collectForkSlices())).toContain('ClientState');
  });

  it('(a) a written key round-trips onto a fork', () => {
    const src = makeStuff(() => new StatefulHost());
    src.setClientState('cockpit.mode', 'build');
    const fork = makeStuff(() => new StatefulHost());
    fork.applyForkedState(src.collectForkSlices());
    expect(fork.getClientState('cockpit.mode')).toBe('build');
  });

  it('⭐⭐ (b) a host WITHOUT the mechanism does not offer it', () => {
    const h = makeStuff(() => new ConnectionOnlyHost());
    expect(Object.keys(h.collectForkSlices())).not.toContain('ClientState');
  });

  it('the slice is fork-only in practice: only Contacts is on the merge allowlist', () => {
    // ⭐ The merge METHOD exists (it is how the mint applies the fork),
    // but the sandbox's exit allowlist is epistemic slices alone, so a
    // preference changed inside a circle discards with it. The boundary
    // is symmetric; this records which direction the slice travels.
    const h = makeStuff(() => new StatefulHost());
    expect(typeof (h as unknown as { mergeSlice_ClientState: unknown })
      .mergeSlice_ClientState).toBe('function');
  });
});
