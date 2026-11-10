/**
 * The stream controls card (broadcast-ready D10): every control is a real
 * `stream …` command that previews what it sends; the picker is fed by
 * the reason rows; a privacy reason is labelled as having no timer.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useStore } from "../../../store";
import { StreamControls } from "../StreamControls";

function state(phase: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    phase,
    reason: null,
    startsAt: null,
    awayUntil: null,
    endsAt: null,
    topic: null,
    agenda: [],
    current: -1,
    client: null,
    rotation: { pinned: null, skip: [] },
    reasons: [
      { key: "bathroom", label: "Bathroom break", copy: "", privacy: false, scene: null, defaultDurationMs: 300000 },
      { key: "privacy", label: "Privacy", copy: "", privacy: true, scene: null, defaultDurationMs: null },
    ],
    ...extra,
  };
}

describe("StreamControls", () => {
  beforeEach(() => useStore.setState({ clientState: {} }));

  it("offers to load when the game has not sent the state yet", () => {
    const send = vi.fn();
    render(<StreamControls onSendCommand={send} />);
    fireEvent.click(screen.getByTestId("stream-load"));
    expect(send).toHaveBeenCalledWith("stream");
  });

  it("sends a real command from each control, and previews it first", () => {
    useStore.setState({ clientState: { "stream.state": state("live") } });
    const send = vi.fn();
    const preview = vi.fn();
    render(<StreamControls onSendCommand={send} onCommandPreview={preview} />);
    const away = screen.getByTestId("stream-away-bathroom");
    fireEvent.mouseEnter(away);
    expect(preview).toHaveBeenCalledWith("stream away bathroom");
    fireEvent.click(away);
    expect(send).toHaveBeenCalledWith("stream away bathroom");
    fireEvent.click(screen.getByTestId("stream-end"));
    expect(send).toHaveBeenCalledWith("stream end");
  });

  it("labels a privacy reason as having no timer", () => {
    useStore.setState({ clientState: { "stream.state": state("live") } });
    render(<StreamControls onSendCommand={vi.fn()} />);
    expect(screen.getByTestId("stream-away-privacy").textContent).toContain("no timer");
  });

  it("offers Back from standby and shows no Away countdown for privacy", () => {
    useStore.setState({
      clientState: {
        "stream.state": state("standby", {
          reason: { key: "privacy", label: "Privacy", copy: "", privacy: true, scene: null },
        }),
      },
    });
    const send = vi.fn();
    render(<StreamControls onSendCommand={send} />);
    expect(screen.queryByTestId("stream-timer")).toBeNull();
    fireEvent.click(screen.getByTestId("stream-live"));
    expect(send).toHaveBeenCalledWith("stream back");
  });
});
