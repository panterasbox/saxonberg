/**
 * Which frames offer the reaction affordance.
 *
 * ⚠⚠ **This file exists because a mirror that has drifted looks exactly
 * like a mirror that has not.** `ReactionBar` used to hold a
 * `REACTABLE_PREFIXES` array described as "mirrors REACTABLE_TOPICS".
 * The server later made `act.combat` reactable — a landed hit is a beat
 * the room cheers — and the copy here never learned. Combat frames
 * silently offered no reaction, and no test failed, because every test
 * asserted the client's list against itself.
 *
 * The set now arrives on the connection payload, so the only way to be
 * wrong is for the server to be wrong.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { useStore, type Frame } from "../../../store";
import { ReactionBar } from "../../ReactionBar";

/** The server's set, as it arrives at session-establish. */
const SERVER_REACTABLE = [
  "speech.vocal",
  "act.emote",
  "speech.channel",
  "act.combat",
];

function frame(over: Partial<Frame> = {}): Frame {
  return {
    id: "f1",
    topic: "speech.vocal",
    body: "hello",
    timestamp: 0,
    commandId: "c1",
    frameId: 112,
    ...over,
  } as Frame;
}

function mount(f: Frame) {
  return render(
    <ReactionBar
      frame={f}
      onCommandClick={vi.fn()}
      onCommandPreview={vi.fn()}
    />,
  );
}

beforeEach(() => {
  useStore.setState({
    reactableTopics: new Set(SERVER_REACTABLE),
    emoteCatalogue: new Map([
      ["nod", { verb: "nod", emoji: "🙂", aliases: [], tags: [], slots: [] }],
    ]),
    reactions: {},
    reactionMoved: {},
    reactionExpansions: {},
  });
});

describe("the affordance follows the server's set", () => {
  it.each(SERVER_REACTABLE)("offers on %s", (topic) => {
    const { container } = mount(frame({ topic }));
    expect(container.querySelector(".reaction-add")).not.toBeNull();
  });

  it("⭐ offers on a combat frame — the drift this file was written for", () => {
    const { container } = mount(frame({ topic: "act.combat" }));
    expect(container.querySelector(".reaction-add")).not.toBeNull();
  });

  it("does not offer on a tell", () => {
    const { container } = mount(frame({ topic: "world.expression.tell" }));
    expect(container.firstChild).toBeNull();
  });

  it("does not offer on a reaction's own line — no reaction of a reaction", () => {
    const { container } = mount(frame({ inReactionTo: "c0" }));
    expect(container.firstChild).toBeNull();
  });

  it("offers nothing at all before the server has answered", () => {
    // The honest state for "we have not been told": no affordance,
    // rather than a guess that happens to be right today.
    useStore.setState({ reactableTopics: new Set() });
    const { container } = mount(frame());
    expect(container.firstChild).toBeNull();
  });
});

describe("a frame with no gutter number", () => {
  it("shows no react control, because --msg has nothing to name", () => {
    const { container } = mount(frame({ frameId: undefined }));
    expect(container.querySelector(".reaction-add")).toBeNull();
  });
});
