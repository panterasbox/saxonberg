/**
 * ⭐⭐ **The body of record** — the avatar that lasts.
 *
 * The concrete twin of the abstract family root
 * ([lib/character/Avatar](../../lib/character/Avatar)). It is what the
 * seed row's `class:` names, what `PlayerApi` registers, what
 * `holder_snapshots` holds, and what the estate escheats. Its two
 * siblings — `ShadeAvatar` and `SandboxAvatar` — are the same person in another
 * phase of play, and each borrows this one's identity without taking
 * its place.
 *
 * ⭐ Everything a player can DO lives on the abstract root, where all
 * three bodies inherit it identically. What is here is exactly the
 * pair of capabilities no other body has:
 *
 *   1. **it claims the registry slot** — `PlayerApi.registerAvatar`;
 *   2. **it drives the persistence spine** — restore-or-capture under
 *      its own identity path, plus the mortal-state backstop that
 *      makes *"a snapshot never hands back a body that cannot act"*
 *      unfalsifiable.
 *
 * ⚠⚠ **Narrow on the ABSTRACT, not on this class.** `instanceof` this
 * class excludes shades and circle bodies, which are the same person;
 * an identity-keyed read that misses them is wrong, not merely narrow.
 * Import `Avatar` from `lib/character/Avatar` for every check that
 * means *is this somebody's body*.
 *
 * ⚠ Deliberately NOT a rung. An intermediary class between the root
 * and this one would carry two members after the identity work —
 * `shouldPersist` and `startAutoSave` — and the two vessels are about
 * to disagree about the first (the sandbox-overlay build deletes
 * `SandboxAvatar`'s and keeps `ShadeAvatar`'s). A rung holding a boolean its
 * subclasses flip is an enum wearing a class, which is the `Movable`
 * mistake in a new costume.
 */

import Avatar, { type AvatarInitContext } from '../../lib/character/Avatar';
import { TemplatePaths } from '../../lib/paths';
import { PlayerApi } from '../../api/player';
import { PersistableApi } from '../../api/persistable';
import { RecordApi } from '../../api/record';

export default class PrimaryAvatar extends Avatar {
  /**
   * ⭐ The ONE authored row every played body is cloned from.
   *
   * It mirrors this class, as its two siblings' rows mirror theirs
   * (`/platform/agent/ShadeAvatar`,
   * `/platform/agent/sandbox/SandboxAvatar`).
   *
   * ⚠⚠ It lived at `/platform/agent/Avatar/seed` until 2026-10-01, and
   * both halves of that were fossils of a mechanism that no longer
   * exists. Back when a signup FORKED this row into a per-player row at
   * `/platform/agent/Avatar/<playerId>`, the namespace held rows and
   * `seed` was a reserved fake playerId guarding against colliding with
   * a real one. Writebacks are `holder_snapshots` now (the generalized
   * persistence spine), nothing forks anything, and
   * `/platform/agent/Avatar/` holds **no rows at all** — it is purely
   * the identity namespace. So the row was parked inside a namespace of
   * identities, wearing a fake id to avoid colliding with rows that
   * cannot exist.
   *
   * ⭐ The identity prefix itself is unchanged and stays
   * `/platform/agent/Avatar/<playerId>`: class is lineage, identity
   * path is identity, and the namespace is named for the FAMILY.
   */
  static readonly ROW_TEMPLATE_PATH = TemplatePaths.primaryAvatar;

