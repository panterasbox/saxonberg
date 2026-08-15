import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";

/**
 * Inspection-card slice unit tests. Exercises the actions in
 * isolation; integration with the wire client + the component
 * tree lives in `components/__tests__/InspectionCard.test.tsx`.
 */
function resetCard(): void {
  useStore.setState({
    cardFocusName: null,
    cardFocusFragment: "",
    cardBodyPainted: false,
    cardLastResult: null,
    cardBreadcrumbRoot: null,
    cardBreadcrumbTrail: [],
    cardDetailPath: [],
    cardDoorContext: null,
  });
}

describe("inspection-card slice", () => {
  beforeEach(() => {
    resetCard();
  });

  it("starts in the cleared / empty state on mount", () => {
    const s = useStore.getState();
    expect(s.cardFocusName).toBeNull();
    expect(s.cardFocusFragment).toBe("");
    expect(s.cardBodyPainted).toBe(false);
    expect(s.cardLastResult).toBeNull();
    expect(s.cardBreadcrumbRoot).toBeNull();
    expect(s.cardBreadcrumbTrail).toEqual([]);
    expect(s.cardDetailPath).toEqual([]);
    expect(s.cardDoorContext).toBeNull();
  });

  it("setCardPainted flips the body paint flag", () => {
    useStore.getState().setCardPainted(true);
    expect(useStore.getState().cardBodyPainted).toBe(true);

    useStore.getState().setCardPainted(false);
    expect(useStore.getState().cardBodyPainted).toBe(false);
  });

  it("setCardBreadcrumbRoot installs the root and clears the trail on stuff-id change", () => {
    useStore.getState().setCardBreadcrumbRoot({
      stuffId: "room-1",
      displayName: "the lobby",
      primaryKeyword: "lobby",
    });
    useStore.getState().pushCardBreadcrumbTrail({
      label: "counter",
      command: "look counter",
    });
    expect(useStore.getState().cardBreadcrumbTrail).toHaveLength(1);

    useStore.getState().setCardBreadcrumbRoot({
      stuffId: "room-2",
      displayName: "the steps",
      primaryKeyword: "steps",
    });
    expect(useStore.getState().cardBreadcrumbRoot?.stuffId).toBe("room-2");
    expect(useStore.getState().cardBreadcrumbTrail).toEqual([]);
  });

  it("setCardBreadcrumbRoot with the same stuff-id keeps the trail intact", () => {
    useStore.getState().setCardBreadcrumbRoot({
      stuffId: "room-1",
      displayName: "the lobby",
      primaryKeyword: "lobby",
    });
    useStore.getState().pushCardBreadcrumbTrail({
      label: "counter",
      command: "look counter",
    });

    // Refresh the projection (e.g., displayName changed) — same stuff-id.
    useStore.getState().setCardBreadcrumbRoot({
      stuffId: "room-1",
      displayName: "Duncan Hall lobby",
      primaryKeyword: "lobby",
    });
    expect(useStore.getState().cardBreadcrumbRoot?.displayName).toBe(
      "Duncan Hall lobby"
    );
    expect(useStore.getState().cardBreadcrumbTrail).toHaveLength(1);
  });

  it("pushCardBreadcrumbTrail dedupes against the head and caps at 6", () => {
    for (const target of ["a", "b", "c", "d", "e", "f", "g"]) {
      useStore.getState().pushCardBreadcrumbTrail({
        label: target,
        command: `look ${target}`,
      });
    }
    const trail = useStore.getState().cardBreadcrumbTrail;
    expect(trail).toHaveLength(6);
    expect(trail[0]?.label).toBe("b"); // 'a' shifted off the head
    expect(trail[5]?.label).toBe("g");

    // Repeat the head — no-op.
    useStore.getState().pushCardBreadcrumbTrail({
      label: "g",
      command: "look g",
    });
    expect(useStore.getState().cardBreadcrumbTrail).toHaveLength(6);
  });

  it("popCardBreadcrumbTrail slices everything at and after the index", () => {
    useStore.setState({
      cardBreadcrumbTrail: [
        { label: "a", command: "look a" },
        { label: "b", command: "look b" },
        { label: "c", command: "look c" },
      ],
    });
    useStore.getState().popCardBreadcrumbTrail(1);
    const trail = useStore.getState().cardBreadcrumbTrail;
    expect(trail).toHaveLength(1);
    expect(trail[0]?.label).toBe("a");
  });

  it("pushCardDetail / popCardDetailToIndex / clearCardDetail maintain the drill stack", () => {
    useStore.getState().pushCardDetail("counter");
    useStore.getState().pushCardDetail("slot");
    useStore.getState().pushCardDetail("hinge");
    expect(useStore.getState().cardDetailPath).toEqual([
      "counter",
      "slot",
      "hinge",
    ]);

    useStore.getState().popCardDetailToIndex(0);
    expect(useStore.getState().cardDetailPath).toEqual(["counter"]);

    useStore.getState().clearCardDetail();
    expect(useStore.getState().cardDetailPath).toEqual([]);
  });

  it("setCardDoorContext stashes and clears the door annotation", () => {
    useStore.getState().setCardDoorContext({
      stuffId: "door-1",
      direction: "south",
    });
    expect(useStore.getState().cardDoorContext).toEqual({
      stuffId: "door-1",
      direction: "south",
    });

    useStore.getState().setCardDoorContext(null);
    expect(useStore.getState().cardDoorContext).toBeNull();
  });

  it("setCardResult replaces the cached snapshot", () => {
    useStore.getState().setCardResult([
      { stuffId: "a", displayName: "Alice" },
    ]);
    expect(useStore.getState().cardLastResult).toEqual([
      { stuffId: "a", displayName: "Alice" },
    ]);

    useStore.getState().setCardResult(null);
    expect(useStore.getState().cardLastResult).toBeNull();
  });

  it("setCardFocusName / setCardFocusFragment update the header state", () => {
    useStore.getState().setCardFocusName("The Atrium");
    useStore.getState().setCardFocusFragment("here");
    expect(useStore.getState().cardFocusName).toBe("The Atrium");
    expect(useStore.getState().cardFocusFragment).toBe("here");
  });
});
