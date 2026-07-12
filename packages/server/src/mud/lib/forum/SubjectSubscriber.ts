/**
 * SubjectSubscriberMixin — per-Avatar subscription state for Subjects
 * (the forum / chat audience spine). One entry per subscribed Subject:
 * a `follow` toggle plus a per-surface mute set.
 *
 * Storage is a typed keyed map (subjectId → SubjectSubscription),
 * persisted as a plain JSON object on the owner — the same structured-
 * value precedent as `ContactsMixin._contacts` / `AliasMixin.aliases`.
 * This replaces the earlier per-subject `PropertiedMixin` keys: the
 * subscription surface is expected to grow (notification prefs,
 * per-surface settings, digests), so it earns a typed home + method
 * contract now rather than an untyped property bag.
 *
 * The merge / default policy and the group-audience checks live on
 * `SubjectCatalogue`; this mixin is the raw keyed store it delegates to.
 */

import type { MixinConstructor } from '../mixin';
import type { SubjectSurface } from './Subject';

/** Per-subject subscription: one `follow` toggle + a per-surface mute set. */
export interface SubjectSubscription {
  followed: boolean;
  mutedSurfaces: SubjectSurface[];
}

/** Method contract a Subject-subscribing owner (Avatar) exposes. */
export interface SubjectSubscriber {
  /** This owner's stored subscription for `subjectId`, or undefined. */
  getSubjectSubscription(subjectId: string): SubjectSubscription | undefined;
  /** True if this owner has any stored subscription for `subjectId`. */
  hasSubjectSubscription(subjectId: string): boolean;
  /** Upsert the stored subscription for `subjectId`. */
  setSubjectSubscription(subjectId: string, sub: SubjectSubscription): void;
  /** Drop the stored subscription for `subjectId`. True if one was removed. */
  removeSubjectSubscription(subjectId: string): boolean;
  /** Every subjectId this owner has a stored subscription for. */
  subscribedSubjectIds(): string[];
}

export function SubjectSubscriberMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class SubjectSubscriberMixin extends Base implements SubjectSubscriber {
    static _mixinName = 'SubjectSubscriberMixin';

    /**
     * The hydrator round-trips `_subjectSubscriptions` by reflection.
     * Stored as a plain JSON object (subjectId → {followed,
     * mutedSurfaces}); structured-value persistence per the
     * `ContactsMixin._contacts` precedent. Default `{}` hydrates legacy
     * avatar docs (no field) cleanly.
     */
    static persistentFields = ['_subjectSubscriptions'];

    /** @runtimeState */
    _subjectSubscriptions: Record<string, SubjectSubscription> = {};

    getSubjectSubscription(
      subjectId: string,
    ): SubjectSubscription | undefined {
      return this._subjectSubscriptions[subjectId];
    }

    hasSubjectSubscription(subjectId: string): boolean {
      return Object.prototype.hasOwnProperty.call(
        this._subjectSubscriptions,
        subjectId,
      );
    }

    setSubjectSubscription(
      subjectId: string,
      sub: SubjectSubscription,
    ): void {
      this._subjectSubscriptions[subjectId] = sub;
    }

    removeSubjectSubscription(subjectId: string): boolean {
      if (!this.hasSubjectSubscription(subjectId)) return false;
      delete this._subjectSubscriptions[subjectId];
      return true;
    }

    subscribedSubjectIds(): string[] {
      return Object.keys(this._subjectSubscriptions);
    }
  };
}
