import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";
import type { AuthState } from "@saxonberg/types";

function setAuth(partial: Partial<AuthState>) {
  useStore.getState().setAuth(partial);
}

beforeEach(() => {
  useStore.setState({
    auth: { isAuthenticated: false, user: null, player: null },
    connection: {
      link: "connected",
      isConnected: false,
      socketId: null,
      sessionId: null,
      error: null,
    },
    connectionPhase: "in-world",
  });
});

describe("connection.link state machine", () => {
  it("setDisconnected defaults to 'reconnecting'", () => {
    setAuth({ isAuthenticated: true });
    useStore.getState().setDisconnected();
    expect(useStore.getState().connection.link).toBe("reconnecting");
  });

  it("a reconnecting drop for an authed real user stays in-world", () => {
    setAuth({
      isAuthenticated: true,
      player: { isGuest: false } as AuthState["player"],
    });
    useStore.getState().setDisconnected(undefined, "reconnecting");
    expect(useStore.getState().connectionPhase).toBe("in-world");
  });

  it("a dropped real user stays in-world (Reconnect banner handles it)", () => {
    setAuth({
      isAuthenticated: true,
      player: { isGuest: false } as AuthState["player"],
    });
    useStore.getState().setDisconnected("Connection lost", "dropped");
    expect(useStore.getState().connection.link).toBe("dropped");
    expect(useStore.getState().connectionPhase).toBe("in-world");
  });

  it("a dropped guest routes to the start screen and clears identity", () => {
    setAuth({
      isAuthenticated: true,
      player: { isGuest: true } as AuthState["player"],
    });
    useStore.getState().setDisconnected("Connection lost", "dropped");
    expect(useStore.getState().connectionPhase).toBe("unauthenticated");
    expect(useStore.getState().auth.isAuthenticated).toBe(false);
    expect(useStore.getState().auth.player).toBeNull();
  });

  it("setConnected restores link to 'connected'", () => {
    useStore.getState().setDisconnected("x", "dropped");
    useStore.getState().setConnected({
      userId: "u",
      socketId: "s",
      sessionId: "sess",
      interactiveStuffId: "i",
      avatarStuffId: "a",
      player: {
        _id: "p",
        name: "Bartleby",
        pronouns: "they" as never,
        portraitUrl: "",
      },
      topicCatalogue: [],
      clientState: {},
      broadcastSources: [],
    });
    expect(useStore.getState().connection.link).toBe("connected");
    expect(useStore.getState().connection.isConnected).toBe(true);
  });
});
