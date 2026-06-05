import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";

/**
 * Inspection-pane slice unit tests. Exercises the actions in
 * isolation; integration with the wire client + the component
 * tree lives in `components/__tests__/InspectionPane.test.tsx`.
 */
function resetPane(): void {
  useStore.setState({
    paneFocusName: null,
    paneFocusFragment: "",
    paneBodyPainted: false,
    paneLastResult: null,
    paneBreadcrumbRoot: null,
    paneBreadcrumbTrail: [],
    paneDetailPath: [],
    paneDoorContext: null,
  });
}

describe("inspection-pane slice", () => {
  beforeEach(() => {
    resetPane();
  });

  it("starts in the cleared / empty state on mount", () => {
    const s = useStore.getState();
    expect(s.paneFocusName).toBeNull();
    expect(s.paneFocusFragment).toBe("");
    expect(s.paneBodyPainted).toBe(false);
    expect(s.paneLastResult).toBeNull();
    expect(s.paneBreadcrumbRoot).toBeNull();
    expect(s.paneBreadcrumbTrail).toEqual([]);
    expect(s.paneDetailPath).toEqual([]);
    expect(s.paneDoorContext).toBeNull();
  });

  it("setPanePainted flips the body paint flag", () => {
    useStore.getState().setPanePainted(true);
    expect(useStore.getState().paneBodyPainted).toBe(true);

    useStore.getState().setPanePainted(false);
    expect(useStore.getState().paneBodyPainted).toBe(false);
  });

  it("setPaneBreadcrumbRoot installs the root and clears the trail on stuff-id change", () => {
    useStore.getState().setPaneBreadcrumbRoot({
      stuffId: "room-1",
      displayName: "the lobby",
      primaryKeyword: "lobby",
    });
    useStore.getState().pushPaneBreadcrumbTrail({
      label: "counter",
      command: "look counter",
    });
    expect(useStore.getState().paneBreadcrumbTrail).toHaveLength(1);

    useStore.getState().setPaneBreadcrumbRoot({
      stuffId: "room-2",
      displayName: "the steps",
      primaryKeyword: "steps",
    });
    expect(useStore.getState().paneBreadcrumbRoot?.stuffId).toBe("room-2");
    expect(useStore.getState().paneBreadcrumbTrail).toEqual([]);
  });

  it("setPaneBreadcrumbRoot with the same stuff-id keeps the trail intact", () => {
    useStore.getState().setPaneBreadcrumbRoot({
      stuffId: "room-1",
      displayName: "the lobby",
      primaryKeyword: "lobby",
    });
    useStore.getState().pushPaneBreadcrumbTrail({
      label: "counter",
      command: "look counter",
    });

    // Refresh the projection (e.g., displayName changed) — same stuff-id.
    useStore.getState().setPaneBreadcrumbRoot({
      stuffId: "room-1",
      displayName: "Duncan Hall lobby",
      primaryKeyword: "lobby",
    });
    expect(useStore.getState().paneBreadcrumbRoot?.displayName).toBe(
      "Duncan Hall lobby"
    );
    expect(useStore.getState().paneBreadcrumbTrail).toHaveLength(1);
  });

  it("pushPaneBreadcrumbTrail dedupes against the head and caps at 6", () => {
    for (const target of ["a", "b", "c", "d", "e", "f", "g"]) {
      useStore.getState().pushPaneBreadcrumbTrail({
        label: target,
        command: `look ${target}`,
      });
    }
    const trail = useStore.getState().paneBreadcrumbTrail;
    expect(trail).toHaveLength(6);
    expect(trail[0]?.label).toBe("b"); // 'a' shifted off the head
    expect(trail[5]?.label).toBe("g");

    // Repeat the head — no-op.
    useStore.getState().pushPaneBreadcrumbTrail({
      label: "g",
      command: "look g",
    });
    expect(useStore.getState().paneBreadcrumbTrail).toHaveLength(6);
  });

  it("popPaneBreadcrumbTrail slices everything at and after the index", () => {
    useStore.setState({
      paneBreadcrumbTrail: [
        { label: "a", command: "look a" },
        { label: "b", command: "look b" },
        { label: "c", command: "look c" },
      ],
    });
    useStore.getState().popPaneBreadcrumbTrail(1);
    const trail = useStore.getState().paneBreadcrumbTrail;
    expect(trail).toHaveLength(1);
    expect(trail[0]?.label).toBe("a");
  });

  it("pushPaneDetail / popPaneDetail / popPaneDetailToIndex maintain the drill stack", () => {
    useStore.getState().pushPaneDetail("counter");
    useStore.getState().pushPaneDetail("slot");
    expect(useStore.getState().paneDetailPath).toEqual(["counter", "slot"]);

    useStore.getState().popPaneDetail();
    expect(useStore.getState().paneDetailPath).toEqual(["counter"]);

    useStore.getState().pushPaneDetail("slot");
    useStore.getState().pushPaneDetail("hinge");
    useStore.getState().popPaneDetailToIndex(0);
    expect(useStore.getState().paneDetailPath).toEqual(["counter"]);

    useStore.getState().clearPaneDetail();
    expect(useStore.getState().paneDetailPath).toEqual([]);
  });

  it("setPaneDoorContext stashes and clears the door annotation", () => {
    useStore.getState().setPaneDoorContext({
      stuffId: "door-1",
      direction: "south",
    });
    expect(useStore.getState().paneDoorContext).toEqual({
      stuffId: "door-1",
      direction: "south",
    });

    useStore.getState().setPaneDoorContext(null);
    expect(useStore.getState().paneDoorContext).toBeNull();
  });

  it("setPaneResult replaces the cached snapshot", () => {
    useStore.getState().setPaneResult([
      { stuffId: "a", displayName: "Alice" },
    ]);
    expect(useStore.getState().paneLastResult).toEqual([
      { stuffId: "a", displayName: "Alice" },
    ]);

    useStore.getState().setPaneResult(null);
    expect(useStore.getState().paneLastResult).toBeNull();
  });

  it("setPaneFocusName / setPaneFocusFragment update the header state", () => {
    useStore.getState().setPaneFocusName("The Atrium");
    useStore.getState().setPaneFocusFragment("here");
    expect(useStore.getState().paneFocusName).toBe("The Atrium");
    expect(useStore.getState().paneFocusFragment).toBe("here");
  });
});
