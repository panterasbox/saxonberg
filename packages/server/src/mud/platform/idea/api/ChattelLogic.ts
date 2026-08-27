/**
 * @internal — the logic singleton behind `ChattelApi`. Registers at
 * `/platform/idea/api/chattel`; methods admit only the `ChattelApi` face. Extends
 * `ApiLogic`, so it is itself residency-exempt.
 *
 * Owns the ownership-resolution chain
 * (`stamp ?? parcel-extent ?? authorOf`) and the
 * glob-refusal invariant, delegating storage to the `ChattelRegistry`
 * singleton (reached via `StuffApi.findByTemplatePath`, memoized). Like
 * `ParcelLogic` it **pure-degrades** when the registry isn't live (no
 * registry → the author fallback still resolves; mutators no-op).
 *
 * Fungible stacks (`Globbable`) are structurally out of scope: a stack that
 * splits/merges has no stable per-instance id, so `stamp`/`transfer` refuse
 * a glob (a clear no-op, not a silent mint), and `ownerOf` of a glob is
 * null (owned-by-possession).
 */

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { ProvenanceApi } from "../../../api/provenance";
import { ParcelApi } from "../../../api/parcel";
import { PersistableApi } from "../../../api/persistable";
import { TemplatePaths } from "../../../lib/paths";
import {
  ESTATE_INVENTORY,
  ESTATE_STORAGE,
} from "../../../lib/persistence/PersistenceSlice";
import type { ChattelOwner } from "../../../lib/chattel/ChattelRecord";
import type { Chattel } from "../../../lib/chattel/Chattel";
import type { ChattelStampResult } from "../../../api/chattel";
import type ChattelRegistry from "../ChattelRegistry";
import type { Stuff } from "../../../lib/stuff/Stuff";

const REGISTRY_PATH = TemplatePaths.chattelRegistry;

const ChattelApiCallers = SecurityPolicies.FromModule("/api/chattel#ChattelApi");

const GLOB_REFUSAL =
  "fungible stacks are owned by possession, not stamped";

let registryRef: ChattelRegistry | null = null;
function lookupRegistry(): ChattelRegistry | null {
  if (registryRef) return registryRef;
  const reg = StuffApi.findByTemplatePath<ChattelRegistry>(REGISTRY_PATH);
  if (reg) registryRef = reg;
  return reg ?? null;
}

@Unshadowable
export class ChattelLogic extends ApiLogic {
  /** See {@link ChattelApi.ownerOf}. */
  @CallSecurity(ChattelApiCallers)
  public async ownerOf(item: Stuff): Promise<ChattelOwner | null> {
    return this.resolveOwner(item);
  }

  /**
   * The resolution chain itself, **ungated**: an intra-singleton self-call
   * resolves to this Logic, which is outside the `ChattelApi` allowlist, so
   * a gated method calling a gated sibling is denied. `setPlace` needs the
   * owner, so the chain lives here and `ownerOf` is its gated face — the
   * `ChattelRegistry` ungated-privates pattern.
   */
  private async resolveOwner(item: Stuff): Promise<ChattelOwner | null> {
    // A glob is owned-by-possession — never stamped, so never resolved.
    if (MixinApi.isGlobbable(item)) return null;
    const reg = lookupRegistry();
    if (reg && MixinApi.isChattel(item)) {
      const id = (item as Stuff & Chattel).getChattelId();
      if (id) {
        const owner = reg.ownerOf(id);
        if (owner) return owner;
      }
    }
    const path = item.getTemplatePath();
    if (!path) return null;
    // Rung 2 — the parcel. An unstamped good whose template path falls
    // under a parcel's extent is titled to THAT PARCEL'S OWNER: a landlord
    // owns the fixtures in a unit they let. Keyed on the template path
    // rather than the item's location, which is what makes displacement
    // recoverable — a fixture carried out of the unit stays titled to the
    // parcel, so it is theft (custody without title), not a transfer.
    // Inserted ABOVE the author fallback, so every good outside any extent
    // resolves exactly as it did before this rung existed.
    //
    // `coveringParcelOf`, NOT `ParcelApi.ownerOf`: the latter also
    // answers the self-home rung, which a good in somebody's home must not
    // be retitled by. The covering lookup returns null when no parcel
    // covers the path, which is exactly the "outside any extent" case D5
    // requires to fall through unchanged.
    const covering = await ParcelApi.coveringParcelOf(path);
    const parcelOwner = covering?.getOwner() ?? null;
    if (parcelOwner) return parcelOwner;
    // Fallback: an unstamped content good resolves to its author (no
    // world-wide restamp). Pure-degrade also lands here when no registry.
    const authorPath = await ProvenanceApi.authorOf(path);
    return authorPath ? { kind: "player", templatePath: authorPath } : null;
  }

