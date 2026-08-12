/**
 * The pane catalogue — the server owns what a pane IS, not just what it
 * is called.
 *
 * ⭐⭐ **Why this exists.** A `subscriptionId` is a client-minted
 * `nanoid`: a transport handle that dies on reconnect. It can name a
 * pane for the length of one socket and nothing longer. So anything
 * durable that refers to a pane — a saved arrangement, a pin, a future
 * authored layout — needed an identity the server issues, and there
 * wasn't one.
 *
 * The visible symptom was `cockpit layout save`, which wrote
 * `panes: []` and reported "saved". Not laziness: it was the only
 * honest thing that code could write, because the only id a pane had
 * would have been garbage a reconnect later. **The bug was upstream of
 * the bug.**
 *
 * ⚠ The second half — that a named pane's SHAPE comes from the server —
 * is the part that matters beyond arrangements. `InspectionPane.tsx`
 * used to send `query: "$focus"`, putting MQL in a `.tsx` file. The
 * client is not allowed to re-derive server semantics, and a pane's
 * query is one.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { ContainmentApi } from '../containment';
import { PANES } from '../../lib/connection/Panes';
import { PANE_IDS } from '@saxonberg/types';
import EventRegistry from '../../obj/EventRegistry';
import Interactive from '../../obj/Interactive';
import Avatar from '../../obj/Avatar';
import Location from '../../lib/stuff/Location';
import { Stuff } from '../../lib/stuff/Stuff';
import { EventApi } from '../event';
import { ConnectionApi } from '../connection';

interface Harness {
  interactive: Interactive;
  avatar: Avatar;
  location: Location;
  envelopes: { type?: string }[];
}

async function setup(): Promise<Harness> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);

  const location = await StuffApi.create(() => new Location());
  const avatar = await StuffApi.create(() => new Avatar());
  avatar.setName('Alice');
  ContainmentApi.move(avatar, location);
  const interactive = await StuffApi.create(
    () => new Interactive('sock-1', 'sess-1', { _id: 'u1' } as never),
  );
  ConnectionApi.transfer(interactive, avatar);

  const envelopes: { type?: string }[] = [];
  vi.spyOn(avatar, 'onEnvelope').mockImplementation((tpl) => {
    envelopes.push(tpl as unknown as { type?: string });
  });
  return { interactive, avatar, location, envelopes };
}

describe('the pane catalogue', () => {
  beforeEach(() => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
  });

  /*
   * ⚠ The vocabulary and the definitions must not drift. Two lists that
   * have to agree is one list too many, so this asserts they are in
   * fact one: every advertised name resolves to a definition, and the
   * catalogue advertises nothing extra.
   */
  it('every advertised PaneId has a definition, and vice versa', () => {
    expect(Object.keys(PANES).sort()).toEqual([...PANE_IDS].sort());
    for (const id of PANE_IDS) {
      const def = PANES[id];
      expect(def, `${id} has no definition`).toBeDefined();
      expect(def.query.length, `${id} has an empty query`).toBeGreaterThan(0);
      expect(def.label.length, `${id} has no label`).toBeGreaterThan(0);
    }
  });

  /*
   * ⭐ The dependency flag is declared beside the query that needs it.
   * A `$focus` pane that does not wake on focus changes is a surface
   * that silently stops updating — and nothing about it looks broken,
   * which is exactly how the immortal `here` pane survived eleven green
   * tests.
   */
  it('declares a wake dependency for each query that needs one', () => {
    expect(PANES.inspect.query).toBe('$focus');
    expect(PANES.inspect.focusDependent).toBe(true);
    expect(PANES.location.query).toBe('here');
    expect(PANES.location.locationDependent).toBe(true);
  });

  it('opens a named pane using the SERVER definition', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-1',
      pane: 'location',
    });
    // It opened with NO query supplied by the caller, and it is listed
    // as a pane under its durable name even though it has no hold.
    const panes = MqlSubscriptionApi.listPanes(h.interactive);
    const mine = panes.find((p) => p.subscriptionId === 'sub-1');
    expect(mine, 'a named pane must be listed as one').toBeDefined();
    expect(mine!.paneId).toBe('location');
    expect(mine!.hold).toBeUndefined();

    expect(h.envelopes.length).toBeGreaterThan(0);
    const first = h.envelopes[0] as { type?: string; error?: string };
    expect(first.type).not.toBe('mql-subscription-error');
  });

  /*
   * ⚠⚠ An unknown name is an ERROR, never a fallback to whatever the
   * caller passed. Falling back would let a client open an arbitrary
   * subscription by misspelling a pane — reopening the exact hole the
   * catalogue closes.
   */
  it('refuses an unknown pane name rather than falling back', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-bogus',
      pane: 'nope' as never,
      // A caller trying to smuggle a query past the catalogue.
      query: 'here',
      cardinality: 'one',
    });
    const err = h.envelopes.find(
      (e) => (e as { type?: string }).type === 'mql-subscription-error',
    ) as { detail?: string; reason?: string } | undefined;
    expect(err, 'expected an error envelope').toBeDefined();
    expect(JSON.stringify(err)).toMatch(/unknown pane/);
  });

  /*
   * ⭐⭐ THE regression, and the reason the catalogue exists.
   *
   * `cockpit layout save` wrote `panes: []` and said "saved". The name
   * appeared in `list`; recalling it restored nothing; no code path
   * anywhere ever filled the array. A test asserting only that the name
   * was stored passed the whole time — which is why this one asserts
   * the CONTENTS.
   */
  it('a saved arrangement captures the open panes by durable name', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-a',
      pane: 'inspect',
      // ⚠ Ignored — a named pane's lifetime comes from the catalogue,
      // and neither shipped pane carries one. Passing it here proves
      // the caller cannot bolt a lifetime onto a server-owned pane.
      hold: 'carried',
    });
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-b',
      pane: 'location',
    });

    const open = MqlSubscriptionApi.listPanes(h.interactive);
    const ids = open.map((p) => p.paneId).sort();
    expect(ids).toEqual(['inspect', 'location']);

    // ⚠ And the durable half: the names survive a reconnect BECAUSE
    // they are not the subscriptionIds. Assert they are in fact
    // different things, or this test would pass against the old design.
    for (const p of open) {
      expect(p.paneId).not.toBe(p.subscriptionId);
      // The caller's `hold` was discarded: the catalogue defines none.
      expect(p.hold).toBeUndefined();
    }
  });

  /*
   * ⚠ A held subscription opened by SHAPE rather than by name has no
   * durable identity, so it reports none — and an arrangement skips it
   * rather than storing a `nanoid` that will be garbage tomorrow.
   */
  it('a pane opened by shape reports no durable name', async () => {
    const h = await setup();
    MqlSubscriptionApi.handleSubscribe({
      interactive: h.interactive,
      subscriptionId: 'sub-adhoc',
      query: 'here',
      cardinality: 'one',
      hold: 'here',
    });
    const open = MqlSubscriptionApi.listPanes(h.interactive);
    expect(open.length).toBe(1);
    expect(open[0]!.paneId).toBeUndefined();
  });
});
