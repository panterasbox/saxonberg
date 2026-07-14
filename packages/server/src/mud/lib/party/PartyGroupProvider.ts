/**
 * PartyGroupProvider — the fourth {@link GroupProvider}, resolving
 * `party:<id>` refs against a party's **own** roster (the managed / MQL /
 * contacts providers are the other three). This is how party chat and the
 * grouping facade read party membership without the party ever minting a
 * managed `Group`: a `party:<id>` `GroupRef` flows through `GroupApi`
 * exactly like `managed:<id>`, but the members come from the `Party`
 * Document, not a `groups` row.
 *
 * The provider is a thin adapter: it looks a party up in the in-memory
 * registry (a structural `PartyLookup`, so this `lib/` module never
 * imports the `obj/` registry) and materializes each `playerId` member to
 * its online Avatar (the `ManagedGroupProvider` shape). Mercenary members
 * (templatePath ids) are roster entries, not chat recipients, so they are
 * skipped in the member materialization.
 */

import type { Stuff } from "../stuff/Stuff";
import type {
  GroupProvider,
  GroupChangeHandle,
  GroupChangeListener,
} from "../social/GroupProvider";
import type { GroupRole } from "../social/Group";
import { PlayerApi } from "../../api/player";
import type { Party } from "./Party";

/** The minimal party-lookup the provider needs (the registry satisfies it
 * structurally — no `obj/` import from this `lib/` module). */
export interface PartyLookup {
  get(id: string): Party | null;
}

export class PartyGroupProvider implements GroupProvider {
  readonly source = "party";
  private readonly lookup: PartyLookup;
  private readonly listeners = new Map<string, Set<GroupChangeListener>>();

  constructor(lookup: PartyLookup) {
    this.lookup = lookup;
  }

  async members(id: string): Promise<Stuff[]> {
    const party = this.lookup.get(id);
    if (!party) return [];
    const out: Stuff[] = [];
    for (const memberId of party.getMemberIds()) {
      // Only player members (playerId-shaped) are chat recipients; a
      // Mercenary's templatePath-shaped id is a roster entry, not a
      // messageable Avatar.
      if (memberId.startsWith("/")) continue;
      const avatar = PlayerApi.findAvatarByPlayerId(memberId);
      if (avatar) out.push(avatar as Stuff);
    }
    return out;
  }

  async roleOf(playerId: string, id: string): Promise<GroupRole | null> {
    const party = this.lookup.get(id);
    if (!party || !party.isMember(playerId)) return null;
    return party.isCaptain(playerId) ? "owner" : "member";
  }

  async isMember(playerId: string, id: string): Promise<boolean> {
    return this.lookup.get(id)?.isMember(playerId) ?? false;
  }

  onChange(id: string, cb: GroupChangeListener): GroupChangeHandle {
    let set = this.listeners.get(id);
    if (!set) {
      set = new Set();
      this.listeners.set(id, set);
    }
    set.add(cb);
    return {
      cancel: () => {
        this.listeners.get(id)?.delete(cb);
      },
    };
  }

  /** Notify subscribers that party `id`'s membership changed (called by
   * `PartyLogic` after a roster mutation — the `ManagedGroupProvider`
   * `fireChange` precedent). */
  fireChange(id: string): void {
    const set = this.listeners.get(id);
    if (!set) return;
    for (const cb of [...set]) {
      try {
        cb();
      } catch {
        /* a listener throw never breaks the mutation */
      }
    }
  }
}
