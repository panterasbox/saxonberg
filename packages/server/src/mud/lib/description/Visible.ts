/**
 * VisibleMixin - Adds description properties for visible objects
 *
 * Provides:
 * - shortDescription: string (brief description)
 * - longDescription: string (detailed description)
 * - getShort(): string
 * - getLong(): string
 * - look command for examining objects
 *
 * Usage:
 * ```typescript
 * class MyClass extends VisibleMixin(BaseClass) {
 *   // ...
 * }
 * ```
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { ShadowChangedEvent } from '../events/ShadowChangedEvent';
import {
  MqlSubscriptionApi,
  type SubscribableFieldDescriptor,
} from '../../api/mql-subscription';
import type { Stuff } from '../stuff/Stuff';
import {
  Mml,
  type AugmentOpts,
  type MarkupAugmenter,
} from '../../api/mml';
import { PerceptionApi } from '../../api/perception';
import type { SenseChannel } from './Perceiver';
import { SENSE_CHANNELS } from './Perceiver';

/**
 * Mixin that adds description properties for visible objects.
 *
 * Visible is pure **target shape** — it owns the description state
 * (`shortDescription` / `longDescription`) and contributes no
 * verbs. The verbs of perception (`look` / `scry` / `locate`) live
 * on `PerceiverMixin`'s `self` bucket; perceivers issue them, and
 * scope resolution at execution time picks any reachable Visible
 * as a target.
 *
 * The earlier shape — Visible adding `look.yaml` on
 * `environment`/`inventory`/`peers` — granted the verb to the
 * looker's stack *because there happened to be a visible thing
 * nearby*, which inverts the contract: actor capability shouldn't
 * come from a target's existence. Compare a `Throne` contributing
 * `sit` on `environment` — that's correct because `sit` only
 * exists as a verb-against-that-specific-target; `look` is a
 * perceiver-side verb that takes any Visible as a target.
 */
/**
 * Public shape provided by VisibleMixin.
 */
export interface Visible {
  getShortDescription(): string;
  setShortDescription(value: string): void;
  getLongDescription(): string;
  setLongDescription(value: string): void;
  /**
   * Bucket-relative media key for this thing's illustration, or `null`.
   * The picture is a visual description, so it rides the same Visible
   * surface as the prose; the client prepends its configured media base
   * URL. Members fall back to their species' key via Organism's override.
   */
  getIllustration(): string | null;
  setIllustration(value: string | null): void;
  getShort(): string;
  getLong(): string;
  /**
   * Long description with every contributing mixin's
   * `markupAugmenters` applied — detail keys wrapped in `<detail>`
   * MML when the host composes Detailed, exit names wrapped in
   * `<exit>` when (future) Exitable contributes, language masks
   * applied when (future) Language contributes, etc. Plain Visible
   * hosts (no contributors) return `getLong()` unchanged.
   *
   * Same affordance-annotated text feeds both the `look` prose
   * composer and the `longDescription` subscription projection, so
   * the terminal scrollback and the inspection pane see identical
   * clickable wrappers around the same anchors.
   *
   * `viewer` is threaded through to augmenters that need per-recipient
   * decisions (language gating, spoiler hiding). Augmenters that
   * don't care just ignore it.
   *
   * `opts` is forward-compat per-call options. The senses build
   * uses `opts.filter` to pin a sense-channel allowlist (the four
   * single-sense verbs pass their own channel; `look` passes
   * `['vision']`; `sense` passes the viewer's full sensorium).
   * Default-absent `opts` means each augmenter falls back to its
   * own default (the `senseStripAugmenter` falls back to the
   * viewer's full sensorium — the gestalt rule).
   */
  getMarkupLong(viewer: Stuff, opts?: AugmentOpts): string;
}

