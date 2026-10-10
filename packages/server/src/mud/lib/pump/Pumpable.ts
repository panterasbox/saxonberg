/**
 * The **pump protocol** — *a thing a person works with their hands, a
 * spell at a time* — and the shape every fluid-at-depth host answers.
 *
 * ⭐⭐ **Declared SHAPES, not mixins** — the `Workable` category one
 * subsystem over (`lib/ground/Workable.ts`), and for its reason. `pump` is
 * the platform's verb; what it talks to is a furnace's bellows, a well's
 * handle or a wellhead's lift, and those three share no mixin. So the
 * kernel declares what it will say and what it expects back, and each
 * host answers. A controller narrows by shape; nothing here is composed.
 *
 * ## ⭐⭐⭐ Two families, and the ceiling belongs to the MECHANISM
 *
 * Fluid comes up from below in one of two ways, and they obey different
 * laws:
 *
 *  - **Bucket machines** *carry* the fluid up in a container — a bailer,
 *    a shadoof, a bucket chain, a noria. No seal, no pressure, **no
 *    ceiling at any depth**. Nothing in this file is about them: the
 *    bailer's `lift()` on a wellhead consults no pressure and never will.
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
import type { Container } from '../spatial/Container';
import type { Mml } from '../../api/mml';

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
   * would have flattened them — AC 10 pins those sentences.
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
 * ⭐⭐ **A fluid stands some way below my draw point, and can be raised
 * into it.** Answered by a well (its authored depth) and by a wellhead
 * (the hole's own depth and its sump).
 *
 * ⚠ It adds no field anywhere: every number it answers already lived on
 * its host. A tap is NOT one (there is nothing below a tap), and nor is a
 * conduit (it has a *duty* — a head and a capacity — and no draw slot).
 *
 * ⭐ Bucket and displacement machines both raise through
 * {@link LiftSource.liftInto}; only the displacement machine asks the
 * pressure first. That asymmetry IS the lesson, and it is why the ceiling
 * is computed by the pump and never by the source.
 */
export interface LiftSource {
  /** Metres from the draw point down to the standing fluid. */
  standingDepthM(): number;
  /** Template path of the Material standing below, or `null` (nothing). */
  standingMaterial(): Promise<string | null>;
  /** Litres standing below that a lift could take (`Infinity` = a body). */
  standingAvailableL(): Promise<number>;
  /** Litres the draw point could still receive before it is full. */
  receivableL(): number;
  /** Raise up to `litres` into the draw point. Returns litres moved. */
  liftInto(litres: number): Promise<number>;
  /** The place whose atmosphere presses on the draw point. */
  liftScope(): (Stuff & Container) | null;
}

/**
 * ⭐ **Something a pump is set IN** — a well, a wellhead, a conduit. Each
 * holds its pump as content and vetoes everything else; this is the one
 * read they share, so a pump can tell being SET from being CARRIED (a pump
 * in a crate is luggage).
 */
export interface PumpSource {
  /** The pump set in this source, or `null`. */
  pumpFitted(): Stuff | null;
}
