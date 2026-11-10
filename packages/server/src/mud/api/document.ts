/**
 * DocumentApi — the read / save / list surface for the **path-addressed
 * document store**: the generic, owner-claimed tree of arbitrary JSON the
 * runtime hands a user to fill (the slate's source / template / **document**
 * triad).
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link DocumentLogic} singleton at `/platform/idea/api/document`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /platform/idea/api/document` reloads it.
 *
 * The store is **kind-agnostic** — it persists `{ path, owner, kind, data }`
 * and never inspects `data`; each `kind`'s consumer (e.g. the scripting
 * engine for `kind: 'msh'`) owns the meaning + any go-live behavior. The
 * owner is **always derived from `ExecutionContextApi`** (the in-world
 * command-frame giver or a transport's `tagActingAuthor` stamp), never a
 * parameter (memory: gated-api-actor-from-context); an owner owns their own
 * `/home/<self>/` branch.
 *
 * Distinct from the persistence `Document` base class it shares a word
 * with: a `Document` is *how* a row is saved; a `StoredDocument` is the
 * *owned-JSON-in-the-tree* concept this Api stores.
 */

import type {
  DocumentKeyQuery,
  StoredDocument,
} from "../lib/document/StoredDocument";
import type { Publisher } from "../lib/press/Publisher";
import type { Business } from "../platform/idea/Business";
import type { Stuff } from "../lib/stuff/Stuff";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { DocumentLogic } from "../platform/idea/api/DocumentLogic";
import { fileURLToPath } from "url";
import { CallSecurity } from "../lib/security/decorators";
import { Mixins } from '../lib/mixin';
import type { Registrar } from '../lib/document/Registrar';
import type { DocumentPages, EditionRequest } from '../lib/document/Edition';
import type { Berthed } from '../platform/idea/BerthExit';
import { SecurityPolicies } from "../lib/security/SecurityPolicies";
import { SecurityApi } from './security';

/**
 * ⚠⚠ **The release write transport's whole blast radius.** The transport
 * stamps an owner the ordinary `save` gate would never admit, so the set
 * of modules that may reach it is the entire safety argument — and it is
 * one module. If this widens, the document-store ownership story is
 * broken, not just for releases.
 *
 * The gate lives on the Api **static** rather than on the logic method:
 * every logic method's caller is its own Api face, so a policy there
 * would name `DocumentApi` and narrow nothing. (The `CompactApi.assignOffice`
 * → `OfficeController` precedent.)
 */
const RELEASE_TRANSPORT_CALLERS = SecurityPolicies.FromModule(
  "/platform/idea/api/PressLogic#PressLogic",
);

/**
 * ⚠⚠ The register transport's gate — **the register itself, writing its
 * own book, and nothing else.**
 *
 * A register's security property is that a subject can FILE against it
 * and cannot REWRITE what it says: *you file; you do not hold the pen.*
 * `save`'s ordinary gate admits the branch owner, which for a herdbook is
 * the trade — so a keeper drafting a head out could not write, and
 * granting them the branch would hand them the pen.
 *
 * ⭐ This used to be `FromTemplate('/trade/ranching/idea/HerdRegistry')`,
 * with the ranching branch and its owner as kernel constants beside it.
 * That is a pack's namespace hardcoded in the engine — the thing the pack
 * system exists to prevent — and it did not survive the second register.
 * The contract is now **relational and nameless**: the caller must be a
 * `Registrar`, and it must be the register it is writing for.
 *
 * ⚠ Declaring yourself a registrar buys nothing on its own: the impl
 * refuses any branch the register does not itself live under. See
 * {@link Registrar}.
 */
/**
 * The instrument transport's one caller: the contract logic — the one
 * writer of `contracts`, and so the only thing that knows a claim exists
 * to paper (economic bootstrap D10).
 */
const INSTRUMENT_TRANSPORT_CALLERS = SecurityPolicies.FromModule(
  "/platform/idea/api/ContractLogic#ContractLogic",
);

/**
 * ⚠⚠ **The map transport — the fifth ownership bypass**, and it exists
 * for a reason the other four do not share: **the writer runs inside a
 * FORCED frame**.
 *
 * A map is written when a player perceives a place, and arrival
 * auto-senses via `self.forceCommand('sense')`.
 * `ExecutionContextApi.getActingAuthor()` returns **null** when any
 * frame in the chain is forced — so the ordinary context gate would
 * reach `canAtPath(null, …)` and fail closed, every time, for the one
 * write that matters most. The owner therefore has to be DERIVED from
 * the viewer key the caller already holds, exactly as `saveInstrument`
 * derives it from a party key.
 *
 * Its rails, all structural: no caller-supplied owner, the path is
 * pinned under that player's own `/home/<key>/map/`, the `kind` is
 * pinned to `map`, and it is gated to one calling module — the
 * navigation logic, which owns the perception seams and is the only
 * thing that knows what somebody just saw.
 */
