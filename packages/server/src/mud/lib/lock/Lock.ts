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
 * Not a `Stuff` — a plain value-object, and since the Api OO sweep the
 * one home for the key surface (the retired `CredentialApi`): the lock
 * answers `opensFor(mover)` (it owns its keyway), and the value class's
 * statics mint keys (`issueKey` / `issueMasterKey` — bearer entry in
 * the implant keychain plus a physical `Key` Thing). Minting a fresh
 * keyway (a lock *identity*, not a credential) lives here too.
 */

import { SecurityApi } from "../../api/security";
import { MqlApi } from "../../api/mql";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { ContainmentApi } from "../../api/containment";
import { TemplatePaths } from "../paths";
import type { Stuff } from "../stuff/Stuff";
import type { CommandGiver } from "../command/CommandGiver";
import type { Container } from "../spatial/Container";
import type { Containable } from "../spatial/Containable";
import type { CredentialWallet } from "../credential/CredentialWallet";

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
   * Whether `mover` presents a key that opens this lock — a
   * **synchronous** wallet scan over the MQL `person` pool (bearer
   * semantics: implant keychain first, then a carried physical `Key` —
   * never a key lying in the room), so it is safe from a door's
   * `canTraverse`. No matching key (or an empty keyway) → false.
   */
  opensFor(mover: Stuff): boolean {
    if (!this.keyway) return false;
    const holder =
      MqlApi.resolveMany("person", {
        // The mover at a lock is a Character (a CommandGiver); the
        // static type at this seam is only `Stuff`.
        commandGiver: mover as Stuff & CommandGiver,
        scope: "person",
      }).stuff.find(
        (s): s is Stuff & CredentialWallet =>
          MixinApi.isCredentialWallet(s) &&
          !!s.getCredential("key")?.authorize(this.keyway, this.technology),
      ) ?? null;
    return holder !== null;
  }



  /**
   * Prose for a **physical** key that turns locks of `technology` — set on the
   * `Key` Thing's short description at issuance (a master reads a touch heavier).
   */
  static keyDescription(technology: LockType, master = false): string {
    switch (technology) {
      case "pin-tumbler":
        return master ? "heavy ring of master keys" : "worn brass key";
      case "keycard":
        return master ? "black master keycard" : "plastic keycard";
    }
  }
}


