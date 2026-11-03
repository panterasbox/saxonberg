/**
 * HirableMixin — ⭐ **a thing let by the day** (harbors P18): a canoe at
 * the outfitter's put-in, a rowboat at a boat shed. `rent <boat> for <n>
 * days` pays the house `n × rate` up front and puts her in the hirer's
 * CUSTODY — never her title: whose she is stays the house's, and the hire
 * says only who has her and until when.
 *
 * - **`hireTo(who, untilS, home, letter)`** records the hire — who has her,
 *   the world second she is due back, the landing she is let from, and the
 *   hire book that let her. ⭐ It is the ONLY record of the hire (harbors
 *   review 2): the hire book keeps no copy, and reads which of its boats are
 *   out past their day off the boats themselves (`hiredFrom`). Gated to
 *   `rent`.
 * - **The hire ends when she is home** (`endHire`): put down on the landing
 *   she was let from, by whatever means — paddled in, carried round. The
 *   composer calls it from its own `onMoved`; there is no `return` verb.
 * - **Overdue is a fact, never a penalty.** `hiredUntilS` passing changes
 *   nothing on her; the hire book's page reads it off her and names her. What a polity does about
 *   an unreturned boat is the retail slate's (Deferred seams).
 *
 * ⛔ Not on `Good`: every torch would be rentable. A class composes this
 * when its kind is let by the day.
 */

import type { MixinConstructor, FieldMeta } from "../mixin";
import type { Stuff } from "../stuff/Stuff";
import { CallSecurity } from "../security/decorators";
import { SecurityPolicies } from "../security/SecurityPolicies";
import { SecurityApi } from "../../api/security";

/** One hire, as the thing let keeps it (persisted with her). */
export interface HireRecord {
  /** Minted at the hire. */
  id: string;
  /** The hirer's identity path. */
  by: string;
  /** The hirer's name, as the shed says it while they are away. */
  byName: string;
  /** The world second she is due back. */
  untilS: number;
  /** The landing she is let from — where putting her down ends the hire. */
  home: string;
  /** The hire book that let her (its identity path). */
  letter: string;
}

export interface Hirable {
  /** ⭐ Let her to `who` until `untilS`, from `home`, by the hire book `letter`. Gated to `rent`. */
  hireTo(who: Stuff, untilS: number, home: string, letter: string): HireRecord;
  /** Who has her on hire (an identity path), or `null`. */
  hiredBy(): string | null;
  /** The hirer's name as it was when she was let, or `null`. */
  hiredByName(): string | null;
  /** The world second she is due back, or `null` when she is not out. */
  hiredUntilS(): number | null;
  /** The landing she was let from, or `null` when she is not out. */
  home(): string | null;
  /** The hire book that let her (its identity path), or `null` when she is not out. */
  hiredFrom(): string | null;
  /** On hire now? */
  isHired(): boolean;
  /** ⭐ She is home: the hire is over (the one record of it, struck). */
  endHire(): void;
}

export function HirableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class HirableMixin extends Base implements Hirable {
    static _mixinName: string = "HirableMixin";

    static fieldMeta: FieldMeta = {
      hire: { persistent: true, runtimeState: true },
    };

    /** The hire she is on, or `null`. Plain field: the hydrator reflects into it. */
    public hire: HireRecord | null = null;

    @CallSecurity(SecurityPolicies.FromModule("/platform/idea/cmd/retail/RentController"))
    public hireTo(who: Stuff, untilS: number, home: string, letter: string): HireRecord {
      if (this.hire !== null) throw new Error("HirableMixin.hireTo: she is out on hire already");
      const by = who.getIdentityPath() ?? "";
      if (by === "") throw new Error("HirableMixin.hireTo: a hirer has an identity");
      if (!Number.isFinite(untilS)) throw new Error("HirableMixin.hireTo: a hire ends at a time");
      if (home === "" || letter === "") throw new Error("HirableMixin.hireTo: a hire is let from somewhere, by someone");
      this.hire = { id: SecurityApi.uuid(), by, byName: who.getPresentation(), untilS, home, letter };
      return { ...this.hire };
    }

    public hiredBy(): string | null {
      return this.hire?.by ?? null;
    }

    public hiredByName(): string | null {
      return this.hire?.byName ?? null;
    }

    public hiredUntilS(): number | null {
      return this.hire?.untilS ?? null;
    }

    public home(): string | null {
      return this.hire?.home ?? null;
    }

    public hiredFrom(): string | null {
      return this.hire?.letter ?? null;
    }

    public isHired(): boolean {
      return this.hire !== null;
    }

    public endHire(): void {
      // ⭐ The one record of the hire is hers: struck, the book's page no
      // longer finds her out (it reads the boats, it keeps no copy).
      this.hire = null;
    }
  }
  return HirableMixin;
}
