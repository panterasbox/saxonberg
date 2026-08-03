/**
 * GovernmentApi — the gated surface for the civics substrate: diegetic
 * governments as plural authored content.
 *
 * A `Government` is a reference-identity (the `Corpo` shape) authored by
 * a committee; jurisdiction is declared on the `Locality`
 * (`_governmentKey`) and derived here as a chain over the address
 * coverage walk; residency derives from a character's domicile; seats
 * are employment positions. It is NOT the Compact (the real
 * meta-institution) — see docs/subsystems/civics.md.
 *
 * Two distinct chain reads: {@link GovernmentApi.subjectTo} (where you
 * ARE — a visitor obeys local law) vs {@link GovernmentApi.residentOf}
 * (where you LIVE — membership standing). Every read returns
 * `[]`/`null`/`false` off-grid; nothing here throws on an unclaimed
 * place — no government is a normal state of the world.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link GovernmentLogic} singleton at `/obj/api/government`, reached
 * synchronously via `StuffApi.singletonSync`; it reads the warmed
 * `GovernmentCatalogue`. `dest /obj/api/government` reloads it.
 */

import type { Stuff } from "../lib/stuff/Stuff";
import type { Container } from "../lib/spatial/Container";
import type {
  GovernmentDescriptor,
  GovernmentSeat,
} from "../obj/Government";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { GovernmentLogic } from "../obj/api/GovernmentLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from "./security";

export type { GovernmentDescriptor, GovernmentSeat };

/** One seat resolved to its current holder (assignee templatePath). */
export interface SeatView {
  seat: GovernmentSeat;
  /** The holder's templatePath, or `null` for a vacant seat. */
  holder: string | null;
}

const LOGIC_PATH = "/obj/api/government";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/GovernmentLogic", import.meta.url)
);

/** Resolve the HMR-able GovernmentLogic singleton (sync). */
function logic(): GovernmentLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "GovernmentLogic"
      ) as typeof GovernmentLogic | null) ?? GovernmentLogic)()
  );
}

export class GovernmentApi {
  /**
   * The most-local government at an address (the head of the chain), or
   * `null` when no covering Locality declares one. Sync — trie +
   * in-memory catalogue.
   */
  public static governmentAt(address: string): GovernmentDescriptor | null {
    return logic().governmentAt(address);
  }

  /**
   * The full jurisdiction chain at an address, most-local first (ward →
   * city → realm). Sync. `[]` off-grid.
   */
  public static governmentChainAt(address: string): GovernmentDescriptor[] {
    return logic().governmentChainAt(address);
  }

  /**
   * The jurisdiction chain over where `scope` is NOW — what binds a
   * visitor. Async (the full address resolve walk's zone step awaits).
   */
  public static async subjectTo(
    scope: Stuff & Container
  ): Promise<GovernmentDescriptor[]> {
    return logic().subjectTo(scope);
  }

  /**
   * The jurisdiction chain over the character's **domicile** — the
   * residency read (membership standing: the future franchise /
   * petition / services hook). Derived, never conferred; `[]` for the
   * undomiciled. Sync.
   */
  public static residentOf(character: Stuff): GovernmentDescriptor[] {
    return logic().residentOf(character);
  }

  /** The character's domicile address, or `null`. The residence seam's face. */
  public static domicileAddressOf(character: Stuff): string | null {
    return logic().domicileAddressOf(character);
  }

  /**
   * Whether `character` holds the named seat — the authority predicate
   * (the data-driven analogue of `requiresGovernor`). Resolves live
   * Employment records first, then the authored roster; an explicit
   * quit/fired record is never resurrected by the roster.
   */
  public static async holdsSeat(
    character: Stuff,
    governmentKey: string,
    seatKey: string
  ): Promise<boolean> {
    return logic().holdsSeat(character, governmentKey, seatKey);
  }

  /** The authored descriptor for government `key`, or `null`. */
  public static getGovernment(key: string): GovernmentDescriptor | null {
    return logic().getGovernment(key);
  }

  /** Every authored government descriptor. */
  public static listGovernments(): GovernmentDescriptor[] {
    return logic().listGovernments();
  }

  /** A government's seats, each resolved to its current holder. */
  public static async seatsOf(governmentKey: string): Promise<SeatView[]> {
    return logic().seatsOf(governmentKey);
  }
}

SecurityApi.decorateApiClass(GovernmentApi);
