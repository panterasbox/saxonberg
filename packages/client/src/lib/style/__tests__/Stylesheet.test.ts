/**
 * Stylesheet engine — cascade behavior, selector resolution, plain
 * mode, bucket resolver wiring. Acceptance criteria #5, #19, #20,
 * #22, #23, #24 ride here.
 */

import { describe, it, expect, vi } from 'vitest';
import { Stylesheet } from '../Stylesheet';
import { INK_THEME } from '../themes/ink';
import { HIGH_CONTRAST_THEME } from '../themes/highContrast';
import {
  NEUTRAL_BUCKET_RESOLVER,
} from '../BucketResolver';
import type { BucketResolver, StyleOverlay } from '../types';

function makeSheet(
  overlay: StyleOverlay = {},
  opts: {
    theme?: typeof INK_THEME;
    resolver?: BucketResolver;
    viewerStuffId?: string | null;
  } = {},
) {
  return new Stylesheet(opts.theme ?? INK_THEME, overlay, {
    resolver: opts.resolver ?? NEUTRAL_BUCKET_RESOLVER,
    viewerStuffId: opts.viewerStuffId ?? null,
  });
}

describe('Stylesheet — topic cascade', () => {
  it('all topics resolve to empty treatment in the default theme', () => {
    // Topic-cascade rules were dropped for content frames because
    // they claimed dimensions (italic / bold) that per-word markers
    // also use — frame-level claims erased the per-word distinction.
    // Speech is marked by its quote characters + framing, not by
    // typographic decoration. Tests assert the new floor.
    const sheet = makeSheet();
    expect(sheet.topicTreatment('speech.vocal')).toEqual({});
    expect(sheet.topicTreatment('speech.comms')).toEqual({});
    expect(sheet.topicTreatment('world.emote.wave')).toEqual({});
    expect(sheet.topicTreatment('shell.result')).toEqual({});
    expect(sheet.topicTreatment('shell.diagnostic')).toEqual({});
  });

  it('overlay topic rule applies even when theme has none', () => {
    const sheet = makeSheet({
      'topic.shell': { fg: '#ff00ff', italic: true },
    });
    const t = sheet.topicTreatment('shell.result');
    expect(t.fg).toBe('#ff00ff');
    expect(t.italic).toBe(true);
  });

  it('tell vs say — default theme leaves both empty; differentiation is content', () => {
    // Both are empty in the default theme — the "X tells you" /
    // "X says," framing in the body distinguishes them in prose.
    // Visual differentiation between public and private comms is a
    // future design question (Wave 2 / chat slate).
    const sheet = makeSheet();
    expect(sheet.topicTreatment('speech.vocal')).toEqual({});
    expect(sheet.topicTreatment('speech.comms')).toEqual({});
  });
});

describe('Stylesheet — channel color (#20)', () => {
  it('overlay channel color overrides theme default', () => {
    const sheet = makeSheet({ 'channel.gossip.color': 'blue' });
    expect(sheet.channelColor('gossip')).toBe('blue');
  });

  it('theme default applies when overlay has no rule', () => {
    const sheet = makeSheet();
    expect(sheet.channelColor('gossip')).toBe('var(--sx-tint-amber)');
  });

  it('unknown channel resolves to null', () => {
    const sheet = makeSheet();
    expect(sheet.channelColor('rare-niche-channel')).toBeNull();
  });
});

describe('Stylesheet — plain mode (#23, #24)', () => {
  it('global plain collapses all treatments to empty', () => {
    const sheet = makeSheet({ plain: true });
    expect(sheet.topicTreatment('shell.result')).toEqual({});
    expect(sheet.elementTreatment('strong')).toEqual({});
    expect(sheet.channelColor('gossip')).toBeNull();
    expect(sheet.mentionTreatment('whoever')).toEqual({});
    expect(sheet.bucketTreatment('whoever')).toEqual({});
  });

  it('per-channel plain only collapses that channel', () => {
    const sheet = makeSheet({ 'plain.channel.gossip': true });
    expect(sheet.channelColor('gossip')).toBeNull();
    expect(sheet.channelColor('trade')).toBe('var(--sx-tint-sky)');
    // Non-channel-scoped queries are not affected by per-channel
    // plain — the topic-cascade still resolves; v1 just returns
    // empty treatment for content topics.
    expect(sheet.topicTreatment('speech.vocal')).toEqual({});
  });
});

