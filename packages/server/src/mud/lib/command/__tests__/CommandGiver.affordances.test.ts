/**
 * The affordance walk over the ONE record of verb affordances: `static
 * commandContributions` on a class and every mixin in its chain.
 *
 * ⭐ These cases used to prove the same behaviours through a second,
 * per-instance record (an `InstanceContributor` hook the walk consulted
 * at containment-delta time, fed by an authored `capabilities[].verbs`
 * list on the row). That record is gone: two ways to hang a verb on an
 * object meant an author had no rule for picking, and the verbs a thing
 * affords could vary with data the client cannot see. A verb an object
 * affords is now a property of what the object IS.
 *
 * What the buckets carry — and this is the whole of what `placement:
 * reachable | carried` used to say, in the vocabulary the statics
 * already had:
 *
 *   - `environment` — OUTWARD, to whoever carries the thing;
 *   - `peers`       — SIDEWAYS, to everyone sharing the room with it.
 *
 * So a tool declaring both is reachable (carried or on the floor); one
 * declaring only `environment` is personal capital — your own whetstone,
 * anywhere, and nothing from a stone across the room.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { makeStuff } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { CommandGiverMixin } from "../CommandGiver";
import { ToolMixin } from "../../craft/Tooled";
import { MobileMixin } from "../../spatial/Mobile";
import { PosedMixin } from "../../character/Posed";
import { FoldableMixin } from "../../slot/Foldable";
import { HasInteractiveMixin } from "../../connection/HasInteractive";
import { DrivableMixin } from "../../slot/Drivable";
import { SlottedMixin } from "../../slot/Slotted";
import { DurableMixin } from "../../material/Durable";
import { ContainmentApi } from "../../../api/containment";
import { CommandApi, type CommandContributions } from "../../../api/command";
import { StuffApi } from "../../../api/stuff";

const MENDING = [
  "platform/cmd/crafting/repair.yaml",
  "platform/cmd/crafting/salvage.yaml",
];

class Room extends ContainerMixin(Idea) {}
/** A container you can also carry — a satchel. */
class Pack extends ContainerMixin(ContainableMixin(Idea)) {}
class ToolBase extends ToolMixin(DurableMixin(ContainableMixin(Idea))) {}

/** Reachable: declares both buckets. */
class MendingTool extends ToolBase {
  static commandContributions: CommandContributions = {
    environment: MENDING,
    peers: MENDING,
  };
}

/** Personal capital: `environment` only. */
class Whetstone extends ToolBase {
  static commandContributions: CommandContributions = {
    environment: ["trade/smithing/cmd/crafting/sharpen.yaml"],
  };
}

class Player extends ContainerMixin(
  CommandGiverMixin(ContainableMixin(Idea)),
) {}

/**
 * ⭐⭐ The mixins the reachability sweep made confer, each with the verbs
 * it is now responsible for. One actor composing all of them is the
 * cheapest honest assertion that the walk SEES the new statics — a
 * literal in a source file is what `lint:reachability` reads, and this
 * is what proves the runtime agrees with it.
 */
class Walker extends ContainerMixin(
  PosedMixin(MobileMixin(CommandGiverMixin(ContainableMixin(Idea)))),
) {}

/** A thing that folds, and a thing that drives. */
class CampChair extends FoldableMixin(ContainableMixin(Idea)) {}
class Cart extends DrivableMixin(SlottedMixin(ContainableMixin(Idea))) {}

/** Anything with a human on the other side. */
class Connected extends HasInteractiveMixin(CommandGiverMixin(Idea)) {}

function affords(player: Player, verb: string): boolean {
  return player.getAvailableCommands().some((c) => c.verbs.includes(verb));
}

beforeAll(() => {
  // The contributions reference these views — ensure they resolve.
  CommandApi.getCommand("platform/cmd/crafting/repair.yaml");
  CommandApi.getCommand("trade/smithing/cmd/crafting/sharpen.yaml");
});

/**
 * ⭐⭐⭐ The nine verbs the reachability sweep conferred, asserted through
 * the affordance WALK rather than through the census that found them.
 *
 * Every one of these shipped with a view, a controller and (where it has
 * one) an arg gate, and was named by no static anywhere — so it answered
 * *"I don't understand"* for every player alive. ⚠⚠ A controller test
 * cannot see that: it is handed a pre-built model, so it passes happily
 * over a verb the game does not have. These are the assertions that can
 * fail.
 */
