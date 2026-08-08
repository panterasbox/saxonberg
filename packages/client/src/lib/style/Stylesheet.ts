/**
 * Stylesheet — selector→treatment resolution.
 *
 * Cascade order: theme → user overlay → plain-mode override.
 *
 * - **Theme**: the bundle picked by `overlay.theme` (default vs
 *   high-contrast). Provides defaults across every selector kind.
 * - **User overlay**: a flat-key bag persisted on `HasInteractiveMixin`
 *   (`style.overlay` key); the player edits it through the `style`
 *   verb. Layered on top of the theme.
 * - **Plain-mode override**: when `overlay.plain` is true (globally)
 *   or `overlay['plain.channel.<id>']` is true (per-channel), the
 *   resolver returns the empty treatment regardless of theme /
 *   overlay rules. The renderer collapses to the failsafe layout.
 *
 * Five selector kinds:
 *   - `topic` (longest-prefix cascade) — `speech.comms` →
 *     merge `speech` then override with `speech.comms`.
 *   - `channel` — `<chan id>` chip color; theme default + overlay
 *     `channel.<id>.color` scalar override.
 *   - `element` — tag name; `<strong>` bold, `<em>` italic, etc.
 *   - `attribute → bucket` — `stuff-id` → bucket resolver → bucket
 *     treatment. v1 stub returns `neutral`, so this is exercised
 *     but inert; the social-graph slate wires the real source.
 *   - `content-match` — viewer-relative (mention-target matches
 *     viewer's stuff-id). v1 ships own-name + mention-target.
 */

import type {
  StyleOverlay,
  StyleTreatment,
  Theme,
  BucketResolver,
  FontRole,
} from './types';

interface StylesheetOptions {
  resolver: BucketResolver;
  viewerStuffId: string | null;
}

const EMPTY: StyleTreatment = {};

/** Mutate `into` by overwriting any key present on `from`. */
function mergeTreatment(into: StyleTreatment, from: StyleTreatment): void {
  for (const key of Object.keys(from) as (keyof StyleTreatment)[]) {
    if (from[key] !== undefined) {
      (into as Record<string, unknown>)[key] = from[key];
    }
  }
}

export class Stylesheet {
  constructor(
    private readonly theme: Theme,
    private readonly overlay: StyleOverlay,
    private readonly opts: StylesheetOptions,
  ) {}

  /** The theme name in force after the overlay's `theme` override. */
  get themeName(): Theme['name'] {
    return this.theme.name;
  }

  /** Underlying palette tokens, exposed so the renderer can paint
   *  contextual defaults (e.g., the chat chip's base color when no
   *  per-channel override applies). */
  get palette(): Theme['palette'] {
    return this.theme.palette;
  }

  /** Plain-mode check — true when styling should collapse to identity. */
  isPlain(channelId?: string): boolean {
    if (this.overlay.plain === true) return true;
    if (channelId !== undefined) {
      const key = `plain.channel.${channelId}` as const;
      if (this.overlay[key] === true) return true;
    }
    return false;
  }

  /**
   * Resolve the treatment for a frame topic via longest-prefix
   * cascade — both theme and overlay contribute. Plain mode wins.
   */
  topicTreatment(topic: string): StyleTreatment {
    if (this.isPlain()) return EMPTY;
    const merged: StyleTreatment = {};
    const segments = topic.split('.');
    for (let depth = 1; depth <= segments.length; depth++) {
      const prefix = segments.slice(0, depth).join('.');
      const themeRule = this.theme.topic[prefix];
      if (themeRule) mergeTreatment(merged, themeRule);
      const overlayKey = `topic.${prefix}` as const;
      const overlayRule = this.overlay[overlayKey];
      if (isTreatmentObject(overlayRule)) mergeTreatment(merged, overlayRule);
    }
    return merged;
  }

  /**
   * Resolve the treatment for an MML element tag. Theme defaults +
   * overlay `element.<tag>` override.
   */
  elementTreatment(tag: string): StyleTreatment {
    if (this.isPlain()) return EMPTY;
    const merged: StyleTreatment = {};
    const themeRule = this.theme.element[tag];
    if (themeRule) mergeTreatment(merged, themeRule);
    const overlayRule = this.overlay[`element.${tag}` as const];
    if (isTreatmentObject(overlayRule)) mergeTreatment(merged, overlayRule);
    return merged;
  }

