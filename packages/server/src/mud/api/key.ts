/**
 * KeyApi — the callable surface for the lock/key substrate: mint a keyway,
 * issue a key to a holder, and (the load-bearing one) ask **synchronously**
 * whether a mover presents a key that opens a lock.
 *
 * A key comes in two forms, one credential: a **physical** `Key` Thing in the
 * holder's inventory (the durable form — it persists with them) and an entry in
 * their **implant keychain** (the born-with wallet — a within-session
 * convenience). Both are `CredentialWallet`s carrying a {@link KeyCredential},
 * so the door's check finds either through one reachable-wallet scan. Issuance
 * is a mechanism gated by its callers (the provisioning verbs are authorized);
 * it is not itself a player-facing surface.
 *
 * Bearer + re-key: possession is access; a lock is revoked by minting a fresh
 * keyway (the old key silently stops matching), not by a per-key ledger.
 */

import { randomUUID } from "crypto";
import { SecurityApi } from "./security";
import { StuffApi } from "./stuff";
import { ContainmentApi } from "./containment";
import { MixinApi } from "./mixin";
import { TemplatePaths } from "../lib/paths";
import { Lock, type LockType } from "../lib/lock/Lock";
import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";
import type { Containable } from "../lib/spatial/Containable";
import type { CredentialWallet } from "../lib/credential/CredentialWallet";

export class KeyApi {
  /** Mint a fresh, opaque keyway token (a re-key is a new keyway). */
  static mintKeyway(): string {
    return `kw-${randomUUID()}`;
  }

  /**
   * Whether `mover` presents a key that opens `lock` — a **synchronous**
   * reachable-wallet scan (implant keychain first, then a carried physical
   * `Key`), so it is safe from a door's `canTraverse`. No matching key (or an
   * unkeyed lock with an empty keyway) → false.
   */
  static presents(mover: Stuff, lock: Lock): boolean {
    if (!lock.keyway) return false;
    const holder = ContainmentApi.findReachable(
      mover,
      null,
      (s: Stuff): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) &&
        !!s.getCredential("key")?.authorize(lock.keyway, lock.technology),
    );
    return holder !== null;
  }

  /**
   * Issue a bearer key for `keyway`+`technology` to `holder`: an entry in their
   * implant keychain (if they have one) AND a physical `Key` Thing in their
   * inventory. Either opens the lock; the physical key is the durable form.
   */
  static async issueTo(
    holder: Stuff,
    keyway: string,
    technology: LockType,
  ): Promise<void> {
    KeyApi.addToKeychain(holder, keyway, technology, false);
    await KeyApi.mintPhysical(holder, keyway, technology, false);
  }

  /**
   * Issue a **master** key for a whole lock technology (a super's ring) to
   * `holder` — keychain master (if any) + a physical master `Key`. Opens every
   * lock of that technology.
   */
  static async issueMasterTo(
    holder: Stuff,
    technology: LockType,
  ): Promise<void> {
    KeyApi.addToKeychain(holder, "", technology, true);
    await KeyApi.mintPhysical(holder, "", technology, true);
  }

  /** Add an entry to the holder's implant keychain (the first reachable wallet
   *  — the implant, before any physical key exists). No-op if they have none
   *  (e.g. an NPC without an implant — the physical key carries their access). */
  private static addToKeychain(
    holder: Stuff,
    keyway: string,
    technology: LockType,
    master: boolean,
  ): void {
    const wallet = ContainmentApi.findReachable(
      holder,
      null,
      (s: Stuff): s is Stuff & CredentialWallet =>
        MixinApi.isCredentialWallet(s) && s.hasCredential("key"),
    );
    if (!wallet) return;
    const cred = wallet.ensureCredential("key");
    if (master) cred.addMaster(technology);
    else cred.addKey(keyway, technology);
  }

  /** Clone a physical `Key` Thing carrying the entry into the holder's
   *  inventory, its prose set from the technology. */
  private static async mintPhysical(
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
}

SecurityApi.decorateApiClass(KeyApi);
