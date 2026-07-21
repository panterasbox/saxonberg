/**
 * PartyApi — the gated, typed forwarding shell for the party operational
 * core.
 *
 * Two responsibilities. First, the **combat friend/foe seam** — the two
 * pure functions the combat engine consumes (`sideOf` / `areAllied`),
 * read straight off a party's own roster, never `GroupApi`. Combat imports
 * *only* these; it never touches party membership, the captain, or the
 * roster. Second, the **party lifecycle** (form / invite / accept / leave
 * / kick / disband / transfer / side / muster / stand-down) the `party`
 * verb drives.
 *
 * The orchestration lives in the hot-reloadable {@link PartyLogic}
 * singleton at `/obj/api/party`, reached synchronously via
 * `StuffApi.singletonSync`; these statics forward there. Mirrors the
 * `GroupApi ↔ GroupLogic` shape.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { Party } from "../lib/party/Party";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { PartyLogic } from "../obj/api/PartyLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

export type { Party } from "../lib/party/Party";

/**
 * The per-fight alignment key. Equality means allied. Never null: a
 * partyless combatant resolves to `solo:<durableId>`, a side of one.
 */
export type SideRef = string;

/** Result of a party operation that yields a party. */
export type PartyOpResult =
  | { ok: true; party: Party }
  | { ok: false; reason: string };

/** Result of a party operation with no return value. */
export type PartySimpleResult = { ok: true } | { ok: false; reason: string };

const LOGIC_PATH = "/obj/api/party";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/PartyLogic", import.meta.url),
);

/** Resolve the HMR-able PartyLogic singleton (sync). */
function logic(): PartyLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "PartyLogic",
      ) as typeof PartyLogic | null) ?? PartyLogic)(),
  );
}

export class PartyApi {
  private constructor() {}

  /** Boot: register the `party:` grouping provider + re-materialize
   * durable parties into live Ideas. Called from `AppBootstrap` after
   * `GroupRegistry` stands up. */
  public static boot(): Promise<void> {
    return logic().boot();
  }

  /* ───────────────── the combat seam ───────────────── */

  /**
   * The alignment key for a combatant (NEVER null): the active party's
   * `combatSide`, or `solo:<durableId>` when partyless. The three-rung
   * resolution chain (party → owner → solo) mirrors the `ownerOf` walk.
   */
  public static sideOf(combatant: Stuff): SideRef {
    return logic().sideOf(combatant);
  }

  /** True iff `a` and `b` resolve to the same side. */
  public static areAllied(a: Stuff, b: Stuff): boolean {
    return logic().areAllied(a, b);
  }

  /** The combatant's active party, or null. */
  public static activePartyOf(member: Stuff): Party | null {
    return logic().activePartyOf(member);
  }

  /** Every durable party whose roster lists `memberId` (the `party list`
   * read — a member sits on many parties' rosters). Reads the durable
   * `PartyRecord` index, so it is async. */
  public static partiesOf(memberId: string): Promise<readonly Party[]> {
    return logic().partiesOf(memberId);
  }

  /* ───────────────── lifecycle ───────────────── */

  /** Found a new party (ad-hoc unless `durable`), captained by `founder`. */
  public static form(
    founder: Stuff,
    name: string,
    durable = false,
  ): Promise<PartyOpResult> {
    return logic().form(founder, name, durable);
  }

  /** Offer `invitee` a place in the inviter's party (offer+accept). */
  public static invite(inviter: Stuff, invitee: Stuff): Promise<PartyOpResult> {
    return logic().invite(inviter, invitee);
  }

  /** Accept an outstanding party invite. */
  public static accept(invitee: Stuff): Promise<PartyOpResult> {
    return logic().accept(invitee);
  }

  /** Directly enlist `hiree` into `hirer`'s party (the merc-hire path, no
   * invite handshake). */
  public static enlist(hirer: Stuff, hiree: Stuff): Promise<PartySimpleResult> {
    return logic().enlist(hirer, hiree);
  }

  /** Leave the active party (captain leaving auto-promotes an heir). */
  public static leave(member: Stuff): Promise<PartySimpleResult> {
    return logic().leave(member);
  }

  /** Captain removes a member by ref. */
  public static kick(
    captain: Stuff,
    targetId: string,
  ): Promise<PartySimpleResult> {
    return logic().kick(captain, targetId);
  }

  /** Captain dissolves the party (+ its chat channel). */
  public static disband(captain: Stuff): Promise<PartySimpleResult> {
    return logic().disband(captain);
  }

  /** Captain hands leadership to another member. */
  public static transfer(
    captain: Stuff,
    newCaptainId: string,
  ): Promise<PartySimpleResult> {
    return logic().transfer(captain, newCaptainId);
  }

  /** Captain sets the party's shared combat side (the ally seam). */
  public static setSide(
    captain: Stuff,
    side: string,
  ): Promise<PartySimpleResult> {
    return logic().setSide(captain, side);
  }

  /** Re-activate a dormant durable crew by name (one-active — stands down
   * the current active party first). */
  public static muster(member: Stuff, name: string): Promise<PartyOpResult> {
    return logic().muster(member, name);
  }

  /** Go dormant: clear the active pointer (a durable crew persists; an
   * ad-hoc party is left). */
  public static standDown(member: Stuff): Promise<PartySimpleResult> {
    return logic().standDown(member);
  }
}

SecurityApi.decorateApiClass(PartyApi);
