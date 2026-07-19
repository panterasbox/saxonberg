/**
 * Lock — the value-object a lockable thing (a door) carries, plus the lock
 * **technology** vocabulary.
 *
 * A lock is `{ keyway, technology }`: an opaque **keyway** token (the lock's
 * identity — re-keying mints a fresh one so old keys silently stop matching)
 * and a **technology** (a brass pin-tumbler won't accept a plastic keycard, and
 * vice-versa). A `KeyCredential` opens a lock iff it holds a bearer entry
 * matching BOTH the keyway and the technology — or a master for the technology.
 * The match itself lives on the credential ({@link KeyCredential.authorize});
 * this module owns the vocabulary + the lock value-object + the (pure) keyway
 * mint and the key's presentation prose.
 *
 * Not a `Stuff` — a plain value-object. `CredentialApi` is the callable
 * surface for keys (issue a key, ask whether a mover presents one); minting a
 * fresh keyway (a lock *identity*, not a credential) lives here on `Lock`.
 */

import { SecurityApi } from "../../api/security";

/** The lock technologies. A key of one technology can't work another's lock. */
export type LockType = "pin-tumbler" | "keycard";

/** Validation array companion to {@link LockType}. */
export const LOCK_TYPES: readonly LockType[] = ["pin-tumbler", "keycard"];

export class Lock {
  constructor(
    /** The lock's identity — a fresh token is a re-key. */
    readonly keyway: string,
    /** The lock technology a key must match. */
    readonly technology: LockType,
  ) {}

  /** Mint a fresh, opaque keyway token (a re-key is simply a new keyway). */
  static mintKeyway(): string {
    return `kw-${SecurityApi.uuid()}`;
  }

  /**
   * Prose for a **physical** key that turns locks of `technology` — set on the
   * `Key` Thing's short description at issuance (a master reads a touch heavier).
   */
  static keyDescription(technology: LockType, master = false): string {
    switch (technology) {
      case "pin-tumbler":
        return master ? "a heavy ring of master keys" : "a worn brass key";
      case "keycard":
        return master ? "a black master keycard" : "a plastic keycard";
    }
  }
}
