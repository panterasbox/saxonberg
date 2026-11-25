/**
 * The end of a sign-in (stream arrival D2): every provider's success lands
 * on `/?auth=success&via=<provider>`, through the one method the test seam
 * also calls. And the connection's door keeps only the four words (D7).
 */

import "../../../test-bootstrap";
import { describe, it, expect } from "vitest";
import { AuthRoutes } from "../AuthRoutes";
import Interactive from "../../../mud/platform/idea/Interactive";

describe("AuthRoutes.finishSignIn", () => {
  it("returns with the provider that worked", () => {
    const prev = process.env.CLIENT_URL;
    process.env.CLIENT_URL = "http://client.test";
    for (const p of ["google", "twitch", "kick"] as const) {
      let to = "";
      AuthRoutes.finishSignIn({ redirect: (u: string) => (to = u) } as never, p);
      expect(to).toBe(`http://client.test/?auth=success&via=${p}`);
    }
    process.env.CLIENT_URL = prev;
  });
});

describe("Interactive.setArrivedFrom — the four door words", () => {
  it("keeps a carrier's word or `stream`, drops anything else", () => {
    const i = Object.create(Interactive.prototype) as Interactive;
    for (const d of ["twitch", "youtube", "kick", "stream"]) {
      i.setArrivedFrom(d);
      expect(i.getArrivedFrom()).toBe(d);
    }
    for (const d of ["vimeo", "", null]) {
      i.setArrivedFrom(d);
      expect(i.getArrivedFrom()).toBeNull();
    }
  });
});
