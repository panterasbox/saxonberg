/**
 * PressRoom — the three terminal states, over a stubbed fetch.
 *
 * The states are the whole contract: **rows**, an **honest empty line**,
 * or **nothing at all**. A visitor must never see an error string or a
 * hanging spinner on the app's front door — the sign-in controls are what
 * they came for, and a broken press room must not compete with them.
 *
 * ⚠ The `credentials: 'omit'` assertion is not pedantry. Every other
 * client fetch uses `'include'`, so the failure mode is somebody copying
 * the surrounding idiom and quietly sending session cookies to a route
 * whose entire contract is that it reads none.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PressRoom } from "../PressRoom";
import type { PublicReleaseRow } from "@saxonberg/types";

function row(overrides: Partial<PublicReleaseRow> = {}): PublicReleaseRow {
  return {
    releaseId: "r1",
    publisher: "/compact/press",
    publisherLabel: "the Compact",
    realm: "ooc",
    kind: "notice",
    headline: "Something happened",
    body: "",
    publishedAt: 1_700_000_000_000,
    pinned: false,
    ...overrides,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function respond(body: unknown, ok = true): void {
  fetchMock.mockResolvedValue({
    ok,
    json: async () => body,
  } as unknown as Response);
}

describe("PressRoom", () => {
  it("renders the rows it is given", async () => {
    respond([
      row({ releaseId: "a", headline: "First" }),
      row({ releaseId: "b", headline: "Second", pinned: true }),
    ]);
    render(<PressRoom />);
    expect(await screen.findByText("First")).toBeTruthy();
    expect(screen.getByText("Second")).toBeTruthy();
    // The publisher is the speaker, and it is attributed.
    expect(screen.getAllByText("the Compact")).toHaveLength(2);
  });

  it("shows a repost's source line", async () => {
    respond([
      row({ kind: "repost", source: "/compact/executive" }),
    ]);
    render(<PressRoom />);
    expect(await screen.findByText("via /compact/executive")).toBeTruthy();
  });

  it("says so honestly when there is nothing published", async () => {
    respond([]);
    render(<PressRoom />);
    expect(
      await screen.findByText("Nothing has been published yet."),
    ).toBeTruthy();
  });

  it("renders NOTHING when the server is down — no error, no spinner", async () => {
    fetchMock.mockRejectedValue(new Error("connection refused"));
    const { container } = render(<PressRoom />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("renders nothing on a non-200 as well", async () => {
    respond({ error: "nope" }, false);
    const { container } = render(<PressRoom />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("renders nothing on a body that is not a list", async () => {
    respond({ not: "an array" });
    const { container } = render(<PressRoom />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(container.innerHTML).toBe(""));
  });

  it("⚠ sends NO credentials, and asks once", async () => {
    respond([row()]);
    render(<PressRoom />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("/api/press/releases");
    expect((init as RequestInit).credentials).toBe("omit");
    // One attempt. No retry, no polling — a press room that reconnects
    // forever on a dead server is worse than one that isn't there.
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts in flight on unmount rather than setting state after teardown", async () => {
    respond([row()]);
    const { unmount } = render(<PressRoom />);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.signal?.aborted).toBe(false);
    unmount();
    expect(init.signal?.aborted).toBe(true);
  });
});
