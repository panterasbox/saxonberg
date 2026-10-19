/**
 * ⭐ Every place but the void has coordinates (the place taxonomy,
 * cleanliness B53). A place a warren MINTS takes the cell its wiring says
 * it is in — `Location.plotBesideNeighbour` — and a door between a
 * holding's own frame and the grid outside it may be named.
 */
import "../../../../test-bootstrap";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import Location from "../Location";
import CartesianZone from "../../../platform/idea/location/CartesianZone";
import { Stuff } from "../../stuff/Stuff";
import { StuffApi } from "../../../api/stuff";
import {
  makeStuff,
  seedKernelContentStore,
} from "../../security/__tests__/test-setup";

describe("Location.plotBesideNeighbour", () => {
  beforeEach(() => seedKernelContentStore());
  afterEach(() => {
    StuffApi.clearAll();
    vi.restoreAllMocks();
  });

  async function lobbyAndCorridor() {
    const zone = makeStuff(() => new CartesianZone());
    const lobby = makeStuff(() => new Location());
    zone.addLocation(lobby, 0, 1, 0);
    const corridor = makeStuff(() => new Location());
    Stuff._stampZone(corridor, zone);
    await corridor.addBidirectionalExit(lobby, "down", {
      opposite: "up",
      keepLiveDestination: true,
    });
    return { zone, lobby, corridor };
  }

  it("takes the cell one step from the neighbour it was wired to", async () => {
    const { zone, corridor } = await lobbyAndCorridor();
    expect(corridor.plotBesideNeighbour()).toBe(true);
    // `down` to a lobby at (0,1,0) puts the corridor above it.
    expect(corridor.getCoordinates()).toEqual([0, 1, 1]);
    expect(zone.hasRoomAt(0, 1, 1, corridor)).toBe(true);
  });

  it("refuses rather than overwrite a cell another place holds", async () => {
    const { zone, corridor } = await lobbyAndCorridor();
    const squatter = makeStuff(() => new Location());
    zone.addLocation(squatter, 0, 1, 1);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(corridor.plotBesideNeighbour()).toBe(false);
    expect(zone.hasRoomAt(0, 1, 1, squatter)).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it("is idempotent once plotted", async () => {
    const { corridor } = await lobbyAndCorridor();
    corridor.plotBesideNeighbour();
    expect(corridor.plotBesideNeighbour()).toBe(true);
    expect(corridor.getCoordinates()).toEqual([0, 1, 1]);
  });
});