  /**
   * See {@link ChattelApi.setPlace}. **The single write path** for where an
   * owner keeps a good: it sets the good's own `_place` field (what
   * round-trips with the good) AND the `chattel` row's indexed `place`
   * (what lets a materializing room find what belongs in it) in one call.
   * Writing both here is the whole reason the index cannot drift.
   *
   * Also keeps the owner's **estate** current when the owner is live, so a
   * placement survives the owner's next capture without a store round-trip.
   */
  @CallSecurity(ChattelApiCallers)
  public async setPlace(item: Stuff, place: string): Promise<void> {
    return this.applyPlace(item, place);
  }

  /**
   * See {@link ChattelApi.followCustody}. Re-derive where the owner keeps a
   * good from where it now IS: in its owner's own hands it is `inventory`,
   * anywhere else it is the nearest persistence host's room identity.
   *
   * This is what makes D8 "no new verbs": `drop`/`put`/`get` move custody
   * through `ContainmentApi` exactly as they always have, then call this,
   * and title stays put throughout. Taking a good you do not hold title to
   * is theft — permitted and recoverable — so this deliberately does NOT
   * check who is acting; it only records where the thing ended up.
   */
  @CallSecurity(ChattelApiCallers)
  public async followCustody(item: Stuff): Promise<void> {
    if (MixinApi.isGlobbable(item) || !MixinApi.isChattel(item)) return;
    const good = item as Stuff & Chattel;
    if (!good.getChattelId()) return; // unstamped: nothing owns it
    const owner = await this.resolveOwner(item);
    if (owner?.kind !== "player") return;
    const host = this.nearestHost(item);
    if (!host) return; // transient space — leave the last placement alone
    const place =
      host.getTemplatePath() === owner.templatePath
        ? ESTATE_INVENTORY
        : PersistableApi.placeIdOf(host);
    await this.applyPlace(item, place);
  }

  /**
   * The three writes, ungated so a gated sibling can reach them (the
   * `ChattelRegistry` ungated-privates pattern): the good's own field, the
   * `chattel` row's by-room index, and a live owner's estate.
   */
  private async applyPlace(item: Stuff, place: string): Promise<void> {
    if (MixinApi.isGlobbable(item)) return; // a fungible stack has no place
    if (!MixinApi.isChattel(item)) return;
    const good = item as Stuff & Chattel;
    good._setPlace(place);
    const id = good.getChattelId();
    if (!id) return; // unstamped: nothing owns it, so nothing keeps it
    const reg = lookupRegistry();
    if (reg) await reg.setPlace(id, place);
    await this.syncEstate(good, place);
  }

  /**
   * The nearest persistence host at or outward of `item` — the thing whose
   * record a placement is expressed against. Hop-capped against a
   * containment cycle, the `captureHostOf` precedent.
   */
  private nearestHost(item: Stuff): Stuff | null {
    let cur: Stuff | null = item;
    for (let hops = 0; cur && hops < 32; hops++) {
      if (cur !== item && MixinApi.isPersistable(cur)) return cur;
      cur = MixinApi.isContainable(cur) ? cur.getContainer() : null;
    }
    return null;
  }

  /**
   * See {@link ChattelApi.evictToStorage}. Ending a lease forces every
   * owned good placed under `placePrefix` back to `storage` — **intact,
   * titled, recoverable** — before the shell reverts (D9).
   *
   * Never destructs: a good that is titled to somebody survives the end of
   * their tenancy, which is what makes "move house" re-placing from storage
   * rather than starting over. Returns how many were evicted.
   */
  @CallSecurity(ChattelApiCallers)
  public async evictToStorage(placePrefix: string): Promise<number> {
    const reg = lookupRegistry();
    if (!reg) return 0;
    const rows = await reg.placedUnder(placePrefix);
    for (const row of rows) {
      const id = row.getChattelId();
      await reg.setPlace(id, ESTATE_STORAGE);
      // Update the live good and its owner's estate too, when either is
      // loaded — otherwise the next capture would write the old placement
      // straight back over the eviction.
      const owner = row.getOwner();
      if (owner?.kind !== "player") continue;
      const host = StuffApi.findByTemplatePath<Stuff>(owner.templatePath);
      if (!host || !MixinApi.isEstate(host)) continue;
      const entry = host.getEstateEntry(id);
      const live = host.getEstateLive(id);
      if (live && MixinApi.isChattel(live)) live._setPlace(ESTATE_STORAGE);
      if (entry) {
        host._putEstateEntry({ ...entry, place: ESTATE_STORAGE }, null);
      }
    }
    return rows.length;
  }

  /** See {@link ChattelApi.placedIn}. */
  @CallSecurity(ChattelApiCallers)
  public async placedIn(
    place: string,
  ): Promise<Array<{ chattelId: string; owner: ChattelOwner | null }>> {
    const reg = lookupRegistry();
    if (!reg) return [];
    const rows = await reg.placedIn(place);
    return rows.map((r) => ({ chattelId: r.getChattelId(), owner: r.getOwner() }));
  }

