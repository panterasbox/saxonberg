import { describe, it, expect } from "vitest";
import Avatar from "../Avatar";
import { makeStuff } from "../../lib/security/__tests__/test-setup";

function makeAvatar(): Avatar {
  return makeStuff(() => new Avatar());
}

describe("Avatar — portrait resolution (getPortraitUrl)", () => {
  it("returns the empty placeholder sentinel when nothing is set", async () => {
    const a = makeAvatar();
    // No setting override, no connected account → '' (the client renders
    // a generated placeholder).
    expect(await a.getPortraitUrl()).toBe("");
  });

  it("returns the per-character setting override when set", async () => {
    const a = makeAvatar();
    a.setSetting("identity.portrait", "https://example.test/face.png", a);
    expect(await a.getPortraitUrl()).toBe("https://example.test/face.png");
  });

  it("an unset setting does not freeze a value — it falls through", async () => {
    const a = makeAvatar();
    a.setSetting("identity.portrait", "https://x/p.png", a);
    a.setSetting("identity.portrait", "", a); // clear override
    expect(await a.getPortraitUrl()).toBe("");
  });
});

describe("Avatar — guest identity", () => {
  it("a fresh avatar is not a guest", () => {
    expect(makeAvatar().getIsGuest()).toBe(false);
  });

  it('reserves the guest word "Guest"', () => {
    expect(Avatar.GUEST_RESERVED_WORD).toBe("Guest");
  });

  it("generates a reserved-word name with a distinct distinguisher", async () => {
    const { name, surname } = await Avatar.generateGuestName();
    expect(name).toBe(Avatar.GUEST_RESERVED_WORD);
    expect(surname.length).toBeGreaterThan(0);
    expect(surname.toLowerCase()).not.toBe("guest");
  });

  it("a guest avatar does not persist (save is a no-op)", async () => {
    const a = makeAvatar();
    // Reach the protected marker through the raw target — the deliberate
    // test seam for inspecting/forcing internal state.
    (a as unknown as { isGuest: boolean }).isGuest = true;
    // save() must short-circuit before touching the template layer; if it
    // didn't, this would throw (no template / no PersistenceManager).
    await expect(a.save()).resolves.toBeUndefined();
  });
});
