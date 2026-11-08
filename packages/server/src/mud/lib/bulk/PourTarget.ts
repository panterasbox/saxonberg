/**
 * PourTargetMixin — ⭐ the protocol behind `pour` (controllers-are-io D12): the
 * TARGET says what being poured into means. Two kinds of thing answer: a holder
 * of bulk takes the liquid (`BulkableMixin`, through `BulkableApi.transfer`), and
 * a build vessel banks a serving or an ingredient (`ManualBuildMixin`). One verb,
 * one view: there used to be two, and which of them a line reached was recency.
 *
 * The answer is an {@link ActPlan} or a refusal; the controller words both.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { MqlOneResult } from '../../api/mql';
import type { CommandContext } from '../../api/command';
import type { ActPlan } from '../craft/ActPlan';

/** A note the object hands back for the envelope (a clamp, a declined pour). */
export type PourNote = Parameters<CommandContext['note']>[0];

/** `pour`, asked of what is poured into. */
export interface PourRequest {
  by: Stuff;
  /** What is poured: a vessel by name, a material by keyword, an ingredient. */
  source: Stuff;
  sourceVia?: MqlOneResult['via'];
  /** The slot of this target the line reached (`:b`). */
  targetVia?: MqlOneResult['via'];
  /** `--amount 2cups`. Absent: as much as fits, or one serving. */
  amount?: string;
  /** `--exact`: the full measure or none of it. */
  exact?: boolean;
}

/** Why a pour was refused. */
export type PourReason =
  | 'not-a-pour-target'
  | 'nothing-in-source'
  | 'not-a-holder'
  | 'source-empty'
  | 'ingredient-gone';

/** A refused pour. */
export interface PourRefusal {
  ok: false;
  reason: PourReason;
  facts: { source: Stuff; target: Stuff };
}

/** What a build step's begin words need; a bulk pour has none. */
export type PourBegin =
  | { kind: 'now' }
  | { kind: 'serving'; source: Stuff; target: Stuff }
  | { kind: 'ingredient'; source: Stuff; target: Stuff };

/** What came of a pour, with the notes the transfer filed. */
export type PourDone = { source: Stuff; target: Stuff; notes: readonly PourNote[] } & {
  kind:
    | 'melted'
    | 'burned'
    | 'escaped'
    | 'drained'
    | 'mismatch'
    | 'too-much'
    | 'full'
    | 'nothing'
    | 'lost-wax'
    | 'mould-broken'
    | 'poured'
    | 'banked'
    | 'added';
};

/** What a pour answers. */
export type PourAnswer = ActPlan<PourBegin, PourDone, PourRefusal> | PourRefusal;

export interface PourTarget {
  /** @hook What being poured into means here. */
  receivePour(req: PourRequest): Promise<PourAnswer> | PourAnswer;
}

export function PourTargetMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PourTargetMixin extends Base implements PourTarget {
    static _mixinName: string = 'PourTargetMixin';
    static _mixinKind = 'protocol' as const;

    /**
     * See {@link PourTarget.receivePour}. Default: nothing goes in. ⚠ A cook
     * pot composes this twice (a build over a holder), so the outer default
     * hands the question down rather than shadowing the holder beneath it.
     */
    public receivePour(req: PourRequest): Promise<PourAnswer> | PourAnswer {
      const beneath = (Base.prototype as Partial<PourTarget>).receivePour;
      if (beneath) return beneath.call(this, req);
      return {
        ok: false,
        reason: 'not-a-pour-target',
        facts: { source: req.source, target: this as unknown as Stuff },
      };
    }
  };
}