describe("the verbs the reachability sweep conferred", () => {
  const affordsOn = (giver: { getAvailableCommands(): Array<{ verbs: string[] }> }, verb: string) =>
    giver.getAvailableCommands().some((c) => c.verbs.includes(verb));

  it("⭐ `walk` — the third ground pace — is MobileMixin's, beside run and sneak", () => {
    const walker = makeStuff(() => new Walker());
    expect(affordsOn(walker, "walk")).toBe(true);
    // The two that always worked, as the control.
    expect(affordsOn(walker, "run")).toBe(true);
    expect(affordsOn(walker, "sneak")).toBe(true);
  });

  it("⭐ `dismount` is PosedMixin's — the state is the RIDER's", () => {
    const walker = makeStuff(() => new Walker());
    expect(affordsOn(walker, "dismount")).toBe(true);
    // Beside the four posture verbs it belongs with.
    expect(affordsOn(walker, "stand")).toBe(true);
  });

  it("⭐ `fold`/`unfold` come from the foldable THING, carried or in the room", () => {
    const room = makeStuff(() => new Room());
    const walker = makeStuff(() => new Walker());
    const chair = makeStuff(() => new CampChair());
    ContainmentApi.move(walker, room);
    expect(affordsOn(walker, "fold")).toBe(false);

    ContainmentApi.move(chair, room);
    expect(affordsOn(walker, "fold")).toBe(true);
    expect(affordsOn(walker, "unfold")).toBe(true);
  });

  it("⭐⭐ `drive` IS conferred — and only when a vehicle is beside you", () => {
    // ⚠⚠ This assertion used to be its own INVERSE, and the reversal is
    // the record of an adjudication rather than a change of mind. The
    // reachability sweep conferred `drive`, the full suite refused it
    // (`trade-mining`'s acts test asserts `lib/slot/Drivable.ts` carries
    // no contributions, because its own `drive.yaml` claimed the word
    // with the same arity, so only affordance ORDER would have decided
    // which one a miner got), and the sweep reverted — correctly:
    // conferring one side of an undiagnosed collision IS adjudicating
    // it, and first-come is not one of the ladder's seven solutions.
    //
    // ⭐ The lock build then ran the ladder properly
    // (`command-spec.md § When both are bodily acts`), rungs 2 and 3
    // agreeing: the vehicle is the generative primitive — `DrivableMixin`
    // is kernel substrate that every coach, cart and barge extends,
    // while cutting a heading is one trade's gesture — and "drive" is
    // what a layman says about a vehicle, while *to drift* is real mining
    // usage rather than jargon reached for to sound authentic. Mining's
    // view is `verbs: [drift]` now.
    const room = makeStuff(() => new Room());
    const walker = makeStuff(() => new Walker());
    const cart = makeStuff(() => new Cart());
    ContainmentApi.move(walker, room);

    // ⭐⭐ `environment` + `peers`, never `self` — so the verb exists only
    // while something drivable does. **This half is the point**: a
    // target-conferred verb is correctly unsayable in an empty room, and
    // the lock build's drive learned it the hard way by typing `drive`
    // in the lounge and failing.
    expect(
      affordsOn(walker, "drive"),
      "with no vehicle present, `drive` must not be afforded",
    ).toBe(false);

    ContainmentApi.move(cart, room);
    expect(
      affordsOn(walker, "drive"),
      "a drivable vehicle beside you lights up `drive`",
    ).toBe(true);
  });

  it("⭐ `prompt` is HasInteractiveMixin's — a prompt is a CONNECTION's", () => {
    const connected = makeStuff(() => new Connected());
    expect(affordsOn(connected, "prompt")).toBe(true);
    // And a body with no human behind it does not get it.
    const walker = makeStuff(() => new Walker());
    expect(affordsOn(walker, "prompt")).toBe(false);
  });
});

beforeEach(() => {
  StuffApi.clearAll();
});

