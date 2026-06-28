/**
 * Tabs — the smallest credit primitive. Covers:
 *   - recognition-gated: a patron the house recognizes may run a tab; a
 *     stranger may not;
 *   - accrue → settle: charges accrue, then the tab clears (paid to the
 *     venue account);
 *   - skip → consequence: a RegardApi regard hit from the creditor + the
 *     tab privilege revoked (not prevented — priced).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Money } from "../../../api/banking";
import { TabMixin, TAB_SKIP_REGARD_PENALTY } from "../Tab";
import { RecognitionApi } from "../../../api/recognition";
import { RegardApi } from "../../../api/regard";
import { BeliefStoreMixin } from "../../belief/BeliefStore";
import { Idea } from "../../stuff/Idea";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "./banking-test-harness";

/** The venue: a TabMixin host (the bar, modeled minimally). */
class TabVenue extends TabMixin(Idea) {
  static _mixinName = "TabVenue";
}
/** The bartender / patron: a belief-holder so recognition + regard work. */
class Person extends BeliefStoreMixin(Idea) {
  static _mixinName = "Person";
}

const PATRON = "/obj/Avatar/patron";
const STRANGER = "/obj/Avatar/stranger";

describe("TabMixin", () => {
  beforeEach(() => installBankingHarness());
  afterEach(() => teardownBankingHarness());

  it("is recognition-gated: known patron yes, stranger no", () => {
    const venue = makeStuff(() => new TabVenue());
    const bartender = makeStuff(() => new Person());
    const patron = makeStuffAtPath(() => new Person(), PATRON);
    const stranger = makeStuffAtPath(() => new Person(), STRANGER);

    // the bartender knows the patron (recognition), not the stranger
    RecognitionApi.learnIdentity(bartender, patron, "Reg");

    expect(venue.canRunTab(patron, bartender)).toBe(true);
    expect(venue.canRunTab(stranger, bartender)).toBe(false);
  });

  it("accrues charges then settles to the venue account", async () => {
    const venue = makeStuff(() => new TabVenue());
    venue.accrueToTab(PATRON, Money.of(12));
    venue.accrueToTab(PATRON, Money.of(8));
    expect(venue.getTabBalance(PATRON).minor).toBe(20);

    const owed = venue.clearTab(PATRON);
    expect(owed.minor).toBe(20);
    expect(venue.getTabBalance(PATRON).minor).toBe(0);
  });

  it("skipping a tab costs regard and revokes the privilege", () => {
    const venue = makeStuff(() => new TabVenue());
    const bartender = makeStuff(() => new Person());
    const patron = makeStuffAtPath(() => new Person(), PATRON);
    RecognitionApi.learnIdentity(bartender, patron, "Reg");
    venue.accrueToTab(PATRON, Money.of(30));

    expect(venue.canRunTab(patron, bartender)).toBe(true);
    expect(RegardApi.getRegard(bartender, patron)).toBe(0);

    venue.skipTab(patron, bartender);

    // priced: a regard hit from the creditor + the privilege revoked
    expect(RegardApi.getRegard(bartender, patron)).toBe(-TAB_SKIP_REGARD_PENALTY);
    expect(venue.isTabRevoked(PATRON)).toBe(true);
    expect(venue.canRunTab(patron, bartender)).toBe(false);
    // the unpaid balance stays on the books
    expect(venue.getTabBalance(PATRON).minor).toBe(30);

    // re-extending credit restores the privilege
    venue.grantTab(PATRON);
    expect(venue.canRunTab(patron, bartender)).toBe(true);
  });
});