describe('Stylesheet — mention treatment (#19)', () => {
  it('self-match treatment fires when viewer matches', () => {
    const sheet = makeSheet({}, { viewerStuffId: 'me' });
    const t = sheet.mentionTreatment('me');
    expect(t.fg).toBe('var(--sx-accent)');
    expect(t.weight).toBe('bold');
  });

  it('other-match treatment fires when viewer does not match', () => {
    const sheet = makeSheet({}, { viewerStuffId: 'me' });
    const t = sheet.mentionTreatment('other');
    expect(t.fg).toBe('var(--sx-tint-violet)');
    expect(t.weight).toBeUndefined();
  });

  it('overlay mention.self = false suppresses self highlight', () => {
    const sheet = makeSheet(
      { 'mention.self': false },
      { viewerStuffId: 'me' },
    );
    const t = sheet.mentionTreatment('me');
    expect(t.fg).toBe('var(--sx-tint-violet)'); // collapsed to "other"
  });
});

describe('Stylesheet — bucket resolver (#22)', () => {
  it('exercises the resolver on every bucket lookup', () => {
    const spy = vi.fn(() => 'neutral' as const);
    const sheet = makeSheet({}, { resolver: { resolveBucket: spy } });
    sheet.bucketTreatment('s_42');
    sheet.bucketTreatment('s_99');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 's_42');
    expect(spy).toHaveBeenNthCalledWith(2, 's_99');
  });

  it('neutral bucket yields the empty treatment in default theme', () => {
    const sheet = makeSheet();
    expect(sheet.bucketTreatment('whoever')).toEqual({});
  });

  it('friend / foe buckets produce visible treatment (forward-looking)', () => {
    const FRIEND_RESOLVER: BucketResolver = {
      resolveBucket: () => 'friend',
    };
    const sheet = makeSheet({}, { resolver: FRIEND_RESOLVER });
    const t = sheet.bucketTreatment('s_42');
    expect(t.weight).toBe('bold');
  });
});

describe('Stylesheet — themes', () => {
  it('the default theme name is "ink"', () => {
    const sheet = makeSheet();
    expect(sheet.themeName).toBe('ink');
  });

  it('high-contrast theme name is "high-contrast" (#21)', () => {
    const sheet = makeSheet({}, { theme: HIGH_CONTRAST_THEME });
    expect(sheet.themeName).toBe('high-contrast');
  });

  it('palette tokens are exposed', () => {
    const sheet = makeSheet();
    expect(sheet.palette.link).toBe('var(--sx-good)');
    const hc = makeSheet({}, { theme: HIGH_CONTRAST_THEME });
    expect(hc.palette.link).toBe('var(--sx-tint-teal)');
  });
});

describe('Stylesheet — element treatment', () => {
  it('default theme leaves element rules empty (renderer carries styling)', () => {
    // Element treatments live on the renderer's styled-components
    // (StrongSpan = bold, EmSpan = italic, CodeSpan = monospace+bg).
    // The theme's element table stays empty so the renderer's
    // canonical treatment isn't overridden.
    const sheet = makeSheet();
    expect(sheet.elementTreatment('strong')).toEqual({});
    expect(sheet.elementTreatment('em')).toEqual({});
    expect(sheet.elementTreatment('code')).toEqual({});
    expect(sheet.elementTreatment('speech')).toEqual({});
  });

  it('overlay element rule applies on top of empty theme', () => {
    const sheet = makeSheet({
      'element.strong': { weight: 'normal', italic: true },
    });
    const t = sheet.elementTreatment('strong');
    expect(t.weight).toBe('normal');
    expect(t.italic).toBe(true);
  });
});
