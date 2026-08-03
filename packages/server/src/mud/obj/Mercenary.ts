/**
 * Mercenary — a hireable NPC that can belong to a party.
 *
 * `PartyMemberMixin` rides on Avatars (players) and on this one NPC class,
 * never on the base `Character`/`NPC` — so a plain townsperson or beast
 * stays party-less (and `solo` in combat) while a mercenary can be hired
 * into a player's party and fight on their side. Combat resolves a merc's
 * alignment through the same `PartyApi.sideOf` chain as a player: its
 * `activePartyPath` → the party's `combatSide`.
 *
 * The name deliberately differs from the mixin (the `Business →
 * BusinessEntity` no-merge convention). Cast templates set
 * `class: /lib/party/Mercenary` and drive behavior as data via
 * `behaviors:` (the `combatant` brain fights; the `arms` brain wields);
 * no per-mercenary subclass is needed.
 */

import { NPC } from "../lib/npc/NPC";
import { PartyMemberMixin } from "../lib/party/PartyMember";

export class Mercenary extends PartyMemberMixin(NPC) {}

export default Mercenary;
