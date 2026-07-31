/**
 * @internal — the logic singleton behind `ChattelApi`. Registers at
 * `/obj/api/chattel`; methods admit only the `ChattelApi` face. Extends
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

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { StuffApi } from "../../api/stuff";
import { MixinApi } from "../../api/mixin";
import { ProvenanceApi } from "../../api/provenance";
import { ParcelApi } from "../../api/parcel";
import { TemplatePaths } from "../../lib/paths";
import type { ChattelOwner } from "../../lib/chattel/ChattelRecord";
import type { Chattel } from "../../lib/chattel/Chattel";
import type { ChattelStampResult } from "../../api/chattel";
import type ChattelRegistry from "../ChattelRegistry";
import type { Stuff } from "../../lib/stuff/Stuff";

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
    // `coveringParcelOf`, NOT `ParcelApi.ownerOf`: the latter is *total*
    // (it falls back to the state, `{kind:'group', name:'core'}`), so using
    // it here would make the author rung unreachable and silently retitle
    // every authored good in the world to core. The covering lookup returns
    // null when no parcel covers the path, which is exactly the "outside
    // any extent" case D5 requires to fall through unchanged.
    const covering = await ParcelApi.coveringParcelOf(path);
    const parcelOwner = covering?.getOwner() ?? null;
    if (parcelOwner) return parcelOwner;
    // Fallback: an unstamped content good resolves to its author (no
    // world-wide restamp). Pure-degrade also lands here when no registry.
    const authorPath = await ProvenanceApi.authorOf(path);
    return authorPath ? { kind: "player", templatePath: authorPath } : null;
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

  /** See {@link ChattelApi.release}. */
  @CallSecurity(ChattelApiCallers)
  public async release(chattelId: string): Promise<void> {
    if (!chattelId) return;
    const reg = lookupRegistry();
    if (reg) await reg.release(chattelId);
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
