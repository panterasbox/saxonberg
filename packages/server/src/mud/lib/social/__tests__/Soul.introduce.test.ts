/**
 * SoulMixin.introduceSelf + the listener's own recognizes — the shared
 * auto-introduce core. Introducing teaches every in-range perceiver the
 * introducer's name (real recognition, the same write the `introduce`
 * verb uses), and `recognizes` reports it.
 */

import "../../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { SoulMixin } from "../Soul";
import { BeliefStoreMixin } from "../../belief/BeliefStore";
import { PerceptionMixin } from "../../perception/Perception";
import { SensorMixin } from "../../message/Sensor";
import { VocalMixin } from "../../message/Vocal";
import { OrganismMixin } from "../../species/Organism";
import { VisibleMixin } from "../../description/Visible";
import { NamedMixin } from "../../description/Named";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainerMixin } from "../../spatial/Container";
import { Idea } from "../../stuff/Idea";
import { ContainmentApi } from "../../../api/containment";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

class Person extends SoulMixin(
  VocalMixin(
    BeliefStoreMixin(
      PerceptionMixin(
        SensorMixin(
          OrganismMixin(VisibleMixin(NamedMixin(ContainableMixin(Idea)))),
        ),
      ),
    ),
  ),
) {}
class Room extends ContainerMixin(Idea) {}

let counter = 0;
function person(name: string, appearance: string): Person {
  const p = makeStuffAtPath(
    () => new Person(),
    `/obj/npc/intro-${counter++}`,
  );
  p.setName(name);
  p.setShortDescription(appearance);
  return p;
}

describe("SoulMixin.introduceSelf + recognizes", () => {
  it("teaches in-range perceivers the introducer's name", () => {
    const room = makeStuff(() => new Room());
    const mara = person("Mara", "a steady, watchful dwarf");
    const pat = person("Pat", "a tall stranger");
    ContainmentApi.move(mara, room);
    ContainmentApi.move(pat, room);

    expect(pat.recognizes(mara)).toBe(false);
    expect(mara.describeFor(pat)).not.toBe("Mara");

    expect(mara.introduceSelf()).toBe(true);

    expect(pat.recognizes(mara)).toBe(true);
    expect(mara.describeFor(pat)).toBe("Mara");
  });

  it("returns false when the introducer has no name to give", () => {
    const room = makeStuff(() => new Room());
    const nameless = makeStuffAtPath(
      () => new Person(),
      "/obj/npc/intro-nameless",
    );
    ContainmentApi.move(nameless, room);
    expect(nameless.introduceSelf()).toBe(false);
  });
});
