/**
 * The **pump protocol** — *a thing a person works with their hands, a
 * spell at a time* — and the shape every fluid-at-depth host answers.
 *
 * ⭐⭐ **Protocol mixins** (`_mixinKind = 'protocol'`, controllers-are-io
 * D8a). `pump` is the platform's verb; what it talks to is a furnace's
 * bellows, a well's handle or a diver's air pump, and those share no other
 * mixin. They shipped as bare SHAPES a controller narrowed by `typeof`;
 * the protocol earned a mixin when it had three implementers in three
 * places, so each host now COMPOSES {@link PumpableMixin} and the verb asks
 * `MixinApi.isPumpable`. The two source shapes beside it are their own
 * protocol mixins — {@link LiftSource} (`./LiftSource`) and
 * {@link PumpSource} (`./PumpSource`).
 *
 * ## ⭐⭐⭐ Two families, and the ceiling belongs to the MECHANISM
 *
 * Fluid comes up from below in one of two ways, and they obey different
 * laws:
 *
 *  - **Bucket machines** *carry* the fluid up in a container — a bailer,
 *    a shadoof, a bucket chain, a noria. No seal, no pressure, **no
 *    ceiling at any depth**. `bail` is the bucket over any
 *    {@link LiftSource} and consults no pressure.
 *  - **Displacement machines** *push* the fluid through a pipe — a
 *    suction pump, a force pump, a furnace's bellows. They have a seal,
 *    and **only the ones that PULL have the wall**: the atmosphere can push
 *    a column of water up a pipe only so far (≈ 10.3 m at sea level), and a
 *    pump that relies on it can do no better.
 *
 * So the wall is not a property of pumps; it is a property of pumps that
 * pull. Put the ceiling on the machine and the first authored noria
 * inherits a 10 m cap that is physically false — the lesson stops being a
 * law and becomes a lie. A pump row names its **mechanism** and the law
 * follows from that (`platform/idea/PumpMechanism`).
 *
 * ## ⭐ Two phases, because the act takes game time
 *
 * The `Workable` shape exactly: {@link Pumpable.planPump} answers a plan or
 * a refusal with no side effects; {@link Pumpable.completePump} is called
 * once, at completion, with the plan's own `token`. A plan whose
 * `durationMs` is `0` is an **instant** act — the bellows' toggle — and the
 * verb completes it at once with no engagement.
 *
 * See [docs/subsystems/pump.md].
 */

import type { Stuff } from '../stuff/Stuff';
import { Mml } from '../../api/mml';
import type { MixinConstructor } from '../mixin';

/** What one spell at the handle will be, if it happens. No side effects. */
export interface PumpPlan {
  /** Discriminates a plan from a {@link PumpRefusal}. */
  kind: 'plan';
  /**
   * Game-ms the spell occupies the hands. `0` is an instant act (the
   * bellows): completed at once, no engagement.
   */
  durationMs: number;
  /**
   * ⭐ Metabolic watts the spell costs the body — the exertion substrate's
   * own unit, paid at completion. Derived from the work the pump does
   * (`ρ·g·h·Q`), never authored.
   */
  effortW: number;
  /**
   * What the actor reads as the spell starts; `null` for an instant act.
   *
   * ⚠ `Mml`, not a markup string as `Workable` carries: the bellows'
   * shipped scenes bind the actor and the furnace PER VIEWER, and a string
   * would have flattened them — the pump build's AC 10 pins those sentences.
   */
  beginSelf: Mml | null;
  /** What the room sees as it starts, or `null`. */
  beginPeers?: Mml | null;
  /**
   * The host's own bookkeeping, handed back at completion. ⚠ The
   * controller never reads it.
   */
  token: unknown;
}

/** Why not, in the host's own words plus a reason a note can carry. */
export interface PumpRefusal {
  /** Discriminates a refusal from a {@link PumpPlan}. */
  kind: 'refusal';
  /** The machine reason — the controller's `controller-rejected`. */
  reason: string;
  /** What the actor reads. ⭐ The host's sentence, never the verb's. */
  prose: Mml;
}

/**
 * A plan or a refusal, discriminated on `kind` — a literal discriminant,
 * not an exported `isPumpPlan()` (an exported free function in `lib/**` is
 * drift by definition).
 */
export type PumpPrognosis = PumpPlan | PumpRefusal;

/** What actually happened once the spell landed. */
export interface PumpResult {
  /** What the actor reads. */
  self: Mml;
  /** What the room sees, or `null`. */
  peers?: Mml | null;
  /** Litres the spell moved; `0` for the bellows. */
  litres: number;
}

/** The two halves every hand-worked pump shares. */
export interface Pumpable {
  /** What one spell would be, or why not. No side effects. */
  planPump(by: Stuff): Promise<PumpPrognosis>;
  /** Do it. Called once, at completion (or at once, for an instant act). */
  completePump(by: Stuff, token: unknown): Promise<PumpResult>;
}

/**
 * ⭐ **`PumpableMixin` — the pump protocol, as a mixin.**
 *
 * IS: something a person works with their hands a spell at a time and that
 * answers `pump` — a pump's handle (`PumpingMixin`), a furnace's bellows
 * (`BurnerMixin`), a diver's air pump. IS NOT: a source a pump is set in
 * (`PumpSourceMixin`), nor anything a bucket raises from
 * (`LiftSourceMixin`).
 *
 * ⚠ The defaults REFUSE: a host that composes this and answers nothing
 * says so in its own words (a lamp is a Burner for its flame, not its
 * bellows, and has always answered `no-bellows` — the honest "no" made
 * explicit). `completePump` is never reached without a plan.
 */
export function PumpableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PumpableMixin extends Base implements Pumpable {
    static _mixinName: string = 'PumpableMixin';
    static _mixinKind = 'protocol' as const;

    /** @hook Override to plan a spell; the default refuses. */
    public async planPump(_by: Stuff): Promise<PumpPrognosis> {
      return {
        kind: 'refusal',
        reason: 'not-pumpable',
        prose: Mml.compose`There is nothing on ${Mml.thing(this as unknown as Stuff)} to pump.`,
      };
    }

    /** @hook Override with the planned spell's landing. */
    public async completePump(_by: Stuff, _token: unknown): Promise<PumpResult> {
      throw new Error(
        `PumpableMixin.completePump: ${(this as unknown as Stuff).stuffId} planned no spell to land`,
      );
    }
  };
}