const MAP_TRANSPORT_CALLERS = SecurityPolicies.FromModule(
  "/platform/idea/api/NavigationLogic#NavigationLogic",
);

/**
 * ⚠⚠ **The stream-token transport's gate** — the token registry
 * (`StreamLogic`) and nothing else (broadcast-ready D4). A token record
 * names the player a broadcast or control socket acts for; whoever can
 * write one can open anybody's feed.
 */
const STREAM_TOKEN_TRANSPORT_CALLERS = SecurityPolicies.FromModule(
  "/platform/idea/api/StreamLogic#StreamLogic",
);

/**
 * ⚠⚠ **The berth transport — the ship herself, writing her own line, and
 * nothing else**. A landing's roll of the ships lying
 * at it is the landing's, but each line on it is one ship's word about
 * herself — so the caller must be a voyaging craft and the craft it is
 * writing for (`saveToRegister`'s relational shape). It takes no flag:
 * whether she lies there is READ off her, so even she cannot write a
 * false line.
 */
const BERTH_TRANSPORT_CALLERS = SecurityPolicies.AllOf(
  SecurityPolicies.FromModule("/platform/idea/Ship", { includeSubclasses: true }),
  SecurityPolicies.SelfSubject(0),
);

// ⚠ The marker, deliberately: registrars are six rows' classes across five
// packs (kernel code may not name a pack class), and the self-subject bounds
// it — a register files only under itself (controllers-are-io D25).
const REGISTER_TRANSPORT_CALLERS = SecurityPolicies.AllOf(
  SecurityPolicies.FromMixin(Mixins.Registrar),
  SecurityPolicies.SelfSubject(0),
);

const LOGIC_PATH = "/platform/idea/api/document";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/DocumentLogic", import.meta.url),
);

/** Resolve the HMR-able DocumentLogic singleton (sync). */
function logic(): DocumentLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "DocumentLogic",
      ) as typeof DocumentLogic | null) ?? DocumentLogic)(),
  );
}

export class DocumentApi {
  /** The stored document at `path`, or null. Callers read its getters. */
  static read(path: string): Promise<StoredDocument | null> {
    return logic().read(path);
  }

  /**
   * Every document at or under `prefix` (the CMS tree's listing input) — a
   * range over the unique path index.
   */
  static list(prefix: string): Promise<StoredDocument[]> {
    return logic().list(prefix);
  }

  /** Every document of `kind` — e.g. every release, for a warm rebuild. */
  static listOfKind(kind: string): Promise<StoredDocument[]> {
    return logic().listOfKind(kind);
  }

  /**
   * ⭐ Documents of `kind` found by one key of their **catalogue card** —
   * the keys a kind declares, derived from each document's own data
   * (`DocumentKinds`). `q.eq` for equality, `q.min`/`q.max` for an
   * inclusive range, `q.order` to read in the key's order (the index serves
   * it), `q.prefix` to stay under one path, `q.limit` to cap. Not a second
   * identity: the path is the only name a document has; this is how it is
   * FOUND otherwise (`findByKey('release', 'publishedAt', {order: 'desc',
   * limit: 30})` — the press, newest first).
   */
  static findByKey(
    kind: string,
    key: string,
    q: DocumentKeyQuery = {},
  ): Promise<StoredDocument[]> {
    return logic().findByKey(kind, key, q);
  }

  /**
   * ⚠⚠ **The release write transport — an ownership bypass by
   * construction.** Writes a `kind: 'release'` document **owned by its
   * publisher organization** rather than by the acting author.
   *
   * It exists because {@link DocumentApi.save} gates on self-home /
   * covering zone / slice-walk, which admits the *parcel owner* — not the
   * comms director, and making every comms director a landowner is
   * obviously wrong. Same shape as `PersistableApi` routing capture as the
   * owning principal.
   *
   * Its narrowness is the whole safety argument, and every clause of it
   * is load-bearing: it is **gated to one calling module** (`PressLogic`),
   * takes **no caller-supplied owner** (it takes the publisher it was
   * handed and derives the owner), **refuses a path outside that
   * publisher's own feed branch**, and **pins the `kind`** so it cannot
   * write anything else. The authorization that the caller may publish as
   * this publisher (`mayPublishAs`) sits in front of it.
   */
  @CallSecurity(RELEASE_TRANSPORT_CALLERS)
  static saveRelease(
    publisher: Stuff & Publisher,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().saveRelease(publisher, path, data);
  }

