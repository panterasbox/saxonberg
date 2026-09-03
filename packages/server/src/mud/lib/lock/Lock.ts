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
   * Issue a bearer key for `keyway`+`technology` to `holder`: an entry
   * in their implant keychain (if they have one) AND a physical `Key`
   * Thing in their inventory. Either opens the lock; the physical key
   * is the durable form. Ungated (parity with the retired Public
   * static): issuers span kernel + pack controllers (title, lease,
   * dorm provisioning), a set no kernel gate can enumerate.
   */
  static async issueKey(
    holder: Stuff,
    keyway: string,
    technology: LockType,
  ): Promise<void> {
    addToKeychain(holder, keyway, technology, false);
    await mintPhysical(holder, keyway, technology, false);
  }

  /**
   * Issue a **master** key for a whole lock technology (a super's ring)
   * to `holder` — keychain master (if any) + a physical master `Key`.
   * Opens every lock of that technology.
   */
  static async issueMasterKey(
    holder: Stuff,
    technology: LockType,
  ): Promise<void> {
    addToKeychain(holder, "", technology, true);
    await mintPhysical(holder, "", technology, true);
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

/** Add an entry to the holder's implant keychain (the first reachable wallet
 *  — the implant, before any physical key exists). No-op if they have none
 *  (e.g. an NPC without an implant — the physical key carries their access). */
function addToKeychain(
  holder: Stuff,
  keyway: string,
  technology: LockType,
  master: boolean,
): void {
  const wallet =
    MqlApi.resolveMany("person", {
      // Key holders are Characters (CommandGivers); the static type
      // at this seam is only `Stuff`.
      commandGiver: holder as Stuff & CommandGiver,
      scope: "person",
    }).stuff.find(
      (s): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) && s.hasCredential("key"),
    ) ?? null;
  if (!wallet) return;
  const cred = wallet.ensureCredential("key");
  if (master) cred.addMaster(technology);
  else cred.addKey(keyway, technology);
}

/** Clone a physical `Key` Thing carrying the entry into the holder's
 *  inventory, its prose set from the technology. */
async function mintPhysical(
  holder: Stuff,
  keyway: string,
  technology: LockType,
  master: boolean,
): Promise<void> {
  if (!MixinApi.isContainer(holder)) return;
  const key = await StuffApi.clone<Stuff & CredentialWallet>(
    TemplatePaths.key,
  );
  const cred = key.ensureCredential("key");
  if (master) cred.addMaster(technology);
  else cred.addKey(keyway, technology);
  (
    key as unknown as { setShortDescription(s: string): void }
  ).setShortDescription(Lock.keyDescription(technology, master));
  ContainmentApi.move(
    key as unknown as Stuff & Containable,
    holder as Stuff & Container,
  );
}