  /**
   * Channel chip color. Returns the resolved foreground color, or
   * `null` if no rule applies (renderer uses palette default).
   */
  channelColor(channelId: string): string | null {
    if (this.isPlain(channelId)) return null;
    const overlayKey = `channel.${channelId}.color` as const;
    const overlayColor = this.overlay[overlayKey];
    if (typeof overlayColor === 'string') return overlayColor;
    const themeDefault = this.theme.palette.channelDefaults[channelId];
    if (typeof themeDefault === 'string') return themeDefault;
    return null;
  }

  /**
   * Bucket-based treatment for a `<player>` / `<npc>` carrying a
   * stuff-id. v1 always lands on `neutral` (empty treatment) because
   * the resolver stub returns neutral for everything; the call is
   * still made so swapping the real resolver in later is automatic.
   */
  bucketTreatment(stuffId: string): StyleTreatment {
    if (this.isPlain()) return EMPTY;
    const bucket = this.opts.resolver.resolveBucket(stuffId);
    const merged: StyleTreatment = {};
    const themeRule = this.theme.bucket[bucket];
    if (themeRule) mergeTreatment(merged, themeRule);
    const overlayRule = this.overlay[
      `attribute.stuff-id.${bucket}` as const
    ];
    if (isTreatmentObject(overlayRule)) mergeTreatment(merged, overlayRule);
    return merged;
  }

  /**
   * Mention treatment — viewer-relative. Returns the self-match
   * treatment when the mention's stuff-id matches the viewer's,
   * else the other-match treatment.
   */
  mentionTreatment(mentionStuffId: string): StyleTreatment {
    if (this.isPlain()) return EMPTY;
    const isSelf = mentionStuffId === this.opts.viewerStuffId;
    // `mention.self = false` in the overlay disables the self-match
    // highlight (acceptance criterion #19).
    if (isSelf && this.overlay['mention.self'] === false) {
      return this.resolveMentionRule('other');
    }
    return this.resolveMentionRule(isSelf ? 'match' : 'other');
  }

  /**
   * Font-family stack for a frame topic. Longest-prefix cascade over
   * the theme's `registers` table — the **same walk** `topicTreatment`
   * uses — resolved through the `fontRoles` role→family token table.
   * Defaults to the `command` (mono) role when no prefix matches (the
   * conservative MUD-throwback default).
   *
   * Deliberately does NOT honor `isPlain()`: plain mode collapses
   * *decorative* treatments (color / weight / italic) to identity, but
   * font register is a legibility/structural choice and the failsafe
   * message string is unchanged regardless — so reader sovereignty is
   * intact (the string is complete; font is presentation only) without
   * forcing plain-mode readers back into mono. (Reversible: to make
   * plain mode full-mono, return `this.theme.fontRoles.command` when
   * `this.isPlain()`.)
   */
  fontFamilyForTopic(topic: string): string {
    return this.theme.fontRoles[this.registerForTopic(topic)];
  }

  /** Longest-prefix cascade over `theme.registers` — deepest matching
   *  prefix wins; `command` (mono) on a miss. Mirrors `topicTreatment`. */
  private registerForTopic(topic: string): FontRole {
    let role: FontRole = 'command';
    const segments = topic.split('.');
    for (let depth = 1; depth <= segments.length; depth++) {
      const prefix = segments.slice(0, depth).join('.');
      const mapped = this.theme.registers[prefix];
      if (mapped) role = mapped; // deeper prefix overrides shallower
    }
    return role;
  }

  private resolveMentionRule(kind: 'match' | 'other'): StyleTreatment {
    const merged: StyleTreatment = {};
    mergeTreatment(merged, this.theme.mention[kind]);
    const overlayRule = this.overlay[`mention.${kind}` as const];
    if (isTreatmentObject(overlayRule)) mergeTreatment(merged, overlayRule);
    return merged;
  }
}

function isTreatmentObject(value: unknown): value is StyleTreatment {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
