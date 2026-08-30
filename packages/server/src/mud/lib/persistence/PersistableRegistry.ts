/**
 * PersistableRegistry — the enrolled persistable hosts, so nothing has to
 * scan the world to find them.
 *
 * A host enrolls itself the moment it establishes a persistence key
 * ({@link Persistable.setPersistenceKey}) and withdraws on destruct. The
 * set is what the process-shutdown capture iterates: the world's
 * persistable singletons — venue rooms, stock counters — capture at
 * establish and at the residency sweep, and a stop between two sweeps
 * would lose everything consigned or placed since (the libations live
 * drive watched a dev restart empty the cash-and-carry counter).
 *
 * ⭐ Self-enrollment, not enumeration. The alternative shipped first and
 * was wrong twice over: it made `AppBootstrap.shutdown()` name a fourth
 * subsystem explicitly — the centre enumerating the periphery, against
 * the self-maintenance pattern every other lifecycle seam here uses
 * (`onDestruct` witness, `canDestruct` veto, residency self-eviction with
 * `canEvict`, `postRegister`) — and it found its subscribers with a
 * `getAllObjects()` scan when they could simply say so. The knowledge of
 * *who wants capturing at shutdown* belongs to the thing that owns
 * capture, not to the bootstrapper.
 *
 * ⚠ Deliberately NOT a general shutdown-signal mechanism. This registry
 * knows one thing: which hosts want a capture. A *signal* with ordered
 * phases that any subsystem may subscribe to — retiring
 * `AppBootstrap.shutdown()`'s hand-maintained sequence of
 * `CompileWatcher` / `WorldClockApi` / `RecordApi` / this, so the centre
 * stops naming the periphery at all — is a design of its own, with its
 * own questions (phase ordering, a handler that throws or hangs). It is
 * slated separately.
 *
 * ⚠ Membership is process-lifetime, not persisted: a hot reload of this
 * module empties it. That is acceptable because the set exists only to be
 * read at shutdown, and a reload is itself a restart of the thing that
 * would have read it.
 */

import type { Stuff } from "../stuff/Stuff";

export class PersistableRegistry {
  /**
   * Live hosts that want a capture before the process ends. Hard-private:
   * the only legitimate access is this class's own surface, and a static
   * on a non-instanced registry has no proxy receiver in play.
   */
  static #hosts = new Set<Stuff>();

  /** Enroll `host`; idempotent. */
  static enroll(host: Stuff): void {
    this.#hosts.add(host);
  }

  /** Withdraw `host`; a no-op when it never enrolled. */
  static withdraw(host: Stuff): void {
    this.#hosts.delete(host);
  }

  /** The enrolled hosts, destroyed ones filtered out. */
  static hosts(): Stuff[] {
    const out: Stuff[] = [];
    for (const h of this.#hosts) {
      if (h.isDestroyed()) {
        this.#hosts.delete(h);
        continue;
      }
      out.push(h);
    }
    return out;
  }

  /** Test seam — drop every enrollment. */
  static _clearForTesting(): void {
    this.#hosts.clear();
  }
}
