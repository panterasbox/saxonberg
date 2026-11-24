/**
 * ⭐ The scaffold — where a wire drive stands (test-world-lifecycle D2, D8).
 *
 * The `test-fixtures` pack (`packages/content/test-fixtures/`) ships the
 * testbed, a small locality at `/world/testbed` that exists only for the wire
 * suite: drives stand in it instead of placeholder content like Terminus, so
 * a content rebuild never breaks a kernel drive. ⚠ TEST-ONLY: the pack is
 * `testOnly: true` and installs only in a test world
 * (`SAXONBERG_TEST_WORLD=1`); a live world refuses it.
 *
 * This file holds the template paths of everything the pack ships and the
 * exit words between its places — nothing else. Name a place through these
 * constants, never a literal, so a scaffold change is one edit.
 *
 * The map (all on the testbed zone, `cellSize` 4 m; z = 0 unless noted):
 *
 *            LOT (annex)        HALL (0,1)
 *                 \               | doors (open)
 *   BANK (-1,0) — PLAZA (0,0) — SHOP (1,0) ─cellar→ CELLAR (1,0,-1) — PASSAGE (2,0,-1)
 *               ╱ window          |                  (unlit, door      (unlit, trap)
 *   HUT (-1,-1) — APPROACH (0,-1) — YARD (1,-1) — SHAFT_HEAD (2,-1) ↓ SHAFT_FOOT (2,-1,-1)
 *                     | low door     (gate north to the shop: locked, no key)
 *                 WORKS (0,-2)
 */

import { Session, uniqueHandle, type SessionOptions } from "./session";

// ── the localities ─────────────────────────────────────────────────────────

/** The testbed's root extent (its zone, its title, its committee). */
export const TESTBED = "/world/testbed";
/** The second extent — the one title a drive may take; the purge hands it back. */
export const ANNEX = "/world/testbed/annex";
/** The Locality rows that claim the two addresses. */
export const TESTBED_LOCALITY = "/stuff/idea/Locality/testbed";
export const ANNEX_LOCALITY = "/stuff/idea/Locality/testbed-annex";
/** The addresses those Localities claim. */
export const TESTBED_ADDRESS = "testbed";
export const ANNEX_ADDRESS = "testbed/annex";

// ── the places ─────────────────────────────────────────────────────────────

/** Outdoor square, sky-lit. Noticeboard + the greeter. */
export const PLAZA = "/world/testbed/location/plaza";
/** Outdoor lane south of the plaza, sky-lit. */
export const APPROACH = "/world/testbed/location/approach";
/** Outdoor yard, sky-lit; its north gate is locked with no key anywhere. */
export const YARD = "/world/testbed/location/yard";
/** Enclosed hut lit through its window onto the plaza (no lamp). */
export const HUT = "/world/testbed/location/hut";
/** Lit forge room with a basin and a cistern, entered by a low door. */
export const WORKS = "/world/testbed/location/works";
/** Small sealed UNLIT room behind the locked cellar door. */
export const CELLAR = "/world/testbed/location/cellar";
/** UNLIT dead-end passage off the cellar, with a trap. */
export const PASSAGE = "/world/testbed/location/passage";
/** Top of the climbable drop, sky-lit. */
export const SHAFT_HEAD = "/world/testbed/location/shaft-head";
/** Bottom of the climbable drop, lamp-lit. */
export const SHAFT_FOOT = "/world/testbed/location/shaft-foot";
/** The annex's one place, sky-lit. */
export const LOT = "/world/testbed/annex/location/lot";

/** The named building over the bank, the hall and the shop. */
export const BUILDING = "/world/testbed/building/structure";
/** Lit bank with the teller counter. */
export const BANK = "/world/testbed/building/location/bank";
/** Lit venue hall: a shelf of three notebooks, a tablet, three chairs. */
export const HALL = "/world/testbed/building/location/hall";
/** Lit shopfront: the stock counter, a consignment shelf, a hearth. */
export const SHOP = "/world/testbed/building/location/shop";

// ── the exit words ─────────────────────────────────────────────────────────

export const EXITS = {
  plaza: {
    hall: "north",
    bank: "west",
    shop: "east",
    approach: "south",
    hut: "southwest",
    lot: "northwest",
  },
  approach: { plaza: "north", hut: "west", yard: "east", works: "south" },
  yard: { approach: "west", shop: "north", shaftHead: "east" },
  hut: { approach: "east", plaza: "northeast" },
  works: { approach: "north" },
  bank: { plaza: "east" },
  hall: { plaza: "south" },
  shop: { plaza: "west", yard: "south", cellar: "down" },
  cellar: { shop: "up", passage: "east" },
  passage: { cellar: "west" },
  shaftHead: { yard: "west", shaftFoot: "down" },
  shaftFoot: { shaftHead: "up" },
  lot: { plaza: "southeast" },
} as const;

// ── the things ─────────────────────────────────────────────────────────────

