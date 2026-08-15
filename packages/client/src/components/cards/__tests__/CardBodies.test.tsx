/**
 * The PLACE card's body — the half a player actually reads.
 *
 * ⚠ These exist because the card shipped as a bare list of `go <dir>`
 * chips with no picture, and the report was blunt: *"it needs to be
 * more like the old one with the image and a list of exits, just say
 * 'south' you don't need to say 'go south' that's implied."*
 */

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { StuffDetailRecord } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { CardBody } from "../CardBodies";
import type { CardState } from "../../../store/cardFeedSlice";
import { websocketClient } from "../../../services/websocket";

function placeCard(record: Partial<StuffDetailRecord>): CardState {
  return {
    instanceId: "s1",
    cardId: "place",
    key: "look",
    live: true,
    pinned: false,
    openedAt: 1,
    records: [
      { stuffId: "room", displayName: "the lounge", ...record },
    ] as never,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  useStore.setState({ affordances: {}, affordancePending: {} });
  vi.spyOn(websocketClient, "resolveAffordances").mockImplementation(
    () => undefined,
  );
});

describe("ways out", () => {
  it("⚠ labels a chip with the bare direction, not the verb", () => {
    render(
      <CardBody
        card={placeCard({ exits: [{ direction: "south" }] as never })}
        onSendCommand={() => undefined}
      />,
    );
    // Under a heading that already says WAYS OUT the verb is implied,
    // and printing it on every chip made a row of exits read as a row
    // of sentences.
    expect(screen.getByText("south")).toBeTruthy();
    expect(screen.queryByText("go south")).toBeNull();
  });

  it("⭐ still SENDS the command, and still previews it", () => {
    /*
     * The bare label is not a break with *every clickable previews
     * exactly what it sends* — the preview is the contract, not the
     * label. The transcript has always done this: `Obvious exits:
     * north` sends `go north`.
     */
    const sent: string[] = [];
    render(
      <CardBody
        card={placeCard({ exits: [{ direction: "south" }] as never })}
        onSendCommand={(t) => sent.push(t)}
      />,
    );
    const chip = screen.getByText("south");
    expect(chip.getAttribute("title")).toBe("Click to send: go south");
    fireEvent.click(chip);
    expect(sent).toEqual(["go south"]);
  });
});

