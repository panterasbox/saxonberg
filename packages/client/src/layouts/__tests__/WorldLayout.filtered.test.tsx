/**
 * ⚠⚠ The count and the body have to agree, or say why not.
 *
 * Found by driving: the feed switcher read `Diag 10`, the Diag feed
 * rendered nothing, and there was no third thing on screen to
 * reconcile them. Each half is right on its own — the switcher counts
 * over the FEED (counting an already-filtered list would make
 * `World 1077` report the tab instead), and the body also applies the
 * tab's standing facet predicate. Together they are a lie of the same
 * kind an unwired figure is: a number promising content that is not
 * there.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_ROUTING } from "@saxonberg/types";
import { useStore, type Frame } from "../../store/index";
import { WorldLayout } from "../WorldLayout";
import { websocketClient } from "../../services/websocket";

function diagnosticFrame(id: string): Frame {
  return {
    id,
    topic: "shell.diagnostic",
    body: `line ${id}`,
    feeds: ["diagnostics"],
  } as unknown as Frame;
}

const noop = () => undefined;

function renderLayout(visible: Frame[]) {
  return render(
    <WorldLayout
      frames={visible}
      onSendCommand={noop}
      onSendPromptResponse={noop}
      onCancelPrompt={noop}
      onCommandClick={noop}
      onCommandPreview={noop}
    />,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(websocketClient, "subscribeMql").mockReturnValue("sub-place");
  vi.spyOn(websocketClient, "unsubscribe").mockImplementation(noop);
  vi.spyOn(websocketClient, "onEnvelope").mockImplementation(noop);
  vi.spyOn(websocketClient, "offEnvelope").mockImplementation(noop);
  vi.spyOn(websocketClient, "resolveAffordances").mockImplementation(noop);
  useStore.setState({
    paneCards: {},
    activeFeed: "diagnostics",
    frames: [diagnosticFrame("a"), diagnosticFrame("b")],
    clientState: {
      "console.activeTab": "All",
      "console.routing": [...DEFAULT_ROUTING],
    },
  });
});

describe("the count-vs-body reconciler", () => {
  it("says how many are there and what is hiding them", () => {
    // The feed holds two; the tab's predicate passes none of them.
    renderLayout([]);

    const notice = screen.getByTestId("all-filtered-notice");
    expect(notice.textContent).toContain("2 in diagnostics");
    // Named, so the reader knows which control to reach for.
    expect(notice.textContent).toContain("All");
  });

  it("⚠ stays away when the two AGREE — including when the feed is simply empty", () => {
    /*
     * Both directions matter. A notice that appeared whenever the
     * terminal was empty would fire on a genuinely empty feed and read
     * as "something is being hidden from you", which is the same class
     * of lie in the other direction.
     */
    useStore.setState({ frames: [] });
    renderLayout([]);
    expect(screen.queryByTestId("all-filtered-notice")).toBeNull();
  });

  it("stays away when the body is showing something", () => {
    renderLayout([diagnosticFrame("a")]);
    expect(screen.queryByTestId("all-filtered-notice")).toBeNull();
  });
});
