/**
 * StreamerTarget.parse — the pure, total target-grammar classifier. Covers
 * all three accepted forms (URL / bare-handle+opt / character) plus the
 * typed rejections (empty, ambiguous bare handle, URL⊕opt conflict,
 * character-on-YouTube), and the YouTube identifier sub-classifier.
 */

import { describe, it, expect } from 'vitest';
import { StreamerTarget } from '../StreamerTarget';

describe('StreamerTarget.parse — URL form', () => {
  it('parses a Twitch URL to a channel (scheme optional, www tolerated)', () => {
    expect(StreamerTarget.parse('twitch.tv/shroud', {})).toEqual({
      form: 'url',
      platform: 'twitch',
      identifier: 'shroud',
    });
    expect(StreamerTarget.parse('https://www.twitch.tv/shroud', {})).toEqual({
      form: 'url',
      platform: 'twitch',
      identifier: 'shroud',
    });
  });

  it('extracts a YouTube videoId from watch?v= and youtu.be', () => {
    expect(
      StreamerTarget.parse('https://youtube.com/watch?v=dQw4w9WgXcQ', {}),
    ).toEqual({ form: 'url', platform: 'youtube', identifier: 'dQw4w9WgXcQ' });
    expect(StreamerTarget.parse('youtu.be/dQw4w9WgXcQ', {})).toEqual({
      form: 'url',
      platform: 'youtube',
      identifier: 'dQw4w9WgXcQ',
    });
  });

  it('extracts a YouTube @handle and a UC… channelId from URLs', () => {
    expect(StreamerTarget.parse('youtube.com/@mkbhd', {})).toEqual({
      form: 'url',
      platform: 'youtube',
      identifier: '@mkbhd',
    });
    const uc = 'UC' + 'x'.repeat(22);
    expect(StreamerTarget.parse(`youtube.com/channel/${uc}`, {})).toEqual({
      form: 'url',
      platform: 'youtube',
      identifier: uc,
    });
  });

  it('rejects a URL combined with a conflicting platform opt', () => {
    expect(
      StreamerTarget.parse('twitch.tv/shroud', { youtube: true }),
    ).toEqual({ form: 'reject', reason: 'url-opt-conflict' });
    expect(
      StreamerTarget.parse('youtu.be/dQw4w9WgXcQ', { twitch: true }),
    ).toEqual({ form: 'reject', reason: 'url-opt-conflict' });
  });

  it('allows a URL with a redundant matching opt', () => {
    expect(
      StreamerTarget.parse('twitch.tv/shroud', { twitch: true }),
    ).toEqual({ form: 'url', platform: 'twitch', identifier: 'shroud' });
  });
});

describe('StreamerTarget.parse — bare handle + opt', () => {
  it('resolves a Twitch bare handle with --twitch', () => {
    expect(StreamerTarget.parse('shroud', { twitch: true })).toEqual({
      form: 'handle',
      platform: 'twitch',
      identifier: 'shroud',
    });
  });

  it('resolves a YouTube bare handle with --youtube', () => {
    expect(StreamerTarget.parse('mkbhd', { youtube: true })).toEqual({
      form: 'handle',
      platform: 'youtube',
      identifier: 'mkbhd',
    });
  });
});

describe('StreamerTarget.parse — character / MQL form', () => {
  it('a bare handle with no opt is a character reference (deferred resolve)', () => {
    expect(StreamerTarget.parse('alice', {})).toEqual({
      form: 'character',
      identifier: 'alice',
    });
    expect(StreamerTarget.parse('@alice', {})).toEqual({
      form: 'character',
      identifier: '@alice',
    });
  });
});

describe('StreamerTarget.parse — rejections', () => {
  it('rejects an empty argument', () => {
    expect(StreamerTarget.parse('', {})).toEqual({
      form: 'reject',
      reason: 'empty',
    });
    expect(StreamerTarget.parse('   ', {})).toEqual({
      form: 'reject',
      reason: 'empty',
    });
  });

  it('rejects an ambiguous bare handle (both opts set)', () => {
    expect(
      StreamerTarget.parse('shroud', { twitch: true, youtube: true }),
    ).toEqual({ form: 'reject', reason: 'ambiguous-handle' });
  });

  it('rejects a character/MQL seed on YouTube (--youtube on @seed)', () => {
    expect(StreamerTarget.parse('@alice', { youtube: true })).toEqual({
      form: 'reject',
      reason: 'character-youtube',
    });
  });
});

describe('StreamerTarget.classifyYoutubeRef', () => {
  it('classifies @handle / UC channelId / videoId / bare handle', () => {
    expect(StreamerTarget.classifyYoutubeRef('@mkbhd')).toBe('handle');
    expect(StreamerTarget.classifyYoutubeRef('UC' + 'x'.repeat(22))).toBe(
      'channelId',
    );
    expect(StreamerTarget.classifyYoutubeRef('dQw4w9WgXcQ')).toBe('videoId');
    expect(StreamerTarget.classifyYoutubeRef('mkbhd')).toBe('handle');
  });
});