describe("the picture", () => {
  it("renders the room's illustration", () => {
    render(
      <CardBody
        card={placeCard({ illustration: "rooms/lounge.png" })}
        onSendCommand={() => undefined}
      />,
    );
    const img = document.querySelector("img");
    expect(img).toBeTruthy();
    expect(img!.getAttribute("src")).toContain("rooms/lounge.png");
  });

  it("⚠ renders nothing at all when there is no illustration", () => {
    // Not a placeholder and not a broken-image icon: a missing asset is
    // not information, and an icon claims something failed.
    render(
      <CardBody
        card={placeCard({})}
        onSendCommand={() => undefined}
      />,
    );
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("the room's description", () => {
  const long =
    "A low-ceilinged room that has clearly been furnished by whoever " +
    "passed through and left something behind. Mismatched armchairs " +
    "and a sagging couch cluster around a rug worn pale down the middle.";

  it("shows it, clamped, with a way to see the rest", () => {
    render(
      <CardBody
        card={placeCard({ longDescription: long })}
        onSendCommand={() => undefined}
      />,
    );
    // The text is all present — the clamp is presentational, so the
    // card never silently truncates what it claims to show.
    expect(screen.getByTestId("place-prose").textContent).toContain(
      "Mismatched armchairs",
    );
    expect(screen.getByTestId("place-prose-toggle").textContent).toBe("more");
  });

  it("expands and collapses", () => {
    render(
      <CardBody
        card={placeCard({ longDescription: long })}
        onSendCommand={() => undefined}
      />,
    );
    const toggle = screen.getByTestId("place-prose-toggle");
    // ⚠ A viewport act — it carries no `Click to send:` promise,
    // because it sends nothing.
    expect(toggle.getAttribute("title")).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByTestId("place-prose-toggle").textContent).toBe("less");
  });

  it("renders nothing when the room has no prose", () => {
    render(
      <CardBody card={placeCard({})} onSendCommand={() => undefined} />,
    );
    expect(screen.queryByTestId("place-prose")).toBeNull();
  });
});

describe("⚠ density", () => {
  it("caps the HERE list and COUNTS the remainder", () => {
    const contents = Array.from({ length: 9 }, (_, i) => ({
      stuffId: `s${i}`,
      displayName: `thing ${i}`,
    }));
    render(
      <CardBody
        card={placeCard({ contents } as never)}
        onSendCommand={() => undefined}
      />,
    );
    // Counted, not dropped: a silent truncation would tell the player
    // the room is emptier than it is.
    expect(screen.getByTestId("here-overflow").textContent).toBe("+4 more");
    expect(screen.getByText("thing 0")).toBeTruthy();
    expect(screen.queryByText("thing 8")).toBeNull();
  });

  it("shows no overflow line when everything fits", () => {
    render(
      <CardBody
        card={placeCard({
          contents: [{ stuffId: "s0", displayName: "a kettle" }],
        } as never)}
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.queryByTestId("here-overflow")).toBeNull();
  });


  it("renders exits as inline links, not 44px buttons", () => {
    render(
      <CardBody
        card={placeCard({
          exits: [{ direction: "south" }, { direction: "north" }] as never,
        })}
        onSendCommand={() => undefined}
      />,
    );
    /*
     * The 44px touch minimum is right for a primary action and wrong
     * for a list of directions in a 360px rail — five exits cost most
     * of a card's height, and the point of a feed is seeing more than
     * one card at a time.
     */
    const south = screen.getByText("south");
    expect(south.tagName).toBe("BUTTON");
    expect(getComputedStyle(south).minHeight).not.toBe("44px");
    // Still a real command, still previewed.
    expect(south.getAttribute("title")).toBe("Click to send: go south");
  });
});

/**
 * ⭐⭐ **One card, and the subject decides what is in it.**
 *
 * There is no location view and no thing view: the body renders the
 * sections the record HAS. This is the property the whole restructure
 * rests on, so it is asserted from both ends.
 */
describe("⭐⭐ sections appear only when the subject has them", () => {
  it("a room gets exits; a thing does not", () => {
    const { unmount } = render(
      <CardBody
        card={placeCard({ exits: [{ direction: "north" }] as never })}
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.getByText("Exits")).toBeTruthy();
    unmount();

    render(
      <CardBody
        card={placeCard({ mass: "0 kg" } as never)}
        onSendCommand={() => undefined}
      />,
    );
    // Not "Exits: none" and not a hatch — absent. A lamp having no
    // exits is not a gap in the lamp.
    expect(screen.queryByText("Exits")).toBeNull();
  });

  it("⚠ a subject with no readings shows NO measured section", () => {
    /*
     * An unwired hatch is right for a figure the surface promised and
     * cannot fill. This section promises nothing, so hatching it put
     * *"nothing about this declares a reading yet"* on every location
     * card — noise claiming to be honesty.
     */
    render(
      <CardBody
        card={placeCard({ exits: [{ direction: "north" }] as never })}
        onSendCommand={() => undefined}
      />,
    );
    expect(
      screen.queryByText(/declares a reading yet/i),
    ).toBeNull();
  });

});

describe("⭐⭐ details are links in the description, not a list", () => {
  it("renders the subject's markup, so a detail word is clickable in place", () => {
    const sent: string[] = [];
    render(
      <CardBody
        card={placeCard({
          longDescription:
            'A hall with <detail id="benches">benches</detail> along one wall.',
        })}
        onSendCommand={(t) => sent.push(t)}
      />,
    );
    fireEvent.click(screen.getByText("benches"));
    // ⚠ The renderer sends the VISIBLE word, which is what the
    // transcript has always done — the player types what they read.
    expect(sent).toEqual(["look benches"]);
  });

  it("⚠ carries NO separate details list", () => {
    /*
     * It used to print `DETAILS  loudspeaker, benches, board, walls` under
     * the prose — the same words the description already contains, said
     * twice. The description is where they are written and where the
     * reader is looking.
     */
    render(
      <CardBody
        card={placeCard({
          longDescription: "A hall.",
          details: [{ ids: ["benches"], text: "worn" }],
        } as never)}
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.queryByText("Details")).toBeNull();
  });
});

describe("⚠ a projected default is not a reading", () => {
  it("hides a zero quantity", () => {
    /*
     * `mass` rides DETAIL_FIELDS, so the projection carries it for
     * anything Tangible whether or not the object set one — an implant
     * that never declared a weight came back `0 kg`, putting
     * `MASS 0 kg` on card after card. That is the substrate saying
     * *nothing here*, printed as though the subject had told you
     * something.
     */
    render(
      <CardBody
        card={placeCard({ mass: { value: 0, unit: "kg" } } as never)}
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.queryByText(/mass/i)).toBeNull();
  });

  it("shows a real one", () => {
    render(
      <CardBody
        card={placeCard({ mass: { value: 2.5, unit: "kg" } } as never)}
        onSendCommand={() => undefined}
      />,
    );
    expect(screen.getByText("2.5 kg")).toBeTruthy();
  });
});

describe("the composition row", () => {
  function withComposition(names: string[]) {
    useStore.setState({
      affordances: {
        room: {
          stuffId: "room",
          verbs: [],
          composition: names,
          kind: "thing",
          at: 1,
        },
      },
    } as never);
  }

  it("shows ONE LINE of mixins with the rest counted inline", () => {
    withComposition([
      "Exitable",
      "Detailed",
      "Visible",
      "Tangible",
      "Containable",
    ]);
    render(<CardBody card={placeCard({})} onSendCommand={() => undefined} />);

    // A line of chips, not a bare count — the row is a teaching
    // surface, so some of it has to be legible without a click.
    expect(screen.getByText("Exitable")).toBeTruthy();
    expect(screen.queryByText("Containable")).toBeNull();
    expect(screen.getByTestId("card-composition-toggle").textContent).toBe(
      "+2 more",
    );
  });

  it("expands to the whole list and back", () => {
    withComposition(["Exitable", "Detailed", "Visible", "Tangible"]);
    render(<CardBody card={placeCard({})} onSendCommand={() => undefined} />);

    fireEvent.click(screen.getByTestId("card-composition-toggle"));
    expect(screen.getByText("Tangible")).toBeTruthy();
    expect(screen.getByTestId("card-composition-toggle").textContent).toBe(
      "less",
    );

    fireEvent.click(screen.getByTestId("card-composition-toggle"));
    expect(screen.queryByText("Tangible")).toBeNull();
  });

  it("offers no toggle when everything already fits", () => {
    withComposition(["Exitable", "Detailed"]);
    render(<CardBody card={placeCard({})} onSendCommand={() => undefined} />);
    expect(screen.queryByTestId("card-composition-toggle")).toBeNull();
  });
});

describe("⚠⚠ no action row", () => {
  it("shows no verb buttons, however many the resolver returns", () => {
    /*
     * It put `cast · defend · destruct` on a noticeboard, a room and an
     * implant alike — enabled because the ACTOR can always do them, not
     * because the subject affords anything. `AffordanceEntry` carries
     * nothing that tells the two apart, so a client filter would be a
     * guess dressed as a recommendation. The radial answers *what can I
     * do with this* properly, with reasons.
     */
    useStore.setState({
      affordances: {
        room: {
          stuffId: "room",
          verbs: [
            { verb: "cast", description: "", state: "enabled" },
            { verb: "defend", description: "", state: "enabled" },
          ],
          composition: ["Visible"],
          kind: "thing",
          at: 1,
        },
      },
    } as never);
    render(<CardBody card={placeCard({})} onSendCommand={() => undefined} />);
    expect(screen.queryByText("cast")).toBeNull();
    expect(screen.queryByText("defend")).toBeNull();
  });
});

/**
 * ⭐⭐ Breadcrumbs are for DETAILS, and nothing else.
 *
 * A detail is not a separate object — it is the same Stuff, looked at
 * more closely. So the drill stays inside the card, swaps the
 * description, and leaves a trail back.
 */
describe("⭐⭐ drilling into a detail", () => {
  const withDetail = () =>
    placeCard({
      displayName: "the station hall",
      primaryKeyword: "hall",
      longDescription:
        'A hall. A <detail id="loudspeaker">loudspeaker</detail> crackles.',
      details: [
        { ids: ["loudspeaker"], description: "A brass horn, wired away.", hasChildren: false },
      ],
    } as never);

  it("⚠ shows NO trail until you have drilled", () => {
    // A breadcrumb on an undrilled card is a trail of one, which says
    // nothing — and this trail has no job outside details.
    render(<CardBody card={withDetail()} onSendCommand={() => undefined} />);
    expect(screen.queryByTestId("detail-trail")).toBeNull();
  });

  it("swaps the description and does NOT send a command", () => {
    const sent: string[] = [];
    render(<CardBody card={withDetail()} onSendCommand={(t) => sent.push(t)} />);

    fireEvent.click(screen.getByText("loudspeaker"));

    expect(screen.getByTestId("place-prose").textContent).toContain(
      "A brass horn",
    );
    /*
     * ⚠⚠ Nothing on the wire. The Stuff has not changed — only how
     * closely you are looking at it. Sending `look loudspeaker` would
     * move the player's FOCUS and open a whole new card for something
     * that is not a separate object.
     */
    expect(sent).toEqual([]);
  });

  it("leaves a trail back to the object", () => {
    render(<CardBody card={withDetail()} onSendCommand={() => undefined} />);
    fireEvent.click(screen.getByText("loudspeaker"));

    const trail = screen.getByTestId("detail-trail");
    /*
     * ⚠ The root is the primaryKeyword, not the display name. Every
     * other segment is a detail keyword, so anchoring on prose would
     * change register halfway through — and the keyword is the word the
     * player would type, which is what the surface is teaching.
     */
    expect(trail.textContent).toContain("hall");
    expect(trail.textContent).not.toContain("the station hall");
    expect(trail.textContent).toContain("loudspeaker");

    fireEvent.click(screen.getByTestId("detail-trail-root"));
    // Back to the object's own prose, and the trail is gone with it.
    expect(screen.getByTestId("place-prose").textContent).toContain("A hall.");
    expect(screen.queryByTestId("detail-trail")).toBeNull();
  });

  it("⚠ still SENDS a look at something that is not one of its details", () => {
    const sent: string[] = [];
    render(
      <CardBody
        card={placeCard({
          longDescription:
            'A hall with <thing id="x">a noticeboard</thing> on it.',
          details: [
            { ids: ["walls"], description: "Papered.", hasChildren: false },
          ],
        } as never)}
        onSendCommand={(t) => sent.push(t)}
      />,
    );
    fireEvent.click(screen.getByText("a noticeboard"));
    // A separate object, so it travels as a command and opens its own
    // card — only THIS subject's own detail aliases are intercepted.
    expect(sent.length).toBe(1);
    expect(screen.queryByTestId("detail-trail")).toBeNull();
  });
});
