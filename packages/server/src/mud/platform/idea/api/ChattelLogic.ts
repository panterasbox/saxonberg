/**
 * @internal — the logic singleton behind `ChattelApi`. Registers at
 * `/platform/idea/api/chattel`; methods admit only the `ChattelApi` face. Extends
 * `ApiLogic`, so it is itself residency-exempt.
 *
 * Owns the ownership-resolution chain
 * (`stamp ?? parcel-extent ?? authorOf`) and the
 * stack-refusal invariant, delegating storage to the `ChattelRegistry`
 * singleton (reached via `StuffApi.findByTemplatePath`, memoized). Like
 * `ParcelLogic` it **pure-degrades** when the registry isn't live (no
 * registry → the author fallback still resolves; mutators no-op).
 *
 * Fungible stacks (`Stackable`) are structurally out of scope: a stack that
 * splits/merges has no stable per-instance id, so `stamp`/`transfer` refuse
 * a stack (a clear no-op, not a silent mint), and `ownerOf` of a stack is
 * null (owned-by-possession).
 */

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { StuffApi } from "../../../api/stuff";
import { MixinApi } from "../../../api/mixin";
import { ProvenanceApi } from "../../../api/provenance";
import { ParcelApi } from "../../../api/parcel";
import { ExecutionContextApi } from "../../../api/execution-context";
import { PersistableApi } from "../../../api/persistable";
import { TemplatePaths } from "../../../lib/paths";
import type {
  ChattelOwner,
} from "../../../lib/chattel/ChattelRecord";
import type { Chattel } from "../../../lib/chattel/Chattel";
import type { Adornment } from "../../../lib/boundary/Adornment";
import type { ChattelStampResult } from "../../../api/chattel";
import type ChattelRegistry from "../ChattelRegistry";
import type { Stuff } from "../../../lib/stuff/Stuff";
import { ContentsTitle } from "../../../lib/chattel/ContentsTitle";

const REGISTRY_PATH = TemplatePaths.chattelRegistry;

const ChattelApiCallers = SecurityPolicies.FromModule("/api/chattel#ChattelApi");
/** The F1 object face: a chattel-bearing good forwards its own title ops. */
const ChattelCallers = SecurityPolicies.AnyOf(
  ChattelApiCallers,
  SecurityPolicies.AllOf(
    SecurityPolicies.FromMixin("ChattelMixin"),
    SecurityPolicies.SelfSubject(0),
  ),
);

/** The owner key a person or a house is titled by (Chattel's own rule). */
function ownerKeyOf(owner: Stuff): ChattelOwner {
  const templatePath = owner.getIdentityPath() ?? "";
  return MixinApi.isOrganization(owner)
    ? { kind: "organization", templatePath }
    : { kind: "player", templatePath };
}

/** Is `place` the actor's own room, or something standing in it? */
function isWhere(actor: Stuff, place: Stuff): boolean {
  const room = MixinApi.isContainable(actor) ? actor.getContainer() : null;
  let at: Stuff | null = place;
  for (let depth = 8; at !== null && depth > 0; depth--) {
    if (at === actor || (room !== null && at === room)) return true;
    at = MixinApi.isContainable(at) ? at.getContainer() : null;
  }
  return false;
}

const GLOB_REFUSAL =
  "fungible stacks are owned by possession, not stamped";

/**
 * ⭐⭐ **A STACK cannot bear title; a LOT OF ONE can.**
 *
 * The discrete-goods rule exists for one reason, and the doc states it
 * exactly: *"a split of a stack of five has no answer for which unit
 * keeps the id, and a merge equates identities."* Both halves of that
 * objection are about a stack that is still a stack. Neither survives
 * at quantity ONE — there is nothing to split, and a merge is refused
 * outright by the veto below.
 *
 * ⚠ It mattered: `consign` refused every stack, so a mill could weave
 * cloth it could never sell. A bolt is a stack ON PURPOSE (two dye lots
 * must never merge), and a good whose fungibility is load-bearing was
 * thereby barred from the sale layer entirely. Taking ONE unit off the
 * stack and titling it is what a consignment actually is: the lot is a
 * thing, the rest of the stack stays owned-by-possession.
 *
 * Paired invariant, in `StackableMixin.canMergeWith`: a titled stack
 * does not merge. That is what keeps "a merge equates identities" from
 * ever arising, and it is why this narrowing is safe rather than a
 * loophole.
 */
/** Why a bound title will not move. */
const BOUND_REFUSAL = "bound";

/** Do two owner keys name the same principal? */
function sameOwner(a: ChattelOwner | null, b: ChattelOwner): boolean {
  if (a === null || a.kind !== b.kind) return false;
  if (a.kind === "group" || b.kind === "group") return false;
  return a.templatePath === b.templatePath;
}

