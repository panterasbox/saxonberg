/**
 * Fast-travel cascade + lounge seating — integration over the in-memory
 * lounge domain store. Proves: resolving the eager root terminal (the
 * boot-manifest sim) stands the lounge host up and self-seats the node into
 * it (FixtureMixin → `seatIn` → the lounge Warren); and its `postRegister`
 * cascade brings the rest of the network live from that one seed — with no
 * registry and no manual loading.
 *
 * ⭐ **This is also P6's proof** (TPA reform). The lounge used to carry a
 * `LoungeTerminal` subclass whose only job was two overrides: a board
 * label, and a `getArrivalRoom()` that returned the Warren host. The
 * second was already redundant — `seatIn` makes `FixtureMixin.seatSelf`
 * move the terminal INTO the live host, so the generic
 * `getContainer()` returns the same object — and the row now names the
 * generic `/system/tpa/thing/TpaTerminal` with an authored `boardLabel`.
 * The arrival-room test below is what says so, and it was written
 * BEFORE the subclass was deleted, not after.
 *
 * It stays a KERNEL test because its subject is the lounge: the Warren,
 * its elastic host, and host migration are all `world/lounge/`'s. The
 * terminal enters by template-path string, so nothing here imports the
 * pack.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import LoungeWarren from "../idea/LoungeWarren";
import { LoungePaths } from "../paths";
import Avatar from "../../../platform/agent/Avatar";
import { fileURLToPath } from "url";
import { StuffApi } from "../../../api/stuff";
import { ModuleApi } from "../../../api/module";
import { MixinApi } from "../../../api/mixin";

/**
 * The tpa pack's mixin name. A kernel test cannot import the pack, and
 * does not need to: `MixinApi.isActive` narrows on the marker string,
 * and the node's own surface is structural.
 */
const FAST_TRAVEL_MIXIN = "FastTravelMixin";

/** Just enough of the node's surface for this suite. */
interface FastTravel {
  getDirectionality(): string;
  getArrivalRoom(): Promise<Stuff & Container>;
  getDestinationLabel(): Promise<string>;
}
import { AppSettings } from "../../../lib/config/AppSettings";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type { Container } from "../../../lib/spatial/Container";

import { makeStuff } from "../../../lib/security/__tests__/test-setup";
import {
  installStore,
  loungeDocs,
  flush,
  type Doc,
} from "./lounge-fixtures";
import PersistentHydrator from "../../../platform/idea/persistence/PersistentHydrator";

const PH = PersistentHydrator.templatePath;

/**
 * The tpa pack's `src/`, so `StuffApi.resolveClassFile` can find
 * `/system/tpa/thing/TpaTerminal` — the same registration a pack test
 * makes for a sibling pack (`ModuleApi.registerPackSource`). The lounge's
 * terminal row names the pack's class; this test drives the lounge, not
 * the pack, so the class arrives by path and nothing is imported.
 */
const TPA_SRC = fileURLToPath(
  new URL("../../../../../../content/tpa/src", import.meta.url),
);
// Repointed: the lounge routes to the Terminus arrival gate (the standalone
// University Avenue terminal is retired — Phase 6).
const TERMINUS_TERMINAL = "/world/terminus/terminal/thing/arrival-terminal";
const TERMINUS_ROOM = "/world/terminus/terminal/location/arrival-gate";

const fastTravelDocs: Doc[] = [
  {
    path: LoungePaths.terminal,
    class: "/system/tpa/thing/TpaTerminal",
    hydratorClass: PH,
    data: {
      seatIn: LoungeWarren.WARREN_PATH,
      shortDescription: "a Teleport Authority terminal",
      boardLabel: "The Lounge",
      keywords: ["lounge"],
      directionality: "both",
      routes: [{ to: TERMINUS_TERMINAL }],
    },
  },
  {
    path: TERMINUS_TERMINAL,
    class: "/system/tpa/thing/TpaTerminal",
    hydratorClass: PH,
    data: {
      seatIn: TERMINUS_ROOM,
      shortDescription: "a Teleport Authority terminal",
      keywords: ["terminus"],
      directionality: "both",
      routes: [{ to: LoungePaths.terminal }],
    },
  },
  {
    path: TERMINUS_ROOM,
    class: "/platform/location/VoidLocation",
    hydratorClass: PH,
    data: { shortDescription: "the Terminus arrival gate" },
  },
];

