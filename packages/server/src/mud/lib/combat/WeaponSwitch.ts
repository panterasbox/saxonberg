/**
 * WeaponSwitch — a mid-fight armament change as a **vulnerable timed beat**
 * (value-object; the `Poise`/`Tempo` category).
 *
 * Changing weapons in a fight isn't a free menu-swap: for a few beats your
 * guard is down and you can't strike — an opponent who reads it gets a free
 * window. This models that window as a small deterministic countdown the
 * combat session drives on its beat: while a switch is live the combatant's
 * instrument resolves to *nothing* (no strike, no parry), and when it
 * completes the session performs the actual grip swap.
 *
 * Two speeds share the model: a deliberate **switch** (`fight switch`) takes
 * the full window; a **sidearm draw** (`fight draw`) is fast — the answer to
 * a disarm, turning it into a tempo setback rather than a fight-ender.
 *
 * It is deliberately **NOT** a scheduler `DurativeActivity` (the `Coup`
 * pattern) even though it is the same shape: a combat participant already
 * holds the whole `body` engagement slot for the duration of the fight, so a
 * second `body`-claiming activity would conflict. Driving the countdown on
 * the session's own beat keeps it deterministic (no wall-clock) and free of
 * that contention.
 */

import type { Stuff } from "../stuff/Stuff";

export class WeaponSwitch {
  private remaining: number;

  constructor(
    /** The weapon to bring into the grip when the switch completes (a live
     * ref the session re-checks), or null to end up bare-handed. */
    private readonly target: Stuff | null,
    /** Beats the switch takes — guard down, no instrument — the whole time.
     * A fast sidearm draw passes a small value; a deliberate switch a larger
     * one. */
    beats: number,
    /** Whether this is a fast sidearm draw (flavor / narration only). */
    private readonly fast = false,
    /**
     * ⭐ What lands when the beat completes, when it is not a grip swap
     * (size and carrying D-W10-5): a hand act in a fight — `put`, `get`,
     * `wield`, `unwield`, `remove`, `open`/`close` — is this guarded beat,
     * and its act runs at the beat's end. Absent: the swap to `target`.
     * Called with `abandoned` when the act never finishes (its body went
     * down as the fight ended): it runs nothing and lets go of what it held.
     */
    private readonly land?: (abandoned?: boolean) => void,
  ) {
    this.remaining = Math.max(1, Math.round(beats));
  }

  /** Advance one beat. */
  advance(): void {
    if (this.remaining > 0) this.remaining--;
  }

  /** Whether the switch has completed (the swap can be performed). */
  isReady(): boolean {
    return this.remaining <= 0;
  }

  /** Beats still to go (0 once ready). */
  getRemaining(): number {
    return this.remaining;
  }

  /** The weapon to wield on completion (or null = bare-handed). */
  getTarget(): Stuff | null {
    return this.target;
  }

  /** The hand act that lands at completion, if this beat is one (else the swap). */
  getLanding(): ((abandoned?: boolean) => void) | undefined {
    return this.land;
  }

  /** Whether this is a fast sidearm draw. */
  isFast(): boolean {
    return this.fast;
  }
}
