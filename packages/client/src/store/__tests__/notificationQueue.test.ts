import { beforeEach, describe, expect, it } from "vitest";
import { useStore, type SocialNotification } from "../index";

/**
 * Social-notification (banner) queue slice tests. Reducers in isolation —
 * the wire-client demux (topic + surface) lives in
 * `services/__tests__/websocket.test.ts` and the toast UI in the
 * component.
 */
function resetSlice(): void {
  useStore.setState({ notifications: [] });
}

function makeNotification(id: string): SocialNotification {
  return {
    id,
    kind: "presence",
    event: "connect",
    actor: { stuffId: `s-${id}`, displayName: "Alice" },
    surface: "banner",
    color: "amber",
  };
}

describe("notification-queue slice", () => {
  beforeEach(() => {
    resetSlice();
  });

  it("starts empty", () => {
    expect(useStore.getState().notifications).toEqual([]);
  });

  it("pushes a notification onto the queue", () => {
    useStore.getState().pushNotification(makeNotification("n1"));
    expect(useStore.getState().notifications.map((n) => n.id)).toEqual(["n1"]);
  });

  it("dedupes on duplicate id (frame replay)", () => {
    useStore.getState().pushNotification(makeNotification("n1"));
    useStore.getState().pushNotification(makeNotification("n1"));
    expect(useStore.getState().notifications).toHaveLength(1);
  });

  it("preserves arrival order across multiple pushes", () => {
    useStore.getState().pushNotification(makeNotification("n1"));
    useStore.getState().pushNotification(makeNotification("n2"));
    expect(useStore.getState().notifications.map((n) => n.id)).toEqual([
      "n1",
      "n2",
    ]);
  });

  it("dismisses a notification by id", () => {
    useStore.getState().pushNotification(makeNotification("n1"));
    useStore.getState().pushNotification(makeNotification("n2"));
    useStore.getState().dismissNotification("n1");
    expect(useStore.getState().notifications.map((n) => n.id)).toEqual(["n2"]);
  });

  it("dismissing an unknown id is a no-op", () => {
    useStore.getState().pushNotification(makeNotification("n1"));
    useStore.getState().dismissNotification("nope");
    expect(useStore.getState().notifications).toHaveLength(1);
  });

  it("clearNotifications empties the queue", () => {
    useStore.getState().pushNotification(makeNotification("n1"));
    useStore.getState().pushNotification(makeNotification("n2"));
    useStore.getState().clearNotifications();
    expect(useStore.getState().notifications).toEqual([]);
  });
});