export function VisibleMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VisibleMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'VisibleMixin';

    /**
     * Visible is target-shape only — no verb contributions. See the
     * mixin docstring for why `look.yaml` belongs on Perceiver's
     * `self` bucket, not on Visible's target-side buckets.
     */
    static commandContributions: CommandContributions = {
      self: [],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Persistent fields declared by this mixin.
     * Used by PersistApi for automatic synchronization.
     */
    static fieldMeta: FieldMeta = {
      shortDescription: { persistent: true, authorable: true },
      longDescription: { persistent: true, authorable: true },
      illustration: { persistent: true, authorable: true },
    };

    /**
     * Markup-augmenter contribution. `senseStripAugmenter` reads the
     * per-call filter from `AugmentOpts` and the viewer's sensorium
     * (derived from `BodyPlan.getModalities()`), and drops
     * `<sense channel="X">…</sense>` regions and `<detail sense="X">`
     * wrappings whose channel isn't in `filter ∩ sensorium`.
     *
     * Lives on `VisibleMixin` (not `DetailedMixin`) because `<sense>`
     * regions can appear in any Visible-mixed long, with or without
     * detail authoring. Ordering: VisibleMixin sits above Detailed
     * in the typical composition chain, so the parent-first walker
     * runs `senseStripAugmenter` BEFORE `wrapDetailKeysAugmenter` —
     * strip-then-wrap is correct because wrapping inside a region
     * destined for the strip is wasted work.
     */
    static markupAugmenters: MarkupAugmenter[] = [senseStripAugmenter];

    /**
     * Live-query subscribable fields. Each descriptor's
     * `dependsOnFields` defaults to `[descriptor.name]` (descriptor
     * name = source field name), so the `FieldChangedEvent` fires
     * from `setShortDescription` / `setLongDescription` trigger
     * re-projection automatically. The `ShadowChangedEvent` entries
     * cover future hood / disguise shadows that override visible
     * appearance without firing a field change.
     */
    static subscribableFields: SubscribableFieldDescriptor[] = [
      {
        name: 'shortDescription',
        read: (stuff) =>
          (stuff as unknown as Visible).getShortDescription(),
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
      {
        // `getMarkupLong(viewer)` is the host-level affordance-
        // annotated long description. The substrate's
        // `Mml.augment` static walks every contributing mixin's
        // `static markupAugmenters` and folds them through the raw
        // text — Detailed wraps detail keys in `<detail>` today;
        // future mixins (Exitable's direction auto-link, Language's
        // unknown-tongue masking) plug in via the same slot. Plain
        // Visible hosts contribute nothing and the wrap is a no-op.
        name: 'longDescription',
        read: (stuff, viewer) =>
          (stuff as unknown as Visible).getMarkupLong(viewer),
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
      {
        // The picture is viewer-perceived appearance like the prose, so
        // it reacts to ShadowChangedEvent too (a future disguise shadow
        // can override the portrait). `undefined` when unset → projectFields
        // omits it. The member fallback (own ?? species) lives in Organism's
        // getIllustration override, reached here via polymorphic dispatch.
        name: 'illustration',
        read: (stuff) =>
          (stuff as unknown as Visible).getIllustration() ?? undefined,
        changes: [{ on: ShadowChangedEvent, by: 'target' }],
      },
    ];

    /** Brief description, shown with an article ("a heavy iron door"). */
    protected shortDescription: string = '';
    /** Detailed examine text. */
    protected longDescription: string = '';
    /** Bucket-relative media key for this thing's illustration. */
    protected illustration: string | null = null;

    getShortDescription(): string {
      return this.shortDescription;
    }

    setShortDescription(value: string): void {
      this.shortDescription = MqlSubscriptionApi.fireFieldChange(
        this,
        'shortDescription',
        this.shortDescription,
        value,
      );
    }

    getLongDescription(): string {
      return this.longDescription;
    }

    setLongDescription(value: string): void {
      this.longDescription = MqlSubscriptionApi.fireFieldChange(
        this,
        'longDescription',
        this.longDescription,
        value,
      );
    }

    getIllustration(): string | null {
      return this.illustration;
    }

    setIllustration(value: string | null): void {
      // Invariant on the setter: a bucket-relative media key. Blank → null;
      // strip any leading slash so the client joins base + key cleanly.
      const key =
        value && value.trim() ? value.trim().replace(/^\/+/, '') : null;
      this.illustration = MqlSubscriptionApi.fireFieldChange(
        this,
        'illustration',
        this.illustration,
        key,
      );
    }

    /**
     * Get the short description with fallback.
     */
    getShort(): string {
      return this.shortDescription || 'You see nothing special.';
    }

    /**
     * Get the long description with fallback to short, then default.
     */
    getLong(): string {
      return this.longDescription || this.shortDescription || 'You see nothing special.';
    }

    /**
     * Affordance-annotated long description — see the interface
     * docstring for the augmenter pipeline contract. Calls
     * `Mml.augment` with the host (`this`), the supplied `viewer`,
     * and the per-call `opts` (the senses build threads
     * `opts.filter` through here for verb-specific sense filtering).
     * Every contributing mixin's augmenters run in
     * parent-first → child-last order.
     */
    getMarkupLong(viewer: Stuff, opts?: AugmentOpts): string {
      return Mml.augment(
        this.getLong(),
        this as unknown as Stuff,
        viewer,
        opts,
      );
    }
  };
}

/**
 * Sense-strip augmenter — drops `<sense channel="X">…</sense>`
 * regions and `<detail sense="X">` wrappings whose channel isn't in
 * `filter ∩ sensorium`. See `Mml.stripBySense` for the exact strip
 * rules per tag.
 *
 *   - `filter` comes from the per-call `AugmentOpts` (the four
 *     single-sense verbs pass `[channel]`; `look` passes
 *     `['vision']`; `sense` passes the viewer's full sensorium).
 *     Default-absent → fall back to the viewer's full sensorium.
 *   - `sensorium` comes from `PerceptionApi.sensorium(viewer)`
 *     mapped down to its `SenseChannel`-typed organ-key subset
 *     — viewer → Organism → Species → BodyPlan → `getModalities()`
 *     PLUS contributions from active-mixin `_grantsModalities`
 *     (Phase 6). A viewer without that chain has `[]` as their
 *     sensorium, so every `<sense>` region strips and only
 *     untagged prose survives (the right behavior for test
 *     fixtures and the dark-room AC).
 *
 * Untagged prose is always preserved (the rule lives in
 * `Mml.stripBySense` — text nodes outside `<sense>`/`<detail>` are
 * never touched). Exported separately from the mixin class so the
 * function is easy to identify by name in stack traces, mirroring
 * the `wrapDetailKeysAugmenter` pattern in `Detailed.ts`.
 */
// eslint-disable-next-line no-restricted-syntax -- documented exception: a markup-augmenter registered on the sense substrate, exported so it is named in stack traces and unit-testable in isolation. See architecture.md § sanctioned-exception registry.
export function senseStripAugmenter(
  text: string,
  _host: Stuff,
  viewer: Stuff,
  opts?: AugmentOpts,
): string {
  // The augmenter cares about the `SenseChannel`-typed subset of the
  // viewer's sensorium (the five physical channels) — those are the
  // values that can appear inside `<sense channel="X">` regions and
  // `<detail sense="X">` wrappings. ESP modalities are NOT in
  // `SenseChannel`'s union; they ride frame-level `meta.modality`
  // gating, not per-region body MML stripping. Filter the
  // PerceptionApi result down to the physical organ keys here.
  const allModalities = PerceptionApi.sensorium(viewer);
  const physicalSet = new Set<SenseChannel>(SENSE_CHANNELS);
  const sensorium: SenseChannel[] = [];
  for (const m of allModalities) {
    const organ = m.getModality();
    if (physicalSet.has(organ as SenseChannel)) {
      sensorium.push(organ as SenseChannel);
    }
  }
  const filter = opts?.filter ?? sensorium;
  const allowed = new Set<SenseChannel>();
  for (const ch of filter) {
    if (sensorium.includes(ch)) allowed.add(ch);
  }
  return Mml.stripBySense(text, allowed);
}
