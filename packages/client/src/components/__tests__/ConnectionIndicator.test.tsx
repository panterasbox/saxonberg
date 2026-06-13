import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useStore } from "../../store/index";
import { ConnectionIndicator } from "../frame/ConnectionIndicator";

function setLink(link: "connected" | "reconnecting" | "dropped") {
  useStore.setState((s) => ({ connection: { ...s.connection, link } }));
}

afterEach(cleanup);

describe("ConnectionIndicator", () => {
  it("is silent (renders nothing) when connected", () => {
    setLink("connected");
    const { container } = render(<ConnectionIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it("shows a reconnecting state", () => {
    setLink("reconnecting");
    render(<ConnectionIndicator />);
    expect(screen.getByText(/reconnecting/i)).toBeTruthy();
  });

  it("shows a dropped/disconnected state", () => {
    setLink("dropped");
    render(<ConnectionIndicator />);
    expect(screen.getByText(/disconnected/i)).toBeTruthy();
  });
});
