/**
 * The subject shell — the client catching up to the server's data model.
 *
 * ⚠ These prove RENDERING. The wiring that puts the shell on screen at
 * all is the layout's job and is asserted separately; a green component
 * test over a surface nothing mounts is a shape this codebase has
 * shipped before.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ForumSubjectRecord } from "@saxonberg/types";
import { useStore } from "../../../store";

/*
 * ⚠ The rail opens a REAL subscription on mount, so without this the
 * store seed lands under one id and the component reads another — and
 * the test passes vacuously against an empty rail, which is precisely
 * the failure being guarded against elsewhere in this build.
 */
vi.mock("../../../store/forumActions", async () => {
  const actual = await vi.importActual<
    typeof import("../../../store/forumActions")
  >("../../../store/forumActions");
  return {
    ...actual,
    subscribeForumScope: () => "sub-subjects",
    unsubscribeForumScope: () => undefined,
  };
});
import { SubjectRail, orderSubjects } from "../SubjectRail";
import { SubjectHeader } from "../SubjectHeader";
import { defaultSurface } from "../SubjectShell";

function subject(over: Partial<ForumSubjectRecord> = {}): ForumSubjectRecord {
  return {
    id: "s1",
    title: "Measure 14",
    grain: "venue",
    handle: "measure-14",
    parent: null,
    audience: { kind: "open", label: "open" },
    surfaces: ["ordered-forum", "open-forum", "open-chat"],
    surfaceRefs: {
      "ordered-forum": "board-arg",
      "open-forum": "board-pop",
      "open-chat": "chan-1",
    },
    openObjections: 3,
    ...over,
  };
}

/** Seed the rail's live records without opening a socket. */
function seedRail(records: ForumSubjectRecord[]) {
  useStore.setState({
    forumRecords: { "sub-subjects": records },
    forumScopes: { "sub-subjects": { kind: "subjects", id: "" } },
  });
}

beforeEach(() => {
  useStore.setState({ forumRecords: {}, forumScopes: {} });
});

describe("orderSubjects", () => {
  it("nests a topic under its parent rather than beside it", () => {
    const charter = subject({ id: "c", title: "Guild charter", handle: "guild-charter" });
    const intake = subject({
      id: "i",
      title: "guild-charter/apprentice-intake",
      handle: "guild-charter/apprentice-intake",
      grain: "topic",
      parent: "c",
    });
    const trade = subject({ id: "t", title: "Trade", handle: "trade" });
    // Deliberately out of order on the way in.
    const ordered = orderSubjects([trade, intake, charter]);
    expect(ordered.map((s) => s.id)).toEqual(["c", "i", "t"]);
  });

  it("keeps a topic whose parent the viewer cannot see", () => {
    // The audience check already let this one through; dropping it here
    // would hide a subject the server said was visible.
    const orphan = subject({ id: "o", grain: "topic", parent: "gone" });
    expect(orderSubjects([orphan]).map((s) => s.id)).toEqual(["o"]);
  });
});

describe("the rail", () => {
  it("chips every lit surface of a subject", () => {
    seedRail([subject()]);
    render(<SubjectRail selectedId={null} onSelect={vi.fn()} />);
    const row = document.querySelector('[data-subject="s1"]')!;
    expect(row).not.toBeNull();
    // Four-letter chips, one per LIT surface — the rail's whole claim is
    // that a subject carries its surfaces with it.
    //
    // ⚠ These are EXPLICIT chips, not `label.slice(0, 4)`: "Ordered" and
    // "Ordered chat" both cut to `ORDE`, so a subject lighting both
    // would show the same chip twice with no way to tell them apart.
    expect(row.textContent).toContain("ORDR");
    expect(row.textContent).toContain("OPEN");
    expect(row.textContent).toContain("CHAT");
    // …and nothing for a surface it has not lit.
    expect(row.textContent).not.toContain("RULE");
  });

  it("shows the open-objection count, and only when there is one", () => {
    seedRail([
      subject({ id: "hot", openObjections: 3 }),
      subject({ id: "calm", openObjections: 0 }),
    ]);
    render(<SubjectRail selectedId={null} onSelect={vi.fn()} />);
    expect(
      document.querySelector('[data-subject="hot"]')!.textContent,
    ).toContain("3");
    // A `0` beside every subject would read as a score; this is a queue.
    expect(
      document.querySelector('[data-subject="calm"]')!.textContent,
    ).not.toMatch(/\b0\b/);
  });

  it("says so, with the way out, when there is nothing to show", () => {
    seedRail([]);
    render(<SubjectRail selectedId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/forum make/)).toBeTruthy();
  });
});

