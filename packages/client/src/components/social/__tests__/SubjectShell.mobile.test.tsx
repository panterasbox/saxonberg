/**
 * The forum on a phone is MASTER-DETAIL, not two columns.
 *
 * ⭐ "Mobile is not desktop with a narrower column" is a convention, and
 * this is what breaking it looked like: at 390px the rail kept its
 * desktop 14–18rem and left the BODY about 200px — a forum post rendered
 * four words to a line. Found by driving; no test saw it, because every
 * component test rendered at jsdom's default width.
 *
 * A subject and its surfaces are a drill-down, so the phone SWITCHES:
 * the rail owns the screen until you pick, then the subject does, with a
 * way back.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ForumSubjectRecord } from "@saxonberg/types";
import { useStore } from "../../../store";

vi.mock("../../../store/forumActions", async () => {
  const actual = await vi.importActual<
    typeof import("../../../store/forumActions")
  >("../../../store/forumActions");
  return {
    ...actual,
    subscribeForumScope: () => "sub-subjects",
    unsubscribeForumScope: () => undefined,
    openForumBoard: () => undefined,
  };
});

/** Drive `useIsCompact`, which reads a media query. */
let compact = false;
vi.mock("../../../lib/style/useIsCompact", () => ({
  useIsCompact: () => compact,
  COMPACT_QUERY: "(max-width: 40rem)",
}));

import { SubjectShell } from "../SubjectShell";

const SUBJECT: ForumSubjectRecord = {
  id: "s1",
  title: "Gossip",
  grain: "venue",
  handle: "gossip",
  parent: null,
  audience: { kind: "open", label: "open" },
  surfaces: ["popularity-forum"],
  openObjections: 0,
};

beforeEach(() => {
  useStore.setState({
    forumRecords: { "sub-subjects": [SUBJECT] },
    forumScopes: { "sub-subjects": { kind: "subjects", id: "" } },
    forumNav: { boardHandle: null, threadId: null },
  });
});

const noop = () => undefined;

function mount() {
  return render(
    <SubjectShell onSendCommand={noop} onCommandPreview={noop} />,
  );
}

describe("desktop", () => {
  beforeEach(() => {
    compact = false;
  });

  it("shows the rail and the body at once", () => {
    mount();
    expect(screen.getByTestId("subject-rail")).toBeTruthy();
    fireEvent.click(document.querySelector('[data-subject="s1"]')!);
    // Both, side by side — and no back control, because nothing was
    // taken away to need one.
    expect(screen.queryByTestId("subject-rail")).toBeTruthy();
    expect(screen.queryByTestId("subject-back")).toBeNull();
  });
});

describe("⭐ phone", () => {
  beforeEach(() => {
    compact = true;
  });

  it("gives the rail the whole screen until a subject is picked", () => {
    mount();
    expect(screen.getByTestId("subject-rail")).toBeTruthy();
    expect(screen.queryByTestId("subject-header")).toBeNull();
  });

  it("hands the screen to the subject once one is picked", () => {
    mount();
    fireEvent.click(document.querySelector('[data-subject="s1"]')!);
    // The rail steps aside rather than sharing 390px with the body.
    expect(screen.queryByTestId("subject-rail")).toBeNull();
    expect(screen.getByTestId("subject-header")).toBeTruthy();
  });

  it("offers a way back, and it works", () => {
    mount();
    fireEvent.click(document.querySelector('[data-subject="s1"]')!);
    const back = screen.getByTestId("subject-back");
    fireEvent.click(back);
    expect(screen.getByTestId("subject-rail")).toBeTruthy();
    expect(screen.queryByTestId("subject-header")).toBeNull();
  });
});