async function land(): Promise<Avatar> {
  const avatar = makeStuff(() => new Avatar());
  await (
    avatar as unknown as { applyStartLocation(r: string): Promise<void> }
  ).applyStartLocation(LoungeWarren.WARREN_PATH);
  return avatar;
}

// Boot-manifest sim: resolving the eager root terminal runs its postRegister
// — self-seat into the lounge Warren's host (standing the host up) plus the
// network cascade.
async function bootNetwork(): Promise<Stuff & FastTravel> {
  return StuffApi.singleton<Stuff & FastTravel>(LoungePaths.terminal);
}

function hostOf(avatar: Avatar): Stuff & Container {
  return (
    avatar as unknown as { getContainer(): Stuff & Container }
  ).getContainer();
}

describe("fast-travel cascade + lounge seating", () => {
  beforeEach(async () => {
    StuffApi.clearAll();
    ModuleApi.registerPackSource(TPA_SRC, "/system/tpa");
    installStore(loungeDocs(fastTravelDocs));
    // Warm an (empty) AppSettings cache so a host destruct's content-
    // evacuation lookup (`evacuationFallback`) resolves rather than throwing
    // — the migration test force-destroys a host that holds the terminal.
    await AppSettings.warm();
  });
  afterEach(() => {
    AppSettings._resetForTesting();
    vi.restoreAllMocks();
  });

  it("seats the lounge node in the host and cascades the network live", async () => {
    await bootNetwork();
    const avatar = await land();
    await flush();

    const host = hostOf(avatar);
    expect(host).toBeTruthy();

    const node = host
      .getContents()
      .find((s) => MixinApi.isActive(s, FAST_TRAVEL_MIXIN)) as unknown as
      | (Stuff & FastTravel)
      | undefined;
    expect(node).toBeTruthy();
    expect(node!.getDirectionality()).toBe("both");

    // The cascade loaded the rest of the network from that one seated node.
    expect(StuffApi.findByTemplatePath(TERMINUS_TERMINAL)).toBeTruthy();
    expect(StuffApi.findByTemplatePath(TERMINUS_ROOM)).toBeTruthy();
  });

  // ⭐ P6: the ONE thing `LoungeTerminal.getArrivalRoom()` existed for.
  // `seatIn` puts the terminal INSIDE the Warren host, so the generic
  // `getContainer()` already answers it — which is why the subclass could
  // be deleted rather than moved into the pack.
  it("the lounge node arrival room resolves to the live warren host", async () => {
    await bootNetwork();
    const avatar = await land();
    await flush();
    const host = hostOf(avatar);
    const node = host
      .getContents()
      .find((s) => MixinApi.isActive(s, FAST_TRAVEL_MIXIN)) as unknown as Stuff &
      FastTravel;
    const arrival = await node.getArrivalRoom();
    expect(arrival).toBe(host);

    // ⭐ P6's other half: the board label the subclass used to hard-code
    // is now an authored field. The Warren host carries no stable
    // address, so the covering-Locality walk cannot produce "The
    // Lounge" — `boardLabel` says it instead.
    expect(await node.getDestinationLabel()).toBe("The Lounge");
  });

  it("re-seats the lounge node into the new host after host migration", async () => {
    await bootNetwork();
    const warren = await StuffApi.singleton<LoungeWarren>(
      LoungeWarren.WARREN_PATH,
    );
    const host1 = await warren.getHost();
    const terminal1 = host1
      .getContents()
      .find((s) => MixinApi.isActive(s, FAST_TRAVEL_MIXIN)) as Stuff;
    expect(terminal1).toBeTruthy();

    // A survivor satellite so the host ROLE migrates (rather than the graph
    // standing up empty), then force-destroy the host.
    await (
      warren as unknown as { spawnMember(): Promise<Stuff & Container> }
    ).spawnMember();
    StuffApi.destruct(host1 as unknown as Stuff);
    expect((host1 as Stuff).isDestroyed()).toBe(true);

    // Next host resolution migrates to the survivor and re-seats the fixture.
    const host2 = await warren.getHost();
    await flush();
    expect(host2).not.toBe(host1);

    // The terminal followed the host: it's seated in the new host, and there
    // is still exactly one across the store.
    const node2 = host2.getContents().find((s) => MixinApi.isActive(s, FAST_TRAVEL_MIXIN));
    expect(node2).toBeTruthy();
    expect(StuffApi.findAllByTemplatePath(LoungePaths.terminal)).toHaveLength(
      1,
    );
  });
});