describe("the header", () => {
  const noop = vi.fn();

  it("shows the audience beside the title, because it governs every surface", () => {
    render(
      <SubjectHeader
        subject={subject({ audience: { kind: "curated", label: "managed group" } })}
        activeSurface="ordered-forum"
        onSelectSurface={noop}
        onSendCommand={noop}
        onCommandPreview={noop}
      />,
    );
    expect(screen.getByTestId("subject-audience").textContent).toBe(
      "managed group",
    );
  });

  it("renders a tab per lit surface and an offer per unlit one", () => {
    render(
      <SubjectHeader
        subject={subject({ surfaces: ["open-forum"] })}
        activeSurface="open-forum"
        onSelectSurface={noop}
        onSendCommand={noop}
        onCommandPreview={noop}
      />,
    );
    expect(document.querySelector('[data-surface="open-forum"]')).not.toBeNull();
    expect(document.querySelector('[data-surface-unlit="ordered-forum"]')).not.toBeNull();
    expect(document.querySelector('[data-surface-unlit="open-chat"]')).not.toBeNull();
  });

  it("⭐ an unlit surface previews and sends the real command", () => {
    const send = vi.fn();
    const preview = vi.fn();
    render(
      <SubjectHeader
        subject={subject({ surfaces: ["open-forum"] })}
        activeSurface="open-forum"
        onSelectSurface={noop}
        onSendCommand={send}
        onCommandPreview={preview}
      />,
    );
    const offer = document.querySelector('[data-surface-unlit="ordered-forum"]')!;
    fireEvent.mouseEnter(offer);
    fireEvent.click(offer);
    // Previewed and sent are the same string — the axiom, asserted as an
    // equality rather than as the literal written twice.
    expect(send).toHaveBeenCalledWith(preview.mock.calls[0]![0]);
    expect(send.mock.calls[0]![0]).toContain("--ordered");
  });

  it("⚠ renders ordered-chat as parked, and it sends nothing", () => {
    const send = vi.fn();
    render(
      <SubjectHeader
        subject={subject({ surfaces: ["open-forum"] })}
        activeSurface="open-forum"
        onSelectSurface={noop}
        onSendCommand={send}
        onCommandPreview={noop}
      />,
    );
    // Parked SERVER-side: it is in the vocabulary and there is nothing
    // behind it, so it is not an offer.
    const parked = document.querySelector('[data-surface-parked="ordered-chat"]')!;
    expect(parked).not.toBeNull();
    expect(document.querySelector('[data-surface-unlit="ordered-chat"]')).toBeNull();
    fireEvent.click(parked);
    expect(send).not.toHaveBeenCalled();
  });

  it("names the open-objection count in the subject's own line", () => {
    render(
      <SubjectHeader
        subject={subject({ openObjections: 1 })}
        activeSurface="ordered-forum"
        onSelectSurface={noop}
        onSendCommand={noop}
        onCommandPreview={noop}
      />,
    );
    // Singular, because "1 open objections" is the tell that a count and
    // its sentence were written by different people.
    expect(screen.getByText(/1 open objection$/)).toBeTruthy();
  });
});

describe("⭐⭐ the two forum surfaces are addressed separately", () => {
  /*
   * A subject's HANDLE addresses the subject; `resolveBoardByHandle`
   * resolves it to a board with a documented tie-break —
   * "Popularity wins the rare both-lit case." That held while nothing
   * let you light both. The surface tabs invite exactly that, so
   * switching to Argument silently re-rendered Popularity: the tab
   * highlighted, the board did not change, and nothing said why.
   *
   * The record carries a ref per surface for this reason alone.
   */
  it("carries a backing ref per lit surface", () => {
    const s = subject();
    expect(s.surfaceRefs["ordered-forum"]).not.toBe(
      s.surfaceRefs["open-forum"],
    );
  });

  it("⚠ the two forum refs must never be the same board", () => {
    // The assertion that would have caught it: not "is there a ref" but
    // "do the two surfaces resolve to DIFFERENT boards".
    const s = subject();
    const forumRefs = (["ordered-forum", "open-forum"] as const)
      .map((k) => s.surfaceRefs[k])
      .filter(Boolean);
    expect(new Set(forumRefs).size).toBe(forumRefs.length);
  });
});

describe("defaultSurface", () => {
  it("opens on the first surface the subject actually lit", () => {
    expect(defaultSurface(subject({ surfaces: ["open-chat"] }))).toBe(
      "open-chat",
    );
  });

  it("is null when nothing is lit, rather than guessing a board", () => {
    // Defaulting to `popularity-forum` here would land a deliberation-only
    // subject on a surface it does not have, and the body would render
    // empty with nothing saying why.
    expect(defaultSurface(subject({ surfaces: [] }))).toBeNull();
  });
});