  /**
   * File or update a document in a **register** — a book a society keeps
   * about somebody else (`Registrar`).
   *
   * ⚠⚠ **An ownership bypass, and narrow by CONSTRUCTION rather than by
   * allowlist.** It takes no owner and no kind: both are declared by the
   * register, the path must lie in the register's own branch, and the
   * register may only administer a branch it itself lives under. So it
   * cannot write anything a register was not already entitled to write,
   * and the kernel never learns which registers exist.
   *
   * ⭐ Why registers exist at all: a record about you must live on
   * somebody else's branch, or its subject can rewrite it — and a
   * herdbook is a **sales document**, which makes a self-kept one the
   * lemons fraud with the engine supplying the pen. Real herdbooks have
   * been kept by breed societies rather than by the men selling the bulls
   * since 1822, for exactly this reason.
   */
  @CallSecurity(REGISTER_TRANSPORT_CALLERS)
  static saveToRegister(
    register: Stuff & Registrar,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().saveToRegister(register, path, data);
  }

  /**
   * ⭐ Bring `ship`'s line on `landingPath`'s berth roll up to the truth:
   * her durable handle is on it iff she is made fast there now
   * (`getBerth() === landingPath`), struck off it otherwise. The roll is
   * one document per landing at `/platform/berths<landing path>`, kind
   * `berth-roll`, owned by the landing.
   *
   * ⚠⚠ An ownership bypass, narrow by construction: only the ship may
   * call it for herself ({@link BERTH_TRANSPORT_CALLERS}), it writes only
   * her own handle, and it takes no word from her about where she lies.
   */
  @CallSecurity(BERTH_TRANSPORT_CALLERS)
  static saveBerth(
    ship: Stuff & Berthed,
    landingPath: string,
  ): Promise<void> {
    return logic().saveBerth(ship, landingPath);
  }

  /**
   * The durable handles on `landingPath`'s berth roll, in the order they
   * came — `[]` for a landing nobody has made fast at.
   */
  static berthRollOf(landingPath: string): Promise<string[]> {
    return logic().berthRollOf(landingPath);
  }

  /**
   * ⚠⚠ **The business-filed-paper transport — `saveRelease`'s twin, and
   * one of the three ownership bypasses** (with `saveToRegister` above).
   * Writes a document **owned by a `Business`** rather than by the acting
   * author.
   *
   * A bill of lading is issued by a *clerk* on behalf of a *carrier*, and
   * {@link DocumentApi.save}'s gate admits the parcel owner — the
   * landowner, not the clerk. Titling each carrier an extent works for
   * the proprietor and fails for every employee, and a player-run carrier
   * cannot be given a group.
   *
   * Three rails, all structural: **no caller-supplied owner** (derived
   * from the business), **the path must lie under that business's own
   * branch** (which is also what makes a depot's records cover exactly
   * what it handled, read by prefix), and **the `kind` must be one of the
   * closed three** — `bill-of-lading`, `warehouse-receipt`, `rate-card`.
   *
   * ⚠ Deliberately **no caller-module allowlist**, unlike `saveRelease`:
   * its callers are pack registries, and a `FromModule` list here would
   * be a kernel edit every paper-filing pack needs. See
   * [logistics.md](../../../docs/subsystems/logistics.md).
   */
  static saveAsBusiness(
    business: Stuff & Business,
    path: string,
    kind: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().saveAsBusiness(business, path, kind, data);
  }

  /**
   * ⭐ A stored document rendered as PAGES — what a sheet, a
   * book or a screen shows of it. Exhaustive over the closed kind table;
   * `null` for a kind that does not read as a page (a script, a map).
   * A read, ungated like {@link DocumentApi.read}.
   */
  static pagesOf(path: string): Promise<DocumentPages | null> {
    return logic().pagesOf(path);
  }

  /**
   * ⭐ The document a reader may CALL UP by a word — to show on a
   * screen, to set in type, to print: the newest standing release whose
   * headline or publisher answers to it, else a paper of the reader's own.
   * `null` when nothing answers.
   */
  static callUp(reader: Stuff, word: string): Promise<{ path: string; title: string } | null> {
    return logic().callUp(reader, word);
  }

