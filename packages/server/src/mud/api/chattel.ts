/**
 * ChattelApi — the gated facade over per-instance movable-good ownership
 * (the twin of `ParcelApi`). Ownership is a registry fact resolved
 * `stamp ?? authorOf`, keyed on a durable per-instance id; the item carries
 * only its identity, never its owner.
 *
 * The single legitimate path to the ownership registry: the `ChattelLogic`
 * singleton + `ChattelRegistry` gate to this face. The actor behind an
 * event is always execution-context-derived (never a caller-supplied
 * param). Chattel is **discrete-goods only** — a fungible stack (`Globbable`)
 * is owned-by-possession, and `stamp`/`transfer` refuse it.
 */

import { StuffApi } from "./stuff";
import { MixinApi } from "./mixin";
import { HotReloadApi } from "./hot-reload";
import { ChattelLogic } from "../platform/idea/api/ChattelLogic";
import type { ChattelOwner } from "../lib/chattel/ChattelRecord";
import type { Stuff } from "../lib/stuff/Stuff";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

const LOGIC_PATH = "/platform/idea/api/chattel";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/ChattelLogic", import.meta.url),
);

/** The outcome of a stamp/transfer — the minted id, or a refusal reason. */
export type ChattelStampResult =
  | { ok: true; chattelId: string }
  | { ok: false; reason: string };

export type { ChattelOwner } from "../lib/chattel/ChattelRecord";

/** Resolve the HMR-able ChattelLogic singleton (sync). */
function logic(): ChattelLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "ChattelLogic",
      ) as typeof ChattelLogic | null) ?? ChattelLogic)(),
  );
}

/** Build the typed owner principal for an Avatar/player Stuff. */
function ownerKeyOf(owner: Stuff): ChattelOwner {
  return { kind: "player", templatePath: owner.getTemplatePath() ?? "" };
}

export class ChattelApi {
  /**
   * The owner of a movable good — `stamp ?? parcel-extent ?? authorOf`,
   * three rungs and total. A per-instance owner-stamp overrides; absent a
   * stamp, a good whose template path falls under a **parcel's extent**
   * resolves to that parcel's owner (so a landlord owns the fixtures in a
   * unit they let, and a fixture carried off stays titled to the parcel —
   * displacement is theft, recoverable); absent both, the item's author
   * (via the shipped `authorOf` resolution). Null for a glob or an
   * unstamped + unowned + unauthored good.
   */
  public static async ownerOf(item: Stuff): Promise<ChattelOwner | null> {
    return logic().ownerOf(item);
  }

  /**
   * Whether someone has been **stamped** as owning this good — a durable
   * per-instance id is minted only by `stamp`/`transfer`, so a non-empty
   * id IS the stamp.
   *
   * **Synchronous, and that is the point.** The persistence capture walk
   * cannot await, so the skip rule (D2) needs a stamp test it can run
   * inline. Keying on the stamp rather than on `ownerOf` as a whole is
   * also the semantically correct rule: a fixture under a parcel extent is
   * *owned* but not *stamped*, so it keeps riding its room's record where
   * it belongs, and only goods that have actually changed hands move to
   * the owner scope.
   */
  public static isStamped(item: Stuff): boolean {
    return MixinApi.isChattel(item) && item.getChattelId() !== "";
  }

  /**
   * Record **where the owner keeps** a titled good — a room identity,
   * `'inventory'`, or `'storage'`. The single write path: it sets the
   * good's own field, the `chattel` row's by-room index, and (when the
   * owner is live) their estate, in one call.
   *
   * Distinct from custody: `place` says where the OWNER keeps it, so a good
   * left in a foreign room keeps naming that room while its title and its
   * persistence stay with its owner. A no-op for a glob or an unstamped
   * good — neither has an owner to keep it.
   */
  public static async setPlace(item: Stuff, place: string): Promise<void> {
    return logic().setPlace(item, place);
  }

  /**
   * Re-derive a good's placement from where it now **is** — the one call a
   * custody verb makes after moving something. In its owner's own hands it
   * becomes `inventory`; anywhere else, the room identity of the nearest
   * persistence host.
   *
   * A no-op for a glob, an unstamped good, or a good in transient space.
   * Deliberately records rather than judges: taking a good you do not hold
   * title to is **theft** — permitted, recoverable, never blocked — so this
   * does not check who is acting.
   */
  public static async followCustody(item: Stuff): Promise<void> {
    return logic().followCustody(item);
  }

  /**
   * Force every owned good placed at or under `placePrefix` back to
   * **storage** — the lease-end sweep (D9). Intact, titled, recoverable;
   * **never destructed**, because a good titled to somebody survives the
   * end of their tenancy. The unit re-lets empty and the ex-tenant's
   * furniture waits for their next address. Returns the count.
   */
  public static async evictToStorage(placePrefix: string): Promise<number> {
    return logic().evictToStorage(placePrefix);
  }

  /**
   * Every titled good recorded as placed in `place` — the by-room lookup a
   * materializing room uses to overlay the goods that belong in it, without
   * scanning every owner's record.
   */
  public static async placedIn(
    place: string,
  ): Promise<Array<{ chattelId: string; owner: ChattelOwner | null }>> {
    return logic().placedIn(place);
  }

  /**
   * Establish ownership — mint a durable id on the good if it has none,
   * then title it to `owner`. Refuses a fungible stack. Actor
   * context-derived.
   */
  public static async stamp(
    item: Stuff,
    owner: Stuff,
  ): Promise<ChattelStampResult> {
    return logic().stamp(item, ownerKeyOf(owner));
  }

  /**
   * Transfer ownership — re-stamp the good to `newOwner` (auditable, a
   * chain-of-title event). Refuses a fungible stack. Actor context-derived.
   */
  public static async transfer(
    item: Stuff,
    newOwner: Stuff,
  ): Promise<ChattelStampResult> {
    return logic().transfer(item, ownerKeyOf(newOwner));
  }

  /**
   * GC a destroyed good's title row by id (the `ChattelMixin.onDestruct`
   * seam). Appends a terminal `released` event; no-op if the id is empty
   * or no registry is live.
   */
  public static async release(chattelId: string): Promise<void> {
    return logic().release(chattelId);
  }

  /** Reset the memoized registry ref (hot-reload seam). */
  public static _resetRegistryRefForReload(): void {
    logic()._resetRegistryRefForReload();
  }
}

SecurityApi.decorateApiClass(ChattelApi);