  /**
   * Upsert the good into its owner's estate, when that owner is a live
   * player. The estate is the durable home of a good whose `place` is not
   * its owner's own container, so it has to learn about the placement at
   * the moment it happens — otherwise the owner's next capture would carry
   * a stale entry (or none at all) forward.
   *
   * Silent when the owner is offline: the good is still live in a room, and
   * the room's capture pass reports it to `PersistableLogic`, which flushes
   * it to the stored estate then.
   */
  private async syncEstate(good: Stuff & Chattel, place: string): Promise<void> {
    const owner = await this.resolveOwner(good as Stuff);
    if (owner?.kind !== "player") return;
    const host = StuffApi.findByTemplatePath<Stuff>(owner.templatePath);
    if (!host || !MixinApi.isEstate(host)) return;
    host._putEstateEntry(
      {
        chattelId: good.getChattelId(),
        templatePath: good.getTemplatePath() ?? "",
        state: PersistableApi.captureDetached(good as Stuff),
        place,
      },
      good as Stuff,
    );
  }

  /** See {@link ChattelApi.stamp}. */
  @CallSecurity(ChattelApiCallers)
  public async stamp(
    item: Stuff,
    owner: ChattelOwner,
  ): Promise<ChattelStampResult> {
    if (MixinApi.isGlobbable(item)) return { ok: false, reason: GLOB_REFUSAL };
    if (!MixinApi.isChattel(item)) {
      return { ok: false, reason: "not a chattel-bearing good" };
    }
    const reg = lookupRegistry();
    if (!reg) return { ok: false, reason: "no chattel registry" };
    const id = this.ensureId(item as Stuff & Chattel, reg);
    await reg.stamp(id, owner);
    return { ok: true, chattelId: id };
  }

  /** See {@link ChattelApi.transfer}. */
  @CallSecurity(ChattelApiCallers)
  public async transfer(
    item: Stuff,
    newOwner: ChattelOwner,
  ): Promise<ChattelStampResult> {
    if (MixinApi.isGlobbable(item)) return { ok: false, reason: GLOB_REFUSAL };
    if (!MixinApi.isChattel(item)) {
      return { ok: false, reason: "not a chattel-bearing good" };
    }
    const reg = lookupRegistry();
    if (!reg) return { ok: false, reason: "no chattel registry" };
    const id = this.ensureId(item as Stuff & Chattel, reg);
    await reg.transfer(id, newOwner);
    return { ok: true, chattelId: id };
  }

  /**
   * See {@link ChattelApi.release}.
   *
   * Releasing a title has **two** halves, and shipping only the first one
   * made destroyed goods come back. The registry half GCs the durable row
   * and the index entry. The estate half drops the owner's entry for that
   * good — and without it the owner's `_estate` map keeps an entry whose
   * good no longer exists, `Estate.captureSlice` finds it not-live and
   * carries it into the durable slice **verbatim**, and `restoreSlice`
   * re-mints it on next load. Because `_chattelId` is persistent, the
   * resurrected good even came back carrying the id of a title row that
   * had been deleted. Eat a carrot, log out, log back in, carrot's there.
   *
   * `Estate._dropEstateEntry` existed for exactly this and had **zero
   * callers** anywhere in the tree. This is the call it was waiting for.
   *
   * Order matters: read the owner off the index BEFORE `reg.release`
   * deletes it, or there is nothing left to attribute the drop to.
   */
  @CallSecurity(ChattelApiCallers)
  public async release(chattelId: string): Promise<void> {
    if (!chattelId) return;
    const reg = lookupRegistry();
    if (!reg) return;
    const owner = reg.ownerOf(chattelId);
    await reg.release(chattelId);
    this.dropFromOwnerEstate(owner, chattelId);
  }

  /**
   * Drop a released good from its owner's live estate.
   *
   * **Only reaches a LOADED owner**, and that is a real limit rather than
   * an oversight: an offline owner's estate lives in `holder_snapshots`,
   * not in memory, so there is no map here to edit. A good destroyed while
   * its owner is offline still resurrects on their next login.
   *
   * The obvious total fix — have `Estate.restoreSlice` skip any entry
   * whose title row is gone — was deliberately NOT taken here. It cannot
   * distinguish "no title, the good was released" from "the registry has
   * not rebuilt its index yet", and getting that wrong at restore time
   * deletes every possession a player owns. A duplicated carrot is a far
   * cheaper bug than an emptied inventory, so the backstop belongs in a
   * change that can prove the registry is warm before restore runs, not
   * in an isolated fix.
   */
  private dropFromOwnerEstate(
    owner: ChattelOwner | null,
    chattelId: string,
  ): void {
    if (owner?.kind !== "player") return;
    const host = StuffApi.findByTemplatePath(owner.templatePath);
    if (host && MixinApi.isEstate(host)) host._dropEstateEntry(chattelId);
  }

  /** Mint-on-first-stamp: reuse an existing id, else mint + server-write it. */
  private ensureId(item: Stuff & Chattel, reg: ChattelRegistry): string {
    const existing = item.getChattelId();
    if (existing) return existing;
    const id = reg.newId();
    item._setChattelId(id);
    return id;
  }

  /** Reset the memoized registry ref (hot-reload seam). */
  @CallSecurity(ChattelApiCallers)
  public _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
