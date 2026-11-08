/**
 * OnCallMixin — ⭐⭐ **who comes over**: the house's authored rule for which
 * of the able hands answers a patron (`call: regulars | rota`), and the
 * rotation that keeps it fair. See {@link CallPolicy} for the legs.
 *
 * ## ⭐ Why it is its own mixin (controllers-are-io D6)
 *
 * It shipped on `OrganizationMixin`, on the reading that the CHART is where
 * a hiring fact belongs. But composing a mixin is a claim about every host
 * — *every organization answers who is called* — and a government, a
 * registry or a press office answers nobody: all 37 authored `call:` rows
 * are businesses. So the chart keeps its name and its file, and the call
 * leaves to the one host it is honest on, `BusinessMixin`'s concrete class
 * (the Slotted → Attired precedent: the original idea keeps the name, the
 * later-added idea leaves). A watch or a registry that one day has two
 * clerks to choose between composes THIS — it does not have to become a
 * Business to get a rule, which was the worry that put it on the chart.
 *
 * The persisted field is still `call` (restore is key-agnostic).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import {
  CALL_POLICIES,
  type CallPolicy,
  type CallRequest,
  type CallVerdict,
} from './CallPolicy';

/** The public surface: the authored rule, and the act of applying it. */
export interface OnCall {
  /** This house's authored rule for who among the able is called; `''` ⇒ none. */
  getCall(): CallPolicy | '';
  /** Set it; throws loudly on a word that is not a policy. */
  setCall(value: unknown): void;
  /**
   * ⭐⭐ **Who comes over.** See {@link CallPolicy} — the house owns the
   * rule, so the house answers.
   *
   * ⚠ Named `callFor`, not `call`, because `call` is the authored FIELD
   * (`call: regulars` in the row, which is how it should read) and a field
   * and a method cannot share a name. The field is the rule; this is the
   * act.
   */
  callFor(request: CallRequest): CallVerdict;
}

export function OnCallMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class OnCallMixin extends Base implements OnCall {
    static _mixinName: string = 'OnCallMixin';

    static fieldMeta: FieldMeta = {
      call: { persistent: true, authorable: true },
    };

    /** ⭐⭐ **The authored rule for who among the able is called.** */
    public call: CallPolicy | '' = '';

    /**
     * Least-recently-called ticket per candidate identity — ⭐ runtime only.
     * A reboot forgetting whose turn it was costs a patron one order, and
     * is worth strictly less than a persisted field nobody can see.
     */
    private _lastCalled: Map<string, number> = new Map();
    private _callTicket = 0;

    public getCall(): CallPolicy | '' {
      return this.call;
    }

    /** The applier's Phase-1 setter: an unknown policy is refused loudly. */
    public setCall(value: unknown): void {
      if (value === '' || value === undefined || value === null) {
        this.call = '';
        return;
      }
      if (!(CALL_POLICIES as readonly unknown[]).includes(value)) {
        throw new Error(
          `OnCall.call: '${String(value)}' is not a call policy ` +
            `(expected one of ${CALL_POLICIES.join(', ')})`,
        );
      }
      this.call = value as CallPolicy;
    }

    /**
     * ⭐⭐⭐ **Who comes over.** The legs, in order, each one there because
     * of a case the one before it cannot answer:
     *
     *  1. **capability** — already applied by the caller (it knows what was
     *     asked for; the house does not);
     *  2. **your regular** (`regulars` only) — among candidates who
     *     recognize the patron, the one who holds them in the highest
     *     regard. This is the leg that lets a patron PREDICT who comes
     *     over, which is the whole point of it;
     *  3. **the freest** — somebody holding no engagement beats somebody
     *     mid-something. An idle barkeep serving you before a busy one is
     *     what a room with staff in it is supposed to look like;
     *  4. **rotation** — least recently called. ⭐ The leg that gives a NEW
     *     HIRE some orders, and the one that retires the identity-path
     *     sort: a player's path begins `/platform/` and every NPC's
     *     `/world/`, so sorting on it handed the player every tie forever,
     *     and between two NPCs it handed one of them every order of the
     *     bar's life.
     *
     * ⚠⚠ **No leg anywhere reads insertion, authored or identity order.**
     * That is the invariant worth protecting: each of those is a *stable*
     * wrong answer, and a stable wrong answer is the kind that survives a
     * year because nothing ever looks arbitrary.
     */
    public callFor(request: CallRequest): CallVerdict {
      const policy = this.call;
      const candidates = request.candidates;
      if (candidates.length === 0) return { ok: false, reason: 'nobody' };
      // ⚠ No fallback to the first member. A fallback would make the whole
      // mechanism optional, which is how the defect survived this long.
      if (!policy) return { ok: false, reason: 'no-call-policy' };
      if (candidates.length === 1) {
        this._stampCalled(candidates[0]!);
        return { ok: true, chosen: candidates[0]! };
      }

      let pool = [...candidates];

      // Leg 2 — your regular. Only among candidates who KNOW the patron:
      // being fond of a stranger is not a thing.
      if (policy === 'regulars') {
        const known = pool.filter(
          (c) => MixinApi.isBeliefStore(c) && c.recognizes(request.patron),
        );
        if (known.length) {
          let best = -Infinity;
          const fondest: Stuff[] = [];
          for (const c of known) {
            const regard = MixinApi.isBeliefStore(c)
              ? c.regardFor(request.patron)
              : 0;
            if (regard > best) {
              best = regard;
              fondest.length = 0;
              fondest.push(c);
            } else if (regard === best) {
              fondest.push(c);
            }
          }
          if (fondest.length) pool = fondest;
        }
      }

      // Leg 3 — the freest. If everybody is busy, or everybody is free, it
      // decides nothing and the rotation does.
      const free = pool.filter((c) => !this._isBusy(c));
      if (free.length) pool = free;

      // Leg 4 — rotation. Never-called sorts first, so a new hire's first
      // order is their own.
      const chosen = pool.reduce((best, c) =>
        this._calledAt(c) < this._calledAt(best) ? c : best,
      );
      this._stampCalled(chosen);
      return { ok: true, chosen };
    }

    /** Is this candidate mid-something? */
    private _isBusy(who: Stuff): boolean {
      if (!MixinApi.isEngaged(who)) return false;
      return who.getEngagements().length > 0;
    }

    private _callKey(who: Stuff): string {
      return who.getIdentityPath() ?? who.stuffId;
    }

    private _calledAt(who: Stuff): number {
      return this._lastCalled.get(this._callKey(who)) ?? -Infinity;
    }

    private _stampCalled(who: Stuff): void {
      // ⭐ A monotonic ticket, not a clock: the rotation only ever needs an
      // ORDER, and a ticket cannot be confused by a paused world clock or
      // by two calls inside one game-second.
      this._lastCalled.set(this._callKey(who), ++this._callTicket);
    }
  };
}