  /**
   * ⚠⚠ **The edition transport** — freeze the pages of a
   * printing as a `kind: 'edition'` document at
   * `<source>/editions/<hash>`, owned by the source's owner, and return
   * its path. Idempotent: the same pages freeze to the same edition. No
   * caller-supplied owner or path; no caller allowlist (its callers are
   * the kernel's stores and the printing pack — `saveAsBusiness`'s
   * reason). Throws on a source that names nothing.
   */
  static freezeEdition(req: EditionRequest): Promise<string> {
    return logic().freezeEdition(req);
  }

  /**
   * ⚠⚠ **The instrument transport — the fourth ownership bypass** (economic
   * bootstrap D10). Files the readable paper behind a claim on `contracts`
   * under a PARTY'S own branch, owned by that party, written by the
   * machine: a member's at `/home/<key>/papers/…`, a business's or the
   * Treasury's at `<path>/papers/…`. No caller-supplied owner, the path
   * must lie under that party's `papers/`, the `kind` is pinned to
   * `instrument`, and it is gated to the contract logic — the one writer
   * of `contracts`.
   */
  @CallSecurity(INSTRUMENT_TRANSPORT_CALLERS)
  static saveInstrument(
    partyKey: string,
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().saveInstrument(partyKey, path, data);
  }

  /**
   * ⭐⭐ Write one player's map of one locality.
   *
   * `ownerKey` is the viewer's identity path; the document lands at
   * `/home/<its basename>/map/<localityAddress>` and nowhere else. The
   * address keeps its slashes, so a coarser read is a prefix read with
   * no join — and copying one locality's map hands over nothing about
   * any other.
   *
   * See {@link MAP_TRANSPORT_CALLERS} for why the owner is derived
   * rather than taken from context: the writer runs inside a forced
   * frame, where the acting author is `null` by design.
   */
  @CallSecurity(MAP_TRANSPORT_CALLERS)
  static saveMap(
    ownerKey: string,
    localityAddress: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().saveMap(ownerKey, localityAddress, data);
  }

  /**
   * Read one player's maps under a locality prefix — theirs only.
   *
   * ⭐ The prefix read is what makes `map terminus` work with no join:
   * the address tree nests, so every map under Terminus is a path
   * prefix away.
   */
  @CallSecurity(MAP_TRANSPORT_CALLERS)
  static readMaps(
    ownerKey: string,
    localityPrefix: string,
  ): Promise<Array<{ path: string; data: Record<string, unknown> }>> {
    return logic().readMaps(ownerKey, localityPrefix);
  }

  /**
   * ⚠⚠ Write a stream token's record at `/platform/stream-tokens/<hash>`
   * — an ownership bypass, narrow by construction: gated to `StreamLogic`,
   * the path pinned to a sha256 hex, the kind pinned, the fields typed.
   * The raw token is never stored.
   */
  @CallSecurity(STREAM_TOKEN_TRANSPORT_CALLERS)
  static saveStreamToken(
    hash: string,
    record: { playerId: string; scope: string; issuedAt: number },
  ): Promise<void> {
    return logic().saveStreamToken(hash, record);
  }

  /** Revoke a stream token by its hash — the same gate. */
  @CallSecurity(STREAM_TOKEN_TRANSPORT_CALLERS)
  static deleteStreamToken(hash: string): Promise<boolean> {
    return logic().deleteStreamToken(hash);
  }

  /**
   * Save a document's `data` (arbitrary JSON) and `kind` at `path`
   * (owner/scope encoded in the path). Find-or-creates. The mutation is
   * access-gated (an owner owns their own `/home/<self>/` branch; else the
   * covering zone / slice-walk `can(write)`), the owner is set from the
   * acting author, and authorship is appended to the provenance ledger
   * keyed on the path. The acting author is derived from context, never a
   * parameter. The store does **not** inspect `data` or run any
   * kind-specific go-live — that belongs to the kind's consumer.
   */
  static save(
    path: string,
    kind: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    return logic().save(path, kind, data);
  }

  /**
   * Delete the document at `path`. The same mutation gate as `save`
   * (self-home, else the ownership stack); no provenance row — a
   * deletion is not authorship. Returns whether a row existed.
   */
  static delete(path: string): Promise<boolean> {
    return logic().delete(path);
  }
}

SecurityApi.decorateApiClass(DocumentApi);
