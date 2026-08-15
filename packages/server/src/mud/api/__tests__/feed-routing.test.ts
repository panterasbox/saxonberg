/**
 * Feed routing — one stream, several destinations, evaluated
 * **server-side** beside the envelope.
 *
 * ⭐⭐ The routing decision is stamped on the frame, not re-derived by
 * the client. The predicates read the topic's FACETS, and the facets
 * live on the server's catalogue; two evaluators would disagree the
 * first time one of them changed, and the disagreement is invisible
 * until somebody's message is in the wrong tab.
 *
 * The three properties worth proving are the three the design turns on:
 * **first match wins for a MOVE**, **a COPY keeps going**, and **the
 * catch-all cannot be removed** — including by writing the stored table
 * directly, which is why it is appended rather than stored.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { RoutingRule, TopicDescriptor } from '@saxonberg/types';
import { DEFAULT_ROUTING } from '@saxonberg/types';
import { MessageApi } from '../message';
import { StuffApi } from '../stuff';
import TopicCatalogue from '../../obj/TopicCatalogue';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

/** A catalogue that answers with whatever facets the case needs. */
function installCatalogue(
  facets: Record<string, Partial<TopicDescriptor>>,
): void {
  // One singleton per test; a second stamp at the same path is what
  // `findByTemplatePath` refuses, loudly and correctly.
  StuffApi.clearAll();
  const cat = makeStuffAtPath(
    () => new TopicCatalogue(),
    '/obj/TopicCatalogue',
  );
  vi.spyOn(cat, 'getDescriptor').mockImplementation(
    (topic: string) =>
      ({
        topic,
        family: '',
        label: topic,
        description: '',
        address: 'ambient',
        actor: 'world',
        weight: 'activity',
        audience: 'all',
        durable: false,
        affordance: 'live',
        ...(facets[topic] ?? {}),
      }) as TopicDescriptor,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the ordered walk', () => {
  it('⭐ first match wins for a MOVE — later rules never see it', () => {
    installCatalogue({
      'shell.diagnostic': { weight: 'diagnostic', address: 'direct' },
    });
    const rules: RoutingRule[] = [
      { when: { weight: 'diagnostic' }, to: 'diagnostics', disposition: 'move' },
      { when: { address: 'direct' }, to: 'attention', disposition: 'copy' },
    ];

    // The `direct` rule would have matched too. A `move` stopping the
    // walk is the whole reason the table is ORDERED rather than a set.
    expect(MessageApi.feedsFor('shell.diagnostic', rules)).toEqual([
      'diagnostics',
    ]);
  });

  it('⭐ a COPY routes and KEEPS GOING', () => {
    installCatalogue({ 'speech.comms': { address: 'direct' } });

    // This is the shape the asymmetry exists for: a tell reaches
    // Attention *and* still lands in World.
    expect(MessageApi.feedsFor('speech.comms', [...DEFAULT_ROUTING])).toEqual([
      'attention',
      'world',
    ]);
  });

  it('matches a topic SUBTREE, which no facet can express', () => {
    installCatalogue({ 'speech.channel': {}, 'speech.vocal': {} });
    const rules: RoutingRule[] = [
      { when: { topic: 'speech.*' }, to: 'channels', disposition: 'move' },
    ];
    expect(MessageApi.feedsFor('speech.channel', rules)).toEqual(['channels']);
    expect(MessageApi.feedsFor('speech.vocal', rules)).toEqual(['channels']);
    // …and does not leak sideways into a sibling root.
    installCatalogue({ 'sense.ambient': {} });
    expect(MessageApi.feedsFor('sense.ambient', rules)).toEqual(['world']);
  });

  it('ANDs the fields within one predicate', () => {
    installCatalogue({
      'act.deed': { actor: 'person', weight: 'activity' },
      'act.move': { actor: 'world', weight: 'activity' },
    });
    const rules: RoutingRule[] = [
      {
        when: { actor: 'person', weight: 'activity' },
        to: 'attention',
        disposition: 'move',
      },
    ];
    expect(MessageApi.feedsFor('act.deed', rules)).toEqual(['attention']);
    expect(MessageApi.feedsFor('act.move', rules)).toEqual(['world']);
  });
});

describe('⚠⚠ the catch-all', () => {
  it('lands a frame no rule matched', () => {
    installCatalogue({ 'sense.ambient': {} });
    expect(MessageApi.feedsFor('sense.ambient', [])).toEqual(['world']);
  });

  it('cannot be removed by emptying the stored table', () => {
    installCatalogue({ 'sense.ambient': {} });
    // The table a client could write is EMPTY here. The catch-all is
    // appended by the evaluator rather than stored, so "every frame
    // lands somewhere" is an invariant rather than a default a client
    // gets to overwrite.
    expect(MessageApi.feedsFor('sense.ambient', [])).not.toEqual([]);
  });

  it('cannot be removed by a table of rules that match nothing', () => {
    installCatalogue({ 'sense.ambient': { weight: 'activity' } });
    const useless: RoutingRule[] = [
      { when: { weight: 'diagnostic' }, to: 'diagnostics', disposition: 'move' },
      { when: { topic: 'nothing.at.all' }, to: 'channels', disposition: 'move' },
    ];
    // ⚠ This is the failure the catch-all exists for: a mistyped
    // predicate. Without it the frame lands nowhere — and in a world
    // where a frame can be "you are on fire", a lost message is not a
    // cosmetic bug.
    expect(MessageApi.feedsFor('sense.ambient', useless)).toEqual(['world']);
  });

  it('lands a frame even with NO topic catalogue warmed', () => {
    // Before boot completes there are no facets to match on, so every
    // rule falls through — which is precisely the state the catch-all
    // covers. Failing open here is right; a dropped frame is the
    // expensive mistake.
    StuffApi.clearAll();
    expect(MessageApi.feedsFor('anything', [...DEFAULT_ROUTING])).toEqual([
      'world',
    ]);
  });
});

describe('the shipped default', () => {
  it('⚠⚠ copies direct messages to Attention, ON by default', () => {
    installCatalogue({ 'speech.comms': { address: 'direct' } });
    const feeds = MessageApi.feedsFor('speech.comms', [...DEFAULT_ROUTING]);
    // On a desktop this is a convenience — the frame is in World
    // anyway. On a phone World may not be the feed you are looking at,
    // so it stops being a convenience and becomes the safety net.
    expect(feeds).toContain('attention');
    expect(feeds).toContain('world');
  });

  it('sends diagnostics to Diagnostics and nowhere else', () => {
    installCatalogue({ 'shell.diagnostic': { weight: 'diagnostic' } });
    expect(
      MessageApi.feedsFor('shell.diagnostic', [...DEFAULT_ROUTING]),
    ).toEqual(['diagnostics']);
  });
});
