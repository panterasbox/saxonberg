/**
 * StreamerTarget — the platform-agnostic streamer reference the `tune` and
 * `watch` verbs resolve their argument into.
 *
 * Two concerns live here, split by the CLAUDE.md `lib/` = backend-free rule:
 *
 *  - {@link StreamerTarget.parse} is **pure, total, and unit-tested**: it
 *    classifies an argument string + the `--twitch`/`--youtube` opts into a
 *    {@link ParsedTarget} (a URL form, a bare-handle form, a character/MQL
 *    form, or a typed rejection). It performs NO network / DB work — no
 *    Twitch login→id lookup, no character→profile walk. Those (which need
 *    `backend/` readers + identity docs) live on `StreamLogic.resolveTarget`.
 *  - {@link StreamerTarget} is the **resolved** value the resolver produces:
 *    `{ platform, key, handle, character? }`. `key` is the transport's
 *    stable channel key (Twitch broadcasterId / YouTube liveChatId or embed
 *    channel/video ref); `handle` is the display handle; `character` is the
 *    linked Avatar ref when the target was resolved through a character.
 *
 * No `platform:handle` prefixed strings are accepted — the platform rides in
 * the URL or the opt, never smuggled into the argument.
 */

import type { StuffRef } from '@saxonberg/types';

/** The two relay transports. */
export type Platform = 'twitch' | 'youtube';

/**
 * The outcome of parsing an argument string. Three accepted forms carry the
 * (possibly-platformless) identifier the resolver then resolves; a rejection
 * carries a typed reason the controller reject-and-points on.
 */
export type ParsedTarget =
  | { form: 'url'; platform: Platform; identifier: string }
  | { form: 'handle'; platform: Platform; identifier: string }
  | { form: 'character'; identifier: string }
  | {
      form: 'reject';
      reason:
        | 'ambiguous-handle'
        | 'url-opt-conflict'
        | 'character-youtube'
        | 'empty';
    };

/** Boolean platform opts the two verbs share. */
export interface TargetOpts {
  twitch?: boolean;
  youtube?: boolean;
}

/** The sub-kind of a YouTube identifier (drives embed + resolve branching). */
export type YoutubeRefKind = 'videoId' | 'channelId' | 'handle';

export class StreamerTarget {
  constructor(
    public readonly platform: Platform,
    /** The transport's stable channel key (broadcasterId / liveChatId). */
    public readonly key: string,
    /** The display handle (Twitch login / YouTube channel handle or id). */
    public readonly handle: string,
    /** The linked Avatar ref when resolved through a character. */
    public readonly character?: StuffRef,
  ) {}

  /**
   * Pure, total classification of `arg` + platform opts into a
   * {@link ParsedTarget}. Never throws, never touches the network / DB.
   */
  static parse(arg: string, opts: TargetOpts): ParsedTarget {
    const raw = (arg ?? '').trim();
    if (!raw) return { form: 'reject', reason: 'empty' };

    const wantTwitch = opts.twitch === true;
    const wantYoutube = opts.youtube === true;

    const url = StreamerTarget.parseUrl(raw);
    if (url) {
      // The URL already carries the platform; an opt naming the OTHER
      // platform is a conflict (so is passing both opts).
      const conflict =
        (url.platform === 'twitch' && wantYoutube) ||
        (url.platform === 'youtube' && wantTwitch);
      if (conflict) return { form: 'reject', reason: 'url-opt-conflict' };
      return { form: 'url', platform: url.platform, identifier: url.identifier };
    }

    // Not a URL — a bare handle or a character/MQL seed.
    if (wantTwitch && wantYoutube) {
      // Mutually-exclusive opts: nothing disambiguates the platform.
      return { form: 'reject', reason: 'ambiguous-handle' };
    }
    if (wantYoutube) {
      // An `@`-prefixed / MQL-seed token with `--youtube` is a character
      // reference on YouTube — deferred (GoogleProfile stores no channel).
      if (raw.startsWith('@')) {
        return { form: 'reject', reason: 'character-youtube' };
      }
      return { form: 'handle', platform: 'youtube', identifier: raw };
    }
    if (wantTwitch) {
      return {
        form: 'handle',
        platform: 'twitch',
        identifier: StreamerTarget.stripAt(raw),
      };
    }
    // No opt, no URL: a character / MQL seed the resolver walks to a linked
    // Twitch login. On a miss the resolver reports `ambiguous-handle`.
    return { form: 'character', identifier: raw };
  }

  /**
   * Classify a YouTube identifier into videoId / channelId / handle — the
   * shared branch point for both the `watch` embed shape and the chat
   * resolve. `@handle` → handle; a `UC…`-shaped 24-char id → channelId; an
   * 11-char id → videoId; anything else → handle (a bare `@`-less handle).
   */
  static classifyYoutubeRef(identifier: string): YoutubeRefKind {
    const id = identifier.trim();
    if (id.startsWith('@')) return 'handle';
    if (/^UC[A-Za-z0-9_-]{22}$/.test(id)) return 'channelId';
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) return 'videoId';
    return 'handle';
  }

  // ---- pure URL parsing --------------------------------------------------

  private static stripAt(s: string): string {
    return s.startsWith('@') ? s.slice(1) : s;
  }

  /**
   * Extract a `{ platform, identifier }` from a URL-shaped argument, or
   * `null` when the argument isn't a recognized stream URL. Tolerates a
   * missing scheme (`twitch.tv/shroud`), `www.`, and trailing query/hash.
   */
  private static parseUrl(
    raw: string,
  ): { platform: Platform; identifier: string } | null {
    const lower = raw.toLowerCase();
    const looksLikeUrl =
      lower.includes('twitch.tv') ||
      lower.includes('youtube.com') ||
      lower.includes('youtu.be');
    if (!looksLikeUrl) return null;

    // Normalize to a parseable URL (default the scheme so `URL` accepts a
    // bare host). Any parse failure → treat as not-a-URL (total, no throw).
    let url: URL;
    try {
      url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (host === 'twitch.tv') {
      const channel = segments[0];
      return channel ? { platform: 'twitch', identifier: channel } : null;
    }

    if (host === 'youtu.be') {
      const videoId = segments[0];
      return videoId ? { platform: 'youtube', identifier: videoId } : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      // watch?v=<id>
      const v = url.searchParams.get('v');
      if (v) return { platform: 'youtube', identifier: v };
      // embed/live_stream?channel=<UC…>
      const channelParam = url.searchParams.get('channel');
      if (channelParam) {
        return { platform: 'youtube', identifier: channelParam };
      }
      const first = segments[0] ?? '';
      // /@handle
      if (first.startsWith('@')) {
        return { platform: 'youtube', identifier: first };
      }
      // /channel/UC…  or  /live/<id>  or  /embed/<id>
      if (
        (first === 'channel' || first === 'live' || first === 'embed') &&
        segments[1]
      ) {
        return { platform: 'youtube', identifier: segments[1] };
      }
      return null;
    }

    return null;
  }
}
