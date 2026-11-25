/**
 * The stream controls card (broadcast-ready D10): every control is a real
 * `rodney …` command that previews what it sends; the picker is fed by
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
    expect(send).toHaveBeenCalledWith("rodney");
  });

  it("sends a real command from each control, and previews it first", () => {
    useStore.setState({ clientState: { "stream.state": state("live") } });
    const send = vi.fn();
    const preview = vi.fn();
    render(<StreamControls onSendCommand={send} onCommandPreview={preview} />);
    const away = screen.getByTestId("stream-away-bathroom");
    fireEvent.mouseEnter(away);
    expect(preview).toHaveBeenCalledWith("rodney away bathroom");
    fireEvent.click(away);
    expect(send).toHaveBeenCalledWith("rodney away bathroom");
    fireEvent.click(screen.getByTestId("stream-end"));
    expect(send).toHaveBeenCalledWith("rodney end");
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
    expect(send).toHaveBeenCalledWith("rodney back");
  });

  /**
   * ⭐ The rename (stream arrival D22): the old verb is no verb at all, so
   * a control still typing it would send nothing anybody has. Every
   * control, in every phase, sends `rodney …`.
   */
  it("every control in every phase sends `rodney …` and never `stream`", () => {
    for (const phase of ["offline", "starting", "live", "standby", "ending"] as const) {
      useStore.setState({ clientState: { "stream.state": state(phase, { agenda: ["a", "b"], current: 0 }) } });
      const send = vi.fn();
      const { unmount } = render(<StreamControls onSendCommand={send} />);
      for (const b of screen.queryAllByRole("button")) fireEvent.click(b);
      unmount();
      const sent = send.mock.calls.map((c) => String(c[0]));
      expect(sent.length).toBeGreaterThan(0);
      for (const line of sent) expect(line).toMatch(/^rodney( |$)/);
    }
  });
});