  /**
   * Post-registration for **the body of record** — the only body that
   * claims the player's registry slot and the only one that writes a
   * snapshot. Both of those are capabilities of this one class, not a
   * rung in the hierarchy: there is no second body that registers, and
   * nothing to share them with.
   *
   * Stamps runtime-only references (user, playerId) from the
   * caller-supplied context, registers with PlayerApi so later lookups
   * by playerId resolve to this instance, and installs the v1
   * default-issuance loadout (currently just the AetherImplant in the
   * cranial slot) — before the spine on a first mint, after
   * materialize on a returning one.
   *
   * Default loadout install lives here — at clone time, alongside
   * the rest of the instance wiring — rather than in `Avatar.enter`
   * (which is session-start ceremony, not setup). When char-gen
   * ships, the loadout install moves there with the rest of
   * character creation.
   */
  public override async onCreate(
    context?: AvatarInitContext,
  ): Promise<void> {
    this.stampContext(context);

    // ⭐ The registry slot is CLAIMED HERE and nowhere else, because
    // this is the only body that holds it. A shade is registered later
    // by the death choreography, deliberately after the drained body
    // has been unregistered; a circle body never registers at all,
    // because the PARKED body of record keeps the slot for the whole
    // crossing. Neither needs to say no to anything — they simply do
    // not inherit the claim.
    //
    // Guests have no playerId and are not registered — they're
    // throwaway and looked up by nothing. (A guest's reserved-word name
    // comes from its transient template data, set by the Hydrator.)
    if (this.playerId) {
      PlayerApi.registerAvatar(this);
    }

    // Born-with loadout BEFORE the spine only on a FIRST mint. A returning
    // avatar's snapshot carries its worn gear (incl. the cranial implant),
    // and the spine restore below re-occupies the slots — installing the
    // default first would collide (`Slotted.occupy: slot 'cranial' is
    // full`) and brick every relog-after-restart. The returning path runs
    // the loadout AFTER materialize instead (below): the cranial guard
    // sees the restored implant and skips the hardware, while the
    // session-scoped aether apps (comms / forums / the credential wallet)
    // are re-provisioned onto it — they are deliberately not in the
    // snapshot.
    const spineKey = this.shouldPersist() ? this.getIdentityPath() : null;
    const hasSnapshot = spineKey
      ? await PersistableApi.hasRecord(spineKey, spineKey)
      : false;
    if (!hasSnapshot) {
      await this.installDefaultLoadout();
    }

    // Preserve the `onCreate` chain (the spine no longer auto-drives
    // here — D1). ⭐ Through the named seam, not `super.onCreate`:
    // the abstract root's own sequence is the VESSEL one (floor, chain,
    // calendar) and would install the floor a second time, before
    // materialize, which is the slot collision that bricks a relog.
    await this.chainOnCreate(context);

    // Drive the persistence spine LAST, after the born-with loadout is in
    // place, with an EXPLICIT key (D1). The key is this avatar's own
    // templatePath (`/platform/agent/Avatar/<playerId>`) — the self-owned singleton
    // owner, byte-identical to the pre-D1 scope-derived owner, so the record
    // `owner` column and the account-deletion cascade
    // (`deleteAllFor('/platform/agent/Avatar/<pid>')`) are unchanged. A returning login
    // materializes (restoring fields + carried inventory + worn gear + spawn
    // location, overriding the clone-time template defaults); a fresh signup
    // captures the first record. A guest's `shouldPersist()` is false, so
    // this is a no-op for guests.
    if (spineKey) {
      if (hasSnapshot) {
        await PersistableApi.materialize(this, spineKey);
        // A snapshot may never hand back a body that cannot act again.
        // Runs BEFORE the loadout re-provision below, which reads restored
        // gear and must not race the heal.
        await this.reconcileMortalState(spineKey);
        // Re-provision the session-scoped born-with floor on top of the
        // restored gear. Idempotent: the restored implant keeps the
        // cranial slot (the loadout's occupancy guard skips the
        // hardware); only the hosted aether apps re-clone, restoring the
        // comms / forums / credential-wallet surfaces a snapshot never
        // carries.
        await this.installDefaultLoadout();
      } else {
        await PersistableApi.capture(this, spineKey);
      }
    }

    // ⭐ Re-arm the personal-calendar ping (D12): schedules are never
    // persisted, so a returning body re-books its next reminder from the
    // restored entries. An entry that came due while offline pings once
    // here (deferred-not-skipped). No-op for a fresh body with no entries.
    this.rescheduleCalendarPing();
  }

  /**
   * The terminal backstop that makes "a snapshot never hands back an
   * unusable body" unfalsifiable.
   *
   * A body whose snapshot carries `lifecycleState: 'dead'` cannot act:
   * `requiresAnimate` refuses `say`, `go`, `get` — forever, on every
   * subsequent login, because the dead state is itself persisted. That was
   * a live defect. Nothing in this build writes that state to a player
   * snapshot any more (the death choreography drains the body first and
   * records the arc on the identity instead), so reaching this method at
   * all means a record predates the fix or something upstream regressed.
   * Either way the only honest exit is to heal it — and to heal the
   * *record*, not just the instance, so the next login is clean too.
   *
   * Deliberately kept forever rather than deleted once the arc ships: it
   * costs one field read on a live path and it is what makes the invariant
   * hold against code that hasn't been written yet.
   */
  private async reconcileMortalState(spineKey: string): Promise<void> {
    if (this.getLifecycleState() !== "dead") return;

    console.warn(
      `Avatar.reconcileMortalState: healing a snapshot that restored ` +
        `${this.getPresentation()} (${spineKey}) as dead — a player body ` +
        `must never persist a dead lifecycle.`,
    );

    this.setLifecycleState("alive");
    this.setCauseOfDeath(null);
    this.resetVitalsToSpeciesBaseline();
    for (const condition of [...this.getConditions()]) {
      this.relieve(condition);
    }

    await this.recordDeed({
      template: "{{ who | name }} returned to the world.",
      vars: { who: this },
      tags: ["death", "recovery"],
    });

    await PersistableApi.capture(this, spineKey);
  }

  /**
   * Persistence opt-out (the spine's `shouldPersist` hook). A guest is
   * throwaway and persists nothing — the single point (alongside the
   * `save()` guard) that makes "zero guest persistence" hold across
   * materialize / capture / autosave / onDestruct.
   *
   * Chains to `super` so `PersistableMixin.markForRevert()` is real for an
   * Avatar. Without the chain the revert flag is dead here, and the death
   * choreography — which drains the body and marks it for revert *before*
   * destructing it — would let the capture-on-destruct backstop write the
   * drained body back over a good snapshot.
   */
  public override shouldPersist(): boolean {
    return !this.isGuest && super.shouldPersist();
  }

}
