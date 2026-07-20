/**
 * PartyLogic / PartyApi — the party operational core, driven through the
 * real gated `PartyApi`. A party is a first-class Idea in the graph
 * (resolved by templatePath, no central registry); ad-hoc parties (never
 * persisted) let the whole lifecycle + the combat seam be exercised
 * without Mongo. Durable persistence + muster is validated by the live
 * demo.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  makeStuff,
  stampTemplatePathForTest,
} from "../../../lib/security/__tests__/test-setup";
import { Idea } from "../../../lib/stuff/Idea";
import { StuffApi } from "../../../api/stuff";
import { PartyApi } from "../../../api/party";
import { ChatApi } from "../../../api/chat";
import { PartyMemberMixin } from "../../../lib/party/PartyMember";
import { Party } from "../../../lib/party/Party";
import type { Stuff } from "../../../lib/stuff/Stuff";

class TestMember extends PartyMemberMixin(Idea) {}

let seq = 0;

function member(): TestMember {
  const m = makeStuff(() => new TestMember());
  stampTemplatePathForTest(m, `/test/member-${seq++}`);
  return m;
}

/** An ad-hoc Party seeded through the real Api surface (`form` swallows
 * the mocked channel mint), with `captain` as captain + active. The
 * party's mutation surface is participant/subsystem-gated now, so the
 * test drives the same path production does. */
async function seedParty(captain: TestMember, side = ""): Promise<Party> {
  const res = await PartyApi.form(captain as Stuff, `party-${seq++}`, false);
  if (!res.ok) throw new Error(`seedParty: ${res.reason}`);
  if (side) await PartyApi.setSide(captain as Stuff, side);
  return res.party;
}

/** Grow a seeded party by one member via the no-handshake hire path. */
async function seedJoin(captain: TestMember, joiner: TestMember): Promise<void> {
  const res = await PartyApi.enlist(captain as Stuff, joiner as Stuff);
  if (!res.ok) throw new Error(`seedJoin: ${res.reason}`);
}

beforeEach(() => {
  StuffApi.clearAll();
  // Party chat is out of scope for the unit test — make form's channel
  // mint a fast, swallowed no-op.
  vi.spyOn(ChatApi, "createBoundChannel").mockRejectedValue(
    new Error("no chat in unit test"),
  );
});

describe("PartyApi — the combat seam (sideOf / areAllied)", () => {
  it("members of one party share a side; distinct solos never ally", async () => {
    const cap = member();
    const other = member();
    const party = await seedParty(cap);
    await seedJoin(cap, other);

    // Two members of the same party.
    expect(PartyApi.areAllied(cap as Stuff, other as Stuff)).toBe(true);
    expect(PartyApi.sideOf(cap as Stuff)).toBe(party.getCombatSide());

    // A partyless solo vs a party member.
    const loner = member();
    expect(PartyApi.sideOf(loner as Stuff)).toMatch(/^solo:/);
    expect(PartyApi.areAllied(cap as Stuff, loner as Stuff)).toBe(false);

    // Two distinct solos are their own sides.
    const loner2 = member();
    expect(PartyApi.areAllied(loner as Stuff, loner2 as Stuff)).toBe(false);
  });

  it("two parties pointed at the same combatSide are allied", async () => {
    const capA = member();
    const capB = member();
    await seedParty(capA, "faction:red");
    await seedParty(capB, "faction:red");
    expect(PartyApi.areAllied(capA as Stuff, capB as Stuff)).toBe(true);
  });
});

describe("PartyApi — lifecycle", () => {
  it("invite + accept grows the roster and sets the active pointer", async () => {
    const cap = member();
    const joiner = member();
    const party = await seedParty(cap);

    const inv = await PartyApi.invite(cap as Stuff, joiner as Stuff);
    expect(inv.ok).toBe(true);
    const acc = await PartyApi.accept(joiner as Stuff);
    expect(acc.ok).toBe(true);
    expect(party.isMember(joiner.getTemplatePath()!)).toBe(true);
    expect(joiner.getActivePartyPath()).toBe(party.getTemplatePath());
    expect(PartyApi.areAllied(cap as Stuff, joiner as Stuff)).toBe(true);
  });

  it("rejects a second active party (one-active-party)", async () => {
    const cap = member();
    await seedParty(cap);
    const res = await PartyApi.form(cap as Stuff, "Second", false);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("already-in-a-party");
  });

  it("only the captain can invite", async () => {
    const cap = member();
    const grunt = member();
    await seedParty(cap);
    await seedJoin(cap, grunt);

    const outsider = member();
    const res = await PartyApi.invite(grunt as Stuff, outsider as Stuff);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not-the-captain");
  });

  it("captain leaving promotes an heir; last member out disbands ad-hoc", async () => {
    const cap = member();
    const heir = member();
    const party = await seedParty(cap);
    const path = party.getTemplatePath()!;
    await seedJoin(cap, heir);

    // Captain leaves → heir promoted.
    await PartyApi.leave(cap as Stuff);
    expect(party.getCaptainId()).toBe(heir.getTemplatePath());
    expect(party.isMember(cap.getTemplatePath()!)).toBe(false);
    expect(cap.getActivePartyPath()).toBe("");

    // Heir leaves → empty ad-hoc party is destructed from the graph.
    await PartyApi.leave(heir as Stuff);
    expect(StuffApi.findByTemplatePath(path)).toBeUndefined();
  });

  it("forms an ad-hoc party as an Idea in the graph, founder active + captain", async () => {
    const founder = member();
    const res = await PartyApi.form(founder as Stuff, "Vanguard", false);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const path = res.party.getTemplatePath()!;
      expect(res.party.isCaptain(founder.getTemplatePath()!)).toBe(true);
      expect(founder.getActivePartyPath()).toBe(path);
      expect(res.party.isDurable()).toBe(false);
      // The party is a live Idea, resolvable through the Stuff graph.
      expect(StuffApi.findByTemplatePath(path)).toBe(res.party);
    }
  });
});
