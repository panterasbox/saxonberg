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
    paneBreadcrumbs: [],
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
    expect(s.paneBreadcrumbs).toEqual([]);
  });

  it("setPanePainted flips the body paint flag", () => {
    useStore.getState().setPanePainted(true);
    expect(useStore.getState().paneBodyPainted).toBe(true);

    useStore.getState().setPanePainted(false);
    expect(useStore.getState().paneBodyPainted).toBe(false);
  });

  it("pushBreadcrumb prepends fragments newest-first", () => {
    useStore.getState().pushBreadcrumb("apple");
    useStore.getState().pushBreadcrumb("here");
    expect(useStore.getState().paneBreadcrumbs).toEqual(["here", "apple"]);
  });

  it("pushBreadcrumb deduplicates against the current head", () => {
    useStore.getState().pushBreadcrumb("apple");
    useStore.getState().pushBreadcrumb("apple");
    expect(useStore.getState().paneBreadcrumbs).toEqual(["apple"]);
  });

  it("pushBreadcrumb caps at 6 entries (older fall off the tail)", () => {
    for (const f of ["a", "b", "c", "d", "e", "f", "g"]) {
      useStore.getState().pushBreadcrumb(f);
    }
    const crumbs = useStore.getState().paneBreadcrumbs;
    expect(crumbs).toEqual(["g", "f", "e", "d", "c", "b"]);
    expect(crumbs).toHaveLength(6);
  });

  it("pushBreadcrumb ignores empty / whitespace-only fragments", () => {
    useStore.getState().pushBreadcrumb("");
    useStore.getState().pushBreadcrumb("   ");
    expect(useStore.getState().paneBreadcrumbs).toEqual([]);
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