describe("verb affordances come from class statics, and only from there", () => {
  it("a reachable tool confers its verbs carried AND from the floor", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const kit = makeStuff(() => new MendingTool());
    ContainmentApi.move(player, room);

    expect(affords(player, "repair")).toBe(false);
    ContainmentApi.move(kit, player);
    expect(affords(player, "repair")).toBe(true);
    expect(affords(player, "salvage")).toBe(true);

    // Dropped: it declares `peers` too, so the floor still affords it.
    ContainmentApi.move(kit, room);
    expect(affords(player, "repair")).toBe(true);
  });

  it("an environment-only tool never lights up from the room", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const stone = makeStuff(() => new Whetstone());
    ContainmentApi.move(player, room);
    ContainmentApi.move(stone, room);

    expect(affords(player, "sharpen")).toBe(false); // present ≠ carried
    ContainmentApi.move(stone, player);
    expect(affords(player, "sharpen")).toBe(true); // carried
    ContainmentApi.move(stone, room);
    expect(affords(player, "sharpen")).toBe(false); // dropped → gone
  });

  // ⭐⭐ **A lamp in your hand is not your sibling.** `BurnerMixin`
  // declared its verbs under `peers` only, which is the whole story for
  // a forge, an oven and a kiln — none of them is ever picked up, and a
  // furnace standing in a room IS your sibling. The envelope build gave
  // a carriable light the same mixin, and `ignite`/`douse` would have
  // died at the affordance link the moment it left the floor: `light
  // lantern` answering "you don't see any 'lantern' here" with the
  // lamp in the player's hand, while every controller test stayed
  // green, because a controller test never runs the binder.
  //
  // ⚠ The tell to remember: **you are your lamp's CONTAINER, not its
  // peer**, so only `environment` reaches you. `ChargedMixin` (the mana
  // wand you hold) has declared both buckets since it shipped.
  it("⭐ a FURNACE affords ignite/douse both carried and from the floor", async () => {
    const { BurnerMixin } = await import("../../fire/Burner");
    class Lantern extends BurnerMixin(ContainableMixin(Idea)) {}
    CommandApi.getCommand("platform/cmd/device/ignite.yaml");

    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const lantern = makeStuff(() => new Lantern());
    ContainmentApi.move(player, room);

    // On the floor beside you: a peer, which is how a forge works.
    ContainmentApi.move(lantern as never, room);
    expect(affords(player, "ignite")).toBe(true);
    expect(affords(player, "douse")).toBe(true);

    // ⭐ And in your hand, which is what `peers` alone could not do.
    ContainmentApi.move(lantern as never, player);
    expect(affords(player, "ignite")).toBe(true);
    expect(affords(player, "douse")).toBe(true);
  });

  // ⭐⭐ **You keep what you carry.** A move calls
  // `resetCommandSources`, which drops every `environment` and `peers`
  // entry, and the re-push afterwards reached only the DESTINATION's
  // ancestor chain — never the mover itself. So a mover lost the verbs
  // its own inventory confers and did not get them back until something
  // in its pack moved again.
  //
  // In play: pick up your whetstone and `sharpen` works; walk one room
  // and it is gone. A live drive found it as every trade hand's `wallet
  // use house` failing with `unknown-verb` — the consigns beat teleports
  // to the counter and THEN trades as the house, so the card in its
  // pocket had just been forgotten. Thirty failures in one boot, every
  // hand, after all ten cards had been dealt.
  it("a carried tool keeps affording after its holder walks to another room", () => {
    const a = makeStuff(() => new Room());
    const b = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    ContainmentApi.move(player, a);
    const kit = makeStuff(() => new MendingTool());
    ContainmentApi.move(kit, player);
    expect(affords(player, "repair")).toBe(true);

    ContainmentApi.move(player, b);
    expect(affords(player, "repair")).toBe(true);
  });

  it("and a tool deep in a pack survives the walk too", () => {
    const a = makeStuff(() => new Room());
    const b = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    ContainmentApi.move(player, a);
    const pack = makeStuff(() => new Pack());
    ContainmentApi.move(pack, player);
    const kit = makeStuff(() => new MendingTool());
    ContainmentApi.move(kit, pack);
    expect(affords(player, "repair")).toBe(true);

    ContainmentApi.move(player, b);
    expect(affords(player, "repair")).toBe(true);
  });

  it("two rows over one class afford identically — a row cannot vary verbs", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    // The sewing kit and the sewing machine differ in rate and control,
    // which is row data; they cannot differ in what they afford, which
    // is the point of a single class-level record.
    const kitLike = makeStuff(() => new MendingTool());
    kitLike.setCapabilities([{ kind: "mending" }]);
    const machineLike = makeStuff(() => new MendingTool());
    machineLike.setCapabilities([
      { kind: "mending", rate: 3, control: "fine" },
    ]);
    ContainmentApi.move(player, room);

    ContainmentApi.move(kitLike, player);
    expect(affords(player, "repair")).toBe(true);
    ContainmentApi.move(kitLike, null);

    ContainmentApi.move(machineLike, player);
    expect(affords(player, "repair")).toBe(true);
  });
});
