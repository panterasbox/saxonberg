/**
 * SampledMixin — ⭐⭐⭐ **where this piece of matter was taken from.**
 *
 * Three fields and no behaviour. A sample is not a special kind of
 * object: it is a perfectly ordinary lump of ore or portion of food with
 * a provenance stamp on it, which is why the bench can assay the real
 * material and the report can say where it came from.
 *
 * ## ⭐⭐ Provenance is a historical CLAIM, and nothing resolves it
 *
 * `sampledAt` is an identity path **string**. It is never looked up.
 * When the face is worked out, the gallery collapses or the source is
 * destructed, **nothing is nulled and nothing dangles** — the sample
 * still truthfully says where it was taken, because where it was taken
 * is a fact about the past.
 *
 * So every consumer **groups by the string** and never resolves it: the
 * distinct-faces count in an aggregate read, the line on a report, the
 * salting check. ⚠ A reader that resolved `sampledAt` to a live Stuff
 * would silently drop worked-out faces out of a prospector's own survey
 * — which is the defect this paragraph exists to prevent, and the
 * shipped belief-referent idiom (`survey:<deposit>@<where>#<channel>`)
 * is the precedent.
 *
 * ⭐ There is deliberately **no `sampledFrom`**. The source object adds
 * nothing that `sampledAt` plus the thing's own material does not
 * already say, and an unread field is what `lint:unconsumed-seams`
 * exists to catch.
 *
 * ## ⚠ Merging cannot launder provenance
 *
 * `onSplit` carries all three across — a piece of a sample is a sample
 * of the same place. `onMerged` NULLS them when the absorbed stack's
 * differ, because a pooled lot has no single origin and saying it does
 * would be the one lie this substrate must not tell.
 *
 * ## The stamp is unforgeable, and the fraud is upstream of it
 *
 * `stampSampling` is gated to the `sample` verb, the fields are not
 * `authorable`, and no verb edits them. ⭐ **Salting still works**:
 * carry a rich lump to a barren claim, drop it, `sample` it there, and
 * the stamp says the barren face — honestly, because that is where it
 * was taken. The record is truthful; the person is not.
 */

import { CallSecurity } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** Where, by whom and when a piece of matter was taken. */
export interface Sampling {
  /** The place's identity path, as a STRING. Never resolved. */
  readonly at: string;
  /** The taker's `getIdentityPath()` — never their lineage stamp. */
  readonly by: string;
  /** Game-time milliseconds at the taking. */
  readonly on: number;
}

export interface Sampled {
  /** Whether this piece carries a provenance stamp at all. */
  isSample(): boolean;
  /** The stamp, or `null` when this is just a lump of ore. */
  getSampling(): Sampling | null;
  /** Stamp this piece. Gated to the `sample` verb. */
  stampSampling(at: string, by: string, on: number): void;
}

/** Only the verb that takes a sample may say where it came from. */
const SampleVerbOnly = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/platform/idea/cmd/inventory/SampleController'),
  SecurityPolicies.SelfOnly,
);

export function SampledMixin<TBase extends MixinConstructor>(Base: TBase) {
  // Declared-then-returned (the `Posed` shape) so method decorators are
  // legal — a class EXPRESSION cannot carry them.
  class SampledMixin extends Base implements Sampled {
    static _mixinName: string = 'SampledMixin';

    static fieldMeta: FieldMeta = {
      ...((Base as unknown as { fieldMeta?: FieldMeta }).fieldMeta ?? {}),
      // ⚠ Persistent and NOT authorable: a stamp an author could write
      // is a stamp a player could eventually forge, and the whole value
      // of the record is that it cannot be.
      //
      // ⚠ `ref: identity` on `sampledAt` says what it IS — a path
      // string, persistable, re-resolved by nobody. Not an instance
      // ref: the place may be gone and the claim still true.
      sampledAt: { persistent: true, ref: 'identity' },
      sampledBy: { persistent: true },
      sampledOn: { persistent: true },
    };

    /** The place's identity path. `''` when this is not a sample. */
    public sampledAt: string = '';

    /** ⚠ `getIdentityPath()`, never `getTemplatePath()` — every player
     * Avatar shares one lineage stamp, so keying a PERSON on it would
     * make every sample look like it was taken by the same character. */
    public sampledBy: string = '';

    /** Game ms. What the spoiled-sample tell measures the journey from. */
    public sampledOn: number = 0;

    public isSample(): boolean {
      return this.sampledAt !== '';
    }

    public getSampling(): Sampling | null {
      if (!this.isSample()) return null;
      return { at: this.sampledAt, by: this.sampledBy, on: this.sampledOn };
    }

    @CallSecurity(SampleVerbOnly)
    public stampSampling(at: string, by: string, on: number): void {
      this.sampledAt = at;
      this.sampledBy = by;
      this.sampledOn = on;
    }

    /**
     * A piece of a sample is a sample of the same place. ⭐ The
     * reading-relevant half of this was already shipped — `Ore.onSplit`
     * carries the grade — so taking a sample is *split plus a stamp*,
     * not a new mechanism.
     */
    public onSplit(splitoff: Stuff): void {
      const cut = splitoff as unknown as SampledMixin;
      if (typeof cut.stampCopy === 'function') {
        cut.stampCopy(this.sampledAt, this.sampledBy, this.sampledOn);
      }
      // ⚠ The hook belongs to `StackableMixin`, and this mixin composes
      // over hosts that are NOT stackable (a `Provision` is one lump and
      // splits into nothing). So the super-call is guarded rather than
      // declared `override`: an unstackable host simply has no inner
      // hook to reach.
      const inner = (
        Base.prototype as unknown as { onSplit?: (s: Stuff) => void }
      ).onSplit;
      if (typeof inner === 'function') inner.call(this, splitoff);
    }

    /**
     * ⚠⚠ **A pooled lot has NO single origin**, and saying it did would
     * be the one lie this substrate must not tell. Two lots from
     * different faces merge into a lot from nowhere — which is honest,
     * and is why merging cannot launder provenance.
     */
    public onMerged(absorbed: Stuff): void {
      const lot = absorbed as unknown as SampledMixin;
      const theirs = typeof lot.getSampling === 'function'
        ? lot.getSampling()
        : null;
      const mine = this.getSampling();
      const same =
        (mine === null && theirs === null) ||
        (mine !== null && theirs !== null && mine.at === theirs.at);
      if (!same) {
        this.sampledAt = '';
        this.sampledBy = '';
        this.sampledOn = 0;
      }
      const inner = (
        Base.prototype as unknown as { onMerged?: (s: Stuff) => void }
      ).onMerged;
      if (typeof inner === 'function') inner.call(this, absorbed);
    }

    /**
     * The split-side copy. Separate from {@link stampSampling} because
     * the gate on that one names the VERB, and a split is the stack
     * substrate doing its own bookkeeping rather than anybody taking a
     * new sample.
     */
    public stampCopy(at: string, by: string, on: number): void {
      this.sampledAt = at;
      this.sampledBy = by;
      this.sampledOn = on;
    }
  }
  return SampledMixin;
}