/** The independent bank's teller counter (`bank: testbed-bank`). */
export const BANK_COUNTER = "/world/testbed/thing/bank-counter";
/** The key the bank counter authors — the bank an account here is held at. */
export const TESTBED_BANK = "testbed-bank";
/** The shop's Stock counter: import lines of notebooks and rope at par. */
export const COUNTER = "/world/testbed/thing/counter";
/** The shop's consignment shelf. */
export const SHELF = "/world/testbed/thing/shelf";
/** The shop's hearth (laid, unlit). */
export const HEARTH = "/world/testbed/thing/hearth";
/** The cellar door: locked, keyway `testbed-cellar`, free from the cellar. */
export const CELLAR_DOOR = "/world/testbed/thing/cellar-door";
/** The yard gate: locked, keyway `testbed-gate`, no key anywhere. */
export const GATE = "/world/testbed/thing/gate";
/** The hall's double doors, standing open. */
export const HALL_DOORS = "/world/testbed/thing/hall-doors";
/** The hut's window onto the plaza (passes light and sight, never a body). */
export const HUT_WINDOW = "/world/testbed/thing/hut-window";
/** The hall's shelf (a Fitting) and the like things on it. */
export const HALL_SHELF = "/world/testbed/thing/hall-shelf";
export const NOTEBOOK = "/platform/thing/book";
export const ROPE = "/platform/thing/rope";
/** The hall's chairs (three of them). */
export const CHAIR = "/world/testbed/thing/chair";
/** The hall's staff tablet. */
export const TABLET = "/world/testbed/thing/tablet";
/** The hall's bank of lockers — a kept container in a plain room (persistence-model W1). */
export const LOCKERS = "/world/testbed/thing/lockers";
/** The plaza's noticeboard. */
export const JOB_BOARD = "/world/testbed/thing/job-board";
/** The lamp every lit interior props. */
export const LAMP = "/world/testbed/thing/lamp";
/** The works' forge, basin and cistern. */
export const FORGE = "/world/testbed/thing/forge";
export const BASIN = "/world/testbed/thing/basin";
export const CISTERN = "/world/testbed/thing/cistern";
/** The passage's trap. */
export const TRAP = "/world/testbed/thing/trap";
/** The shaft's ladder. */
export const LADDER = "/world/testbed/thing/ladder";

// ── the businesses and NPCs ────────────────────────────────────────────────

/** The bank's Business (positions `teller`, `officer`; chartered). */
export const BANK_BUSINESS = "/world/testbed/idea/bank-business";
/** The hall's Business, which keeps the shop too (`host`, `hand`, `attendant`). */
export const VENUE = "/world/testbed/idea/venue";

/** Rostered around the clock — always at post; never harm these. */
export const TELLER = "/world/testbed/agent/teller";
export const HOST = "/world/testbed/agent/host";
export const ATTENDANT = "/world/testbed/agent/attendant";
export const GREETER = "/world/testbed/agent/greeter";
/** Unrostered and placed nowhere: clone it to have an NPC to harm. */
export const STAND_IN = "/world/testbed/agent/stand-in";
/** The venue's day clerk at the shop counter, on shift 08:00–18:00 (persistence-model W0). */
export const CLERK = "/world/testbed/agent/clerk";
/** A stray cat in the plaza — a kept animal once it has followed somebody (persistence-model W0). */
export const CAT = "/world/testbed/agent/cat";

// ── staging (W4, plan D3) ──────────────────────────────────────────────────
//
// ⭐ What a drive CONSUMES, it makes — whatever the world already holds.
// Each helper leaves one state and is named for it; none adds a server
// route (they compose the verbs and the existing test seams).

/**
 * Log a fresh test character in at a scaffold place: `Session.open` with a
 * unique `wire-<prefix>-…` handle and `startLocation: place`. A migrated drive
 * stands in the testbed this way, never by the world's default landing.
 */
export async function standIn(
  place: string,
  prefix: string,
  opts: Omit<SessionOptions, "startLocation"> = {},
): Promise<Session> {
  return Session.open(uniqueHandle(prefix), { startLocation: place, ...opts });
}

/** The office `reserve override` asks for (`requiresGovernor`). */
const GOVERNOR = "central-bank-governor";

/**
 * ⭐ Leave `handle` holding an account at the testbed bank with `minor` in it.
 *
 * ⚠ What it does, in the world: logs the character in at the bank and runs
 * `bank open`; opens a fresh `wire-gov` session seated as the central bank's
 * governor (the `offices:` login option MOVES that seat), which runs the
 * recorded `reserve override <minor> to <handle> "<why>"`; then `founder`
 * vacates the seat back to the founder default, so no later drive finds it
 * moved. The minted money is retired again by the run's purge. Both sessions
 * are closed; the caller opens its own wherever it needs (a login re-homes an
 * existing character to its `startLocation`).
 *
 * @throws when the bank or the reserve refuses — their own words.
 */
export async function fundedAccount(handle: string, minor: number, why = "wire staging"): Promise<void> {
  const holder = await Session.open(handle, { startLocation: BANK });
  try {
    const opened = await (await holder.cmd("bank open")).said();
    if (!/account/i.test(opened)) throw new Error(`fundedAccount: bank open said ${JSON.stringify(opened)}`);
    const gov = await Session.open(uniqueHandle("gov"), { startLocation: BANK, offices: [GOVERNOR] });
    try {
      const minted = await (await gov.cmd(`reserve override ${minor} to ${handle} "${why}"`)).said();
      if (!/mints/i.test(minted)) throw new Error(`fundedAccount: the override said ${JSON.stringify(minted)}`);
    } finally {
      gov.close();
    }
  } finally {
    holder.close();
    const founder = await Session.open("founder", { startLocation: BANK });
    try {
      await founder.cmd(`office vacate ${GOVERNOR}`);
    } finally {
      founder.close();
    }
  }
}

/**
 * ⭐ An NPC a drive may harm: `clone` the unrostered stand-in into the
 * session's room. The session must hold the testbed committee seat
 * (`committees: [TESTBED]`), which `clone` checks. Returns the clone's id
 * (`#<id>` addresses it). The scaffold's rostered NPCs are never harmed; the
 * purge destructs the clone at the run's end.
 */
export async function standInNpc(s: Session): Promise<string> {
  const said = await (await s.cmd(`clone ${STAND_IN} --here`)).said();
  const id = /→ [^(]*\(([^)]+)\)/.exec(said)?.[1];
  if (!id) throw new Error(`standInNpc: clone said ${JSON.stringify(said)}`);
  return id;
}