function isFungibleStack(item: Stuff): boolean {
  return MixinApi.isStackable(item) && item.getQuantity() > 1;
}

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
  /**
   * See {@link ChattelApi.isOwnerPersisted}. The stamped owner alone —
   * rung 1 of the chain, read synchronously off the registry's in-memory
   * index (never the parcel or author rungs, which go to the store). Null
   * for an unstamped good, or when no registry is live.
   */
  @CallSecurity(ChattelCallers)
  public stampedOwnerOf(item: Stuff): ChattelOwner | null {
    if (!MixinApi.isChattel(item)) return null;
    const id = item.getChattelId();
    if (!id) return null;
    return lookupRegistry()?.ownerOf(id) ?? null;
  }

  @CallSecurity(ChattelCallers)
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
    // A STACK is owned-by-possession — never stamped, so never resolved.
    // A titled lot of one resolves like any other discrete good.
    if (isFungibleStack(item)) return null;
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
  @CallSecurity(ChattelCallers)
  public followCustody(
    item: Stuff,
    arrival?: { fresh: boolean; to: Stuff | null },
  ): Promise<void> {
    // ⚠ One record at a time per good: every move asks (the primitive
    // fires this without awaiting), and two in flight would let the second
    // see the first's place field before the first had written the
    // registry and the estate — and skip as "unchanged".
    const key = item.stuffId;
    const prior = this.custodyQueue.get(key) ?? Promise.resolve();
    const next = prior
      .catch(() => undefined)
      .then(() => this.followCustodyOnce(item, arrival));
    this.custodyQueue.set(key, next);
    void next.finally(() => {
      if (this.custodyQueue.get(key) === next) this.custodyQueue.delete(key);
    }).catch(() => undefined);
    return next;
  }

  /** Records in flight, by good — see {@link followCustody}. */
  private custodyQueue = new Map<string, Promise<void>>();

  private async followCustodyOnce(
    item: Stuff,
    arrival?: { fresh: boolean; to: Stuff | null },
  ): Promise<void> {
    // Moved and then consumed (an ingredient, a merged stack) before the
    // queued record ran: nothing is anywhere.
    if (item.isDestroyed() || !MixinApi.isChattel(item)) return;
    const good = item as Stuff & Chattel;
    // ⭐⭐ A FRESH good's title is DERIVED at its first arrival — nobody
    // stamps it by hand (the one movement primitive does this; see
    // `ContainmentApi.move`). Only a good that was never anywhere (a mint
    // arriving from nowhere) and never titled: a good that already exists
    // — a shop's stock, a room's props — is never retitled by being moved,
    // so taking it stays theft.
    if (arrival?.fresh && !good.getChattelId() && !isFungibleStack(item)) {
      const owner = this.derivedTitle(item, arrival.to);
      if (owner) {
        const reg = lookupRegistry();
        if (reg) await reg.stamp(this.ensureId(good, reg), owner);
      }
    }
    // ⭐ Title only (persistence-model D9): where a good is kept is its
    // container's to say, never its owner's.
  }

  /**
   * ⭐⭐ Whose a freshly made good is, derived the moment it arrives — in
   * order:
   *
   * 1. **what it was made FROM**: the owner of its inputs, when the titled
   *    ones agree (the log's owner owns the boards, the customer's sample
   *    makes the customer's paper) — whoever is acting, whenever it lands;
   * 2. **the hands it lands in**: a person's — a body that keeps an
   *    estate, or an organization (never a beast's or a cast role's);
   * 3. **the acting person**, inside a live command, where they stand (a
   *    room's `props:` laid down while somebody walks in are not theirs);
   *    or, with no command running, **the person whose act this is the
   *    continuation of** — a firing that completes an hour after `fire
   *    kiln` returned is still the firer's, wherever they have gone;
   * 4. **its recorded maker** (a crafted thing knows who made it).
   *
   * ⭐⭐ A good a PROCESS made (`recordMadeBy`: a pot's cake, a mould's
   * cast) is decided at rung 1 and nowhere else — its owner is whose its
   * contents were, and NOBODY when they were nobody's. A process runs when
   * somebody reads it; the reader is an onlooker, and an onlooker must
   * never be titled (potash: a passer-by at the pot as it set would have
   * owned your black salts).
   *
   * Null leaves it untitled — a shop's restock, a room's props, a thing
   * made from nobody's materials with nobody there — as it always was.
   */
  private derivedTitle(item: Stuff, to: Stuff | null): ChattelOwner | null {
    // ⭐ Only a MADE thing has inputs to inherit a title from — an animal
    // arriving is never "made" (controllers-are-io D6: narrowed, where it
    // used to reach every chattel).
    if (MixinApi.isMadeFrom(item)) {
      const made = item.getMadeFromOwner();
      if (made) return made;
      if (item.isMadeByProcess()) return null;
    }
    // ⭐ The hands it lands in — a PERSON's: a body whose own record carries
    // its goods (an estate), or an organization. A beast or a cast role
    // keeps no estate, so a good titled to it was skipped by its own capture
    // as somebody else's and carried by nobody (size and carrying, run 12:
    // the steading mule's restore re-minted its tack into it, titled it to
    // the mule, and the next restart lost the saddle). Such a good stays
    // untitled and rides the body's own record, or falls to the acting
    // person below.
    if (to !== null && to.isAgent() && (MixinApi.isEstate(to) || MixinApi.isOrganization(to))) {
      return ownerKeyOf(to);
    }
    if (ExecutionContextApi.getCommandStack().length > 0) {
      const actor = ExecutionContextApi.getActingAuthor() as Stuff | null;
      if (actor && to !== null && isWhere(actor, to)) return ownerKeyOf(actor);
    } else {
      const author = ExecutionContextApi.getCausingAuthor() as Stuff | null;
      if (author && to !== null) return ownerKeyOf(author);
    }
    if (MixinApi.isCrafted(item)) {
      const maker = item.getMaker();
      if (maker) return { kind: "player", templatePath: maker };
    }
    return null;
  }

  /**
   * See {@link Chattel.recordMadeFrom}: the owner the TITLED inputs agree
   * on, or null. Only a stamped title counts — an untitled input (a shelf
   * good, a prop) owns nothing it could pass on, and the fallbacks
   * `resolveOwner` reads (a parcel, a row's author) are not a title.
   */
  @CallSecurity(ChattelCallers)
  public async ownerOfInputs(
    _item: Stuff,
    inputs: readonly Stuff[],
  ): Promise<ChattelOwner | null> {
    const reg = lookupRegistry();
    if (!reg) return null;
    // ⭐ The same agreement a liquid's contents follow (`ContentsTitle`):
    // untitled inputs make no claim, disagreeing ones make it nobody's.
    let agreed = new ContentsTitle(undefined);
    for (const input of inputs) {
      if (!MixinApi.isChattel(input)) continue;
      const good = input as Stuff & Chattel;
      const id = good.getChattelId();
      // A good made a moment ago is not titled until it lands — what it
      // was itself made from stands in for it (a press's residue cake is
      // made from what its output was).
      const owner = id
        ? reg.ownerOf(id)
        : MixinApi.isMadeFrom(input)
          ? input.getMadeFromOwner()
          : null;
      if (!owner || owner.kind === "group") continue;
      agreed = agreed.with(owner);
    }
    return agreed.owner();
  }

  /** See {@link ChattelApi.stamp}. */
  @CallSecurity(ChattelCallers)
  public async stamp(
    item: Stuff,
    owner: ChattelOwner,
    opts: { bound?: boolean } = {},
  ): Promise<ChattelStampResult> {
    if (isFungibleStack(item)) return { ok: false, reason: GLOB_REFUSAL };
    if (!MixinApi.isChattel(item)) {
      return { ok: false, reason: "not a chattel-bearing good" };
    }
    const reg = lookupRegistry();
    if (!reg) return { ok: false, reason: "no chattel registry" };
    const id = this.ensureId(item as Stuff & Chattel, reg);
    if (reg.isBound(id) && !sameOwner(reg.ownerOf(id), owner)) {
      return { ok: false, reason: BOUND_REFUSAL };
    }
    await reg.stamp(id, owner, opts.bound === true);
    return { ok: true, chattelId: id };
  }

  /** See {@link ChattelApi.transfer}. */
  @CallSecurity(ChattelCallers)
  public async transfer(
    item: Stuff,
    newOwner: ChattelOwner,
  ): Promise<ChattelStampResult> {
    if (isFungibleStack(item)) return { ok: false, reason: GLOB_REFUSAL };
    if (!MixinApi.isChattel(item)) {
      return { ok: false, reason: "not a chattel-bearing good" };
    }
    const reg = lookupRegistry();
    if (!reg) return { ok: false, reason: "no chattel registry" };
    const id = this.ensureId(item as Stuff & Chattel, reg);
    // ⭐ A bound title never moves (aether-devices D10) — the one
    // chokepoint every transfer already passes.
    if (reg.isBound(id)) return { ok: false, reason: BOUND_REFUSAL };
    await reg.transfer(id, newOwner);
    return { ok: true, chattelId: id };
  }

  /**
   * See {@link ChattelApi.release} — the registry GCs the durable row and
   * its index entry. (The estate half retired with the estate, persistence-model D9.)
   */
  @CallSecurity(ChattelApiCallers)
  public async release(chattelId: string): Promise<void> {
    if (!chattelId) return;
    const reg = lookupRegistry();
    if (!reg) return;
    await reg.release(chattelId);
  }

  /** Mint-on-first-stamp: reuse an existing id, else mint + server-write it. */
  private ensureId(item: Stuff & Chattel, reg: ChattelRegistry): string {
    const existing = item.getChattelId();
    if (existing) return existing;
    const id = reg.newId();
    item._setChattelId(id);
    return id;
  }

  /** See {@link Chattel.isTitleBound} — the sync dry read. */
  @CallSecurity(ChattelCallers)
  public isBound(item: Stuff): boolean {
    if (!MixinApi.isChattel(item)) return false;
    const id = item.getChattelId();
    return id ? (lookupRegistry()?.isBound(id) ?? false) : false;
  }

  /** Reset the memoized registry ref (hot-reload seam). */
  @CallSecurity(ChattelApiCallers)
  public _resetRegistryRefForReload(): void {
    registryRef = null;
  }
}
