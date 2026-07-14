/**
 * PartyRegistry — the in-memory home of every **active** party (ad-hoc +
 * musters durable), and the seam that wires party membership into the
 * grouping facade.
 *
 * Two jobs, both at boot (`postRegister`, driven by the bootstrap
 * manifest — the `GroupRegistry`/`ChannelCatalogue` precedent):
 *
 *   1. **Warm** durable parties from the `parties` collection into the
 *      active map, so a named crew survives a restart and can `muster`.
 *   2. **Register** the {@link PartyGroupProvider} with the shared
 *      `GroupRegistry`, so `party:<id>` refs resolve through `GroupApi`
 *      like any other group source (the party owns its roster; the
 *      provider is a read adapter over it — no managed `Group` minted).
 *
 * The map is the **synchronous** read path combat needs: `PartyApi.sideOf`
 * resolves a combatant's `activePartyId` → the live `Party` here without
 * an async DB hit mid-beat. Methods are ungated: the registry is a dumb
 * cache (the security-meaningful party operations live on
 * `PartyApi`/`PartyLogic`; the `Party` Document owns its own invariants),
 * and the `PartyGroupProvider` is a legitimate second reader.
 */

import { Idea } from "../lib/stuff/Idea";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import type { VetoResult } from "../lib/errors";
import { GroupApi } from "../api/group";
import { Party } from "../lib/party/Party";
import {
  PartyGroupProvider,
  type PartyLookup,
} from "../lib/party/PartyGroupProvider";

const PartyRegistryBase = PostRegistrationMixin(Idea);

export default class PartyRegistry
  extends PartyRegistryBase
  implements PartyLookup
{
  private readonly activeParties = new Map<string, Party>();
  private groupProvider: PartyGroupProvider | null = null;

  public canEvict(): VetoResult {
    return { ok: false, reason: "system singleton; never culled" };
  }

  public canDestruct(): VetoResult {
    return { ok: false, reason: "PartyRegistry is a boot singleton" };
  }

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warmDurable();
    this.groupProvider = new PartyGroupProvider(this);
    const reg = await GroupApi.registry();
    reg.register(this.groupProvider);
  }

  /** Load durable parties into the active map (dormant-but-alive). */
  public async warmDurable(): Promise<void> {
    const durable = await Party.find<Party>({ durable: true });
    for (const p of durable) {
      if (p._id) this.activeParties.set(p._id, p);
    }
  }

  /* ───────────────── the sync read seam ───────────────── */

  public get(id: string): Party | null {
    return this.activeParties.get(id) ?? null;
  }

  public all(): readonly Party[] {
    return [...this.activeParties.values()];
  }

  /** Every active party whose roster lists `memberId` (the `party list`
   * read — a member sits on many parties' rosters). */
  public partiesWithMember(memberId: string): Party[] {
    return this.all().filter((p) => p.isMember(memberId));
  }

  /* ───────────────── mutations (PartyLogic-driven) ───────────────── */

  public add(party: Party): void {
    if (party._id) this.activeParties.set(party._id, party);
  }

  public remove(id: string): void {
    this.activeParties.delete(id);
  }

  /** The grouping provider (for `fireChange` after a roster mutation). */
  public provider(): PartyGroupProvider | null {
    return this.groupProvider;
  }
}
