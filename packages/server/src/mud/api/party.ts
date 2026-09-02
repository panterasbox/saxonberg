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
 * singleton at `/platform/idea/api/party`, reached synchronously via
 * `StuffApi.singletonSync`; these statics forward there. Mirrors the
 * `GroupApi ↔ GroupLogic` shape.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { Party } from "../platform/idea/Party";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { PartyLogic } from "../platform/idea/api/PartyLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';

export type { Party } from "../platform/idea/Party";
export { DEFAULT_FORMATION_PATH } from "../platform/idea/Party";

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

const LOGIC_PATH = "/platform/idea/api/party";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../platform/idea/api/PartyLogic", import.meta.url),
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

  /**
   * The combatant's formation path — the **total resolution chain**
   * (NEVER null/`''`): the active party's chosen formation, else
   * {@link DEFAULT_FORMATION_PATH}. A partyless wanderer, a party that
   * never chose, and a party of one all resolve through this one read —
   * the exchange loop has no null branch and "solo" is not a concept
   * (the `sideOf` mirror). Combat resolves the path to its Idea on its
   * own side; the party face speaks strings only.
   */
  public static formationPathOf(combatant: Stuff): string {
    return logic().formationPathOf(combatant);
  }

  /**
   * The combatant's assigned role under its active party's formation,
   * `''` when unassigned or partyless. Roles are sets, not seats — many
   * members may share one role; vacant is inert, never an error.
   */
  public static roleOf(combatant: Stuff): string {
    return logic().roleOf(combatant);
  }

  /** Whether the combatant captains their active party (the called-target
   * + coup-directive authority read). False when partyless. */
  public static isCaptain(combatant: Stuff): boolean {
    return logic().isCaptain(combatant);
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

}

SecurityApi.decorateApiClass(PartyApi);
