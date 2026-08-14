/**
 * The front door's persistence claim, after the reset job.
 *
 * ⚠⚠ **The sentence this suite pins used to be a promise the server no
 * longer keeps.** It read *"Your character, your record, and everything
 * you build persist to an account."* Under a nightly total wipe that is
 * the same class of defect as *"Sign in to save"*: copy the player
 * **acts on**, believing their work is banked.
 *
 * ⭐ So the assertion is an **absence**, and a specific one. Testing
 * that the new sentence is present would pass just as happily with the
 * old one still sitting beside it — which is exactly how a replaced
 * string survives a replacement.
 *
 * The reset NOTICE is asserted here too, in both directions: it must
 * say nothing at all when the server states no policy (there is no
 * fallback string and there must never be one), and when it does speak
 * it must name what survives rather than shrug.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StartScreen } from "../StartScreen";
import { useStore } from "../../store/index";

/** The exact promise the reset job made false. */
const RETIRED_PROMISE = /everything you build persist/i;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ releases: [] }),
  } as unknown as Response);
  useStore.setState({ serverFacts: {}, configuredProviders: ["google"] });
});

describe("the sign-in panel", () => {
  it("no longer promises that what you build persists", () => {
    render(<StartScreen />);
    expect(document.body.textContent ?? "").not.toMatch(RETIRED_PROMISE);
  });

  it("still says what an account IS for", () => {
    render(<StartScreen />);
    // The replacement has to carry the reason to sign in, or removing a
    // false claim has quietly removed the call to action with it.
    expect(screen.getByText(/same person twice/i)).toBeTruthy();
  });
});

describe("the reset notice", () => {
  it("says NOTHING when the server states no policy", () => {
    useStore.setState({ serverFacts: {} });
    render(<StartScreen />);
    expect(screen.queryByTestId("reset-notice")).toBeNull();
  });

  it("names the survivor when the server states a policy", () => {
    useStore.setState({ serverFacts: { resetPolicy: "The world resets nightly" } });
    render(<StartScreen />);
    const notice = screen.getByTestId("reset-notice");
    expect(notice.textContent).toContain("The world resets nightly");
    // ⚠ Not "nothing survives" — one thing does, and a notice that got
    // that backwards would be a different lie in the same place.
    expect(notice.textContent).toMatch(/published news survives/i);
  });
});
