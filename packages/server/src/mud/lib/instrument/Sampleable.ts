/**
 * Sampleable — ⭐ **a piece can be taken from it** (controller-liquidity
 * W7c): the `sample` verb's one protocol.
 *
 * `sample` had five cases in its controller — a stem out of a standing
 * crop, a piece split off a stack, a lump stamped where it lies, a chip
 * off the face in front of you (a duck-typed probe on the room),
 * and a refusal — picked by what the target turned out to be. Which piece
 * comes off is a fact about the THING, so the thing answers:
 *
 *  - `SampledMixin` (matter that carries a provenance stamp) answers with a
 *    piece split off a stack, or the whole lump when it is one;
 *  - `Plant` overrides: a crop standing in a field gives ONE stem at the
 *    part named (field population D7), the stand keeping its area;
 *  - the ground's `StrataMixin` (the `ground` pack) answers for the rock
 *    in front of you — nothing, on plain ground — and mining's
 *    `WorkingMixin` overrides with a lump of its face.
 *
 * ⚠ The STAMP stays the verb's (`Sampled.stampSampling` is gated to the
 * `sample` controller): the answer says what piece came off and which
 * place it is to be stamped with (`at` — the field for a stem, else where
 * the taker stands); the controller stamps it. The record is unforgeable
 * because only the verb writes it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';
import type { PartChoices, PartRefusal, Soil } from '../husbandry/Soil';

/** What `sample` asks: the part of a field named (`at`), and the face's words (`sample the north face`). */
export interface SampleRequest {
  part: (Stuff & Soil) | null;
  face: string;
}

/** What came off. */
export interface SampleFacts {
  piece: Stuff;
  /** `stem` — pulled from a standing crop; `piece` — off a thing; `face` — off the ground. */
  from: 'stem' | 'piece' | 'face';
  /** The place the stamp names; `null` = where the taker stands. */
  at: Stuff | null;
  /** The part of the field a stem came from. */
  part: (Stuff & Soil) | null;
}

/**
 * Every reason no piece came off — closed. `not-samplable` — not matter you
 * take a piece of (the controller teaches why, in the thing's own terms);
 * `nothing-to-take` — too little of it, or a face with nothing in it.
 */
export type SampleRefusal =
  | ActRefusal<'not-samplable'>
  | ActRefusal<'nothing-to-take'>
  | ActRefusal<'nothing-sown-there', { part: (Stuff & Soil) | null }>
  | PartRefusal;

/** What `samplePiece` answers. */
export type SampleAnswer = ActOutcome<SampleFacts> | SampleRefusal | PartChoices;

/** A thing a sample can be taken from. */
export interface Sampleable {
  /** Take a piece of this for `actor`, or say why not. Unstamped — the verb stamps it. */
  samplePiece(actor: Stuff, req: SampleRequest): Promise<SampleAnswer>;
}

/**
 * ⭐ **`SampleableMixin` — the `sample` protocol, as a mixin.** The default
 * takes nothing (`not-samplable`); `SampledMixin`, `Plant` and the ground's
 * `StrataMixin` override.
 */
export function SampleableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SampleableMixin extends Base implements Sampleable {
    static _mixinName: string = 'SampleableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook A piece of this for `actor`. Default: nothing to take. */
    public async samplePiece(_actor: Stuff, _req: SampleRequest): Promise<SampleAnswer> {
      return { ok: false, reason: 'not-samplable' };
    }
  };
}
