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

/**
 * The lock technologies. A key of one technology can't work another's lock.
 *
 * ⚠⚠ **CLOSED to packs, and that is a known cost rather than an
 * oversight.** The technology IS the epoch axis — pin-tumbler, keycard,
 * and whatever a ward or a retina-reader is — so lens 5 wants it open,
 * and `CLAUDE.md`'s pack doctrine says *a pack must never need a kernel
 * list edit*. The lock build opened it on the `AnyMixinName` precedent
 * (`MixinName | (string & {})`) and **reverted at the pre-merge sweep.**
 *
 * ⭐ The reason is the precedent's own condition, which that change did
 * not meet: *"when the type system cannot see packs, **the gate owns the
 * namespace**."* `AnyMixinName` gave up the compiler's typo check and
 * handed it to `pnpm lint:mixin-names`, which reads every `_mixinName`
 * on disk. **Nothing owns the lock-technology namespace**, and a typo'd
 * `lockTechnology:` in a content row does not fail — `authorize` simply
 * never matches, so the door opens for **nobody**, silently. That is
 * this project's signature failure mode, and a closed union is the
 * cheaper of the two frictions.
 *
 * ⭐ Note the other half of the pair is already open:
 * `KeyCredential.addKey`/`authorize` take `technology: string`, so
 * widening this is a one-line change **once a gate exists** to read
 * every authored and pack-declared technology. See
 * `docs/slates/tails/lock-slate.md § 4`.
 */
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

  /**
   * Mint a fresh, opaque keyway token (a re-key is simply a new keyway).
   *
   * @internal the callable door is `BoundaryApi.mintKeyway`. ⭐ The line:
   * MINTING is an act on the world (it reaches `SecurityApi.uuid`), so it
   * belongs to the Api; ISSUING is the lock answering about itself, so
   * `issueKeyTo` / `opensFor` stay instance methods here.
   */
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
   * Issue a bearer key for **this lock** to `holder`: an entry in their
   * implant keychain (if they have one) AND a physical `Key` Thing in
   * their inventory. Either opens the lock; the physical key is the
   * durable form.
   *
   * ⭐ The symmetric twin of {@link opensFor}. The lock owns the keyway
   * and the technology, so it is the object that can hand one out — a
   * static taking `(holder, keyway, technology)` was asking the caller to
   * carry this object's own two fields around as loose arguments.
   *
   * ⚠ Ungated by design: issuers span kernel + pack controllers (title,
   * lease, dorm provisioning), a set no kernel gate can enumerate.
   */
  async issueKeyTo(holder: Stuff): Promise<void> {
    addToKeychain(holder, this.keyway, this.technology, false);
    await mintPhysical(holder, this.keyway, this.technology, false);
  }

  /**
   * Issue a **master** key for this lock's whole technology (a super's
   * ring) to `holder` — keychain master (if any) + a physical master
   * `Key`. Opens every lock of that technology, so the keyway is ignored.
   *
   * ⛔⛔ **NOTHING IN PRODUCTION CALLS THIS, and that is a recorded hold
   * rather than dead code.** Its only caller is
   * `DormWarren.test.ts:390`, so the dorm design plainly intends master
   * keys; nothing wires them. ⭐ This is the reachability failure class
   * MR !345 was built to close, surviving in the **method** surface,
   * where `lint:reachability` does not look — that gate reads command
   * views and `thing` rows.
   *
   * **Why it is not wired.** A master key is a *property-role*
   * capability — a landlord, a warden, a superintendent — and no such
   * role exists. `OFFICE_APPARATUS` holds five constituted offices of
   * the realm and none of them is a building superintendent.
   *
   * ⚠⚠ **And parcel title is NOT the landlord.** The tempting shortcut
   * is `ParcelApi.ownerOf` / `AccessApi.can`, since a holding sits on a
   * parcel. Do not: parcel title is *who maintains the code*, not who
   * owns the land in the fiction — two unconnected axes, conflated
   * twice already. A master key is a fiction-side property right and
   * needs a fiction-side holder.
   *
   * ⭐ What lifts it: a warden seat from the holding/residence design,
   * or a constable with a warrant from `policing-slate` — and the second
   * is the better answer, because absolute exclusion with no
   * counter-power is the participation gap too. See
   * `docs/slates/tails/lock-slate.md § 1`.
   */
  async issueMasterKeyTo(holder: Stuff): Promise<void> {
    addToKeychain(holder, '', this.technology, true);
    await mintPhysical(holder, '', this.technology, true);
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
  const named = key as unknown as {
    setShortDescription(s: string): void;
    setKeywords(k: string[]): void;
  };
  named.setShortDescription(Lock.keyDescription(technology, master));
  // ⚠ Authored keywords. A minted key has no content row to write them
  // in, and the pool stopped deriving them from the prose — without this
  // `look key` would not resolve the key you were just handed.
  named.setKeywords(
    technology === "keycard"
      ? ["keycard", "card", ...(master ? ["master"] : [])]
      : ["key", ...(master ? ["keys", "ring", "master"] : ["brass"])],
  );
  ContainmentApi.move(
    key as unknown as Stuff & Containable,
    holder as Stuff & Container,
  );
}
