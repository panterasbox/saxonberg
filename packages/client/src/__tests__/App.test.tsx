import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  /**
   * The unauthenticated boot lands on the front door.
   *
   * ⚠ Asserts the wordmark, not "Saxonberg 2.0" — the version number
   * was a placeholder heading and the front door carries the mark plus
   * a tagline now.
   */
  it("boots to the front door", () => {
    render(<App />);
    expect(screen.getByTestId("start-screen")).toBeDefined();
    expect(screen.getByText("Saxonberg")).toBeDefined();
  });

  /**
   * ⭐ The guest warning is load-bearing copy, not decoration: it is
   * the promise the account menu's "Sign in to start a character" has
   * to stay consistent with. A guest keeps nothing, and there is no
   * conversion path — so nothing on this screen may imply otherwise.
   */
  it("states the guest terms honestly", () => {
    render(<App />);
    const warning = screen.getByTestId("guest-warning").textContent ?? "";
    expect(warning).toMatch(/nothing you make is kept/i);
    expect(warning).not.toMatch(/save your progress/i);
  });

  /**
   * ⚠⚠ No reset claim ships while the server reports no policy.
   *
   * The handoff art carried "the world resets nightly · nothing
   * survives to tomorrow yet" as fixed copy while no cron, CI job or
   * script implemented a wipe — and three design documents went on to
   * reason from it. This is the guard that keeps the string out until
   * a server says it is true.
   */
  it("makes no reset claim the server has not made", () => {
    render(<App />);
    expect(screen.queryByTestId("reset-notice")).toBeNull();
    expect(document.body.textContent).not.toMatch(/resets nightly/i);
    expect(document.body.textContent).not.toMatch(/survives to tomorrow/i);
  });
});
