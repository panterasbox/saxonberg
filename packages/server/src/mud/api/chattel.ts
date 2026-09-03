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

export type { ChattelStampResult } from "../lib/chattel/Chattel";

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

export class ChattelApi {
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
