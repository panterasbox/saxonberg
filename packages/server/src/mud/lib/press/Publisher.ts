/**
 * PublisherMixin — an organization that **publishes**.
 *
 * The third hat over the org chart, beside the Business that trades: a
 * press office, a ministry's communications shop, and later a newspaper
 * (which is an organization that trades *and* publishes — one entity,
 * both mixins).
 *
 * ⭐ **The appointing authority appoints; the position acts.** Whoever may
 * fill this organization's positions has, by that alone, **no** power to
 * publish through it. Publishing is earned the way anyone earns it — by
 * holding a position named in `publishingPositions`. An organization with
 * nobody in those positions publishes nothing, and that is correct: it is
 * the gazette slate's own *"a locality with no gazette is a fact about
 * that locality."*
 *
 * What a publisher declares:
 *
 *   - `realm` — `ooc` (out-of-character / operator) vs `world`
 *     (in-fiction). ⚠ A release **derives** its realm from here and cannot
 *     supply one, so there is one source rather than a copy that drifts.
 *   - `visibility` — the default reach of what it publishes. A release may
 *     narrow this; it may never widen it.
 *   - `feedPath` — the document-tree branch its releases live under. A
 *     release is a `StoredDocument` at `<feedPath>/<id>`.
 *   - `label` — the masthead a reader sees on the front page.
 *   - `publishingPositions` — which of the organization's positions may
 *     publish. **Empty means any position**, which is the small-shop case
 *     (everyone at a two-person paper writes), not a wildcard for
 *     outsiders: you still have to hold a position.
 */

import { Mixins, type MixinConstructor, type FieldMeta } from '../mixin';
import type { Organization } from '../employment/Organization';

/**
 * Which broadcast realm a publisher speaks in — `ooc` (out-of-character /
 * operator) vs `world` (in-fiction). Declared by the publisher; a release
 * derives it.
 */
export type ReleaseRealm = 'ooc' | 'world';

/** The blessed realm vocabulary (validation array). */
export const RELEASE_REALMS: readonly ReleaseRealm[] = ['ooc', 'world'];

/**
 * How far a release reaches. A two-value ordinal, **most public first** —
 * the order is what makes the narrowing clamp a total, monotone `max`
 * rather than a table of cases.
 */
export type ReleaseVisibility = 'public' | 'members';

/** The blessed visibility vocabulary (validation array), most public first. */
export const RELEASE_VISIBILITIES: readonly ReleaseVisibility[] = [
  'public',
  'members',
];

/**
 * Public method surface (methods only, per the inter-stuff contract). The
 * fields are public so the Hydrator can reflect into them; they are not
 * the contract surface.
 */
export interface Publisher {
  /**
   * The masthead — what a reader sees attributed on a release. Falls back
   * to the organization's own path when unauthored, so the front page
   * never shows a blank byline.
   */
  getLabel(): string;
  /** The realm this publisher speaks in; a release derives it. */
  getRealm(): ReleaseRealm;
  /** The default reach of what it publishes; a release may only narrow it. */
  getVisibility(): ReleaseVisibility;
  /** The document-tree branch its releases live under ('' = unauthored). */
  getFeedPath(): string;
  /** Which positions may publish; **empty = any position at all**. */
  getPublishingPositions(): readonly string[];
}

/** The persistent field slots this mixin declares — Hydrator-facing. */
export interface PublisherFields {
  label: string;
  realm: string;
  visibility: string;
  feedPath: string;
  publishingPositions: string[];
}

/** Coerce a hydrated value into the realm vocabulary (default `ooc`). */
function coerceRealm(raw: unknown): ReleaseRealm {
  return RELEASE_REALMS.includes(raw as ReleaseRealm)
    ? (raw as ReleaseRealm)
    : 'ooc';
}

/**
 * Coerce a hydrated value into the visibility vocabulary. ⚠ The default is
 * the **narrow** end: an unauthored or misspelled visibility must not
 * publish to the world.
 */
function coerceVisibility(raw: unknown): ReleaseVisibility {
  return RELEASE_VISIBILITIES.includes(raw as ReleaseVisibility)
    ? (raw as ReleaseVisibility)
    : 'members';
}

/**
 * ⚠ The base must already carry `OrganizationMixin` — publishing is a
 * thing an *organization* does, and the whole point of the entitlement is
 * that it keys on holding one of that organization's positions. The
 * `MountableMixin`-requires-`Slotted` idiom; composition happens at the
 * concrete class.
 */
export function PublisherMixin<
  TBase extends MixinConstructor<Organization>,
>(Base: TBase) {
  class PublisherMixin extends Base implements Publisher {
    static _mixinName = Mixins.Publisher;

    static fieldMeta: FieldMeta = {
      label: { persistent: true, authorable: true },
      realm: { persistent: true, authorable: true },
      visibility: { persistent: true, authorable: true },
      feedPath: { persistent: true, authorable: true },
      publishingPositions: { persistent: true, authorable: true },
    };

    /** The masthead a reader sees. Empty = fall back to the org path. */
    public label: string = '';

    /** `ooc` | `world`; a release derives its realm from this. */
    public realm: string = 'ooc';

    /** `public` | `members`; a release may narrow it, never widen it. */
    public visibility: string = 'members';

    /** The document-tree branch releases live under. */
    public feedPath: string = '';

    /** Position keys allowed to publish; empty = any position. */
    public publishingPositions: string[] = [];

    public getLabel(): string {
      return (
        this.label ||
        (this as unknown as { getTemplatePath(): string | null })
          .getTemplatePath() ||
        ''
      );
    }

    public getRealm(): ReleaseRealm {
      return coerceRealm(this.realm);
    }

    public getVisibility(): ReleaseVisibility {
      return coerceVisibility(this.visibility);
    }

    public getFeedPath(): string {
      return this.feedPath;
    }

    public getPublishingPositions(): readonly string[] {
      return [...this.publishingPositions];
    }
  }
  return PublisherMixin;
}
