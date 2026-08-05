/**
 * DeliveryProfile — AC 14: the consumer contract combat reads, and the
 * proof that it cannot tell one carrier from another.
 */

import { describe, it, expect } from "vitest";
import {
  DeliveryProfile,
  DEFAULT_DELIVERY_PROFILE_CONFIG,
  STABILITIES,
  INTEGRITIES,
  type DeliveryInputs,
} from "../DeliveryProfile";

/** A thrown glass flask: brittle, unbalanced, payload-dominant. */
const flask: DeliveryInputs = {
  energySource: "muscle",
  massKg: 0.4,
  speedMs: 12,
  channel: "blunt",
  band: "near",
  envelope: "near",
  toughness: 0.05, // glass
  hardness: 500,
  payload: { kind: "test-envelope" },
};

/** An arrow: purpose-made to fly, and recoverable. */
const arrow: DeliveryInputs = {
  energySource: "stored-elastic",
  massKg: 0.03,
  speedMs: 55,
  channel: "point",
  band: "far",
  envelope: "far",
  toughness: 5,
  hardness: 200,
  balancedForFlight: true,
};

describe("DeliveryProfile — energy is physics, not a tuned number", () => {
  it("is ½mv², from the real mass and the real speed", () => {
    const p = DeliveryProfile.derive(flask);
    expect(p.energyJ).toBeCloseTo(0.5 * 0.4 * 12 * 12, 6);
  });

  it("nothing anywhere stores `damage`", () => {
    const p = DeliveryProfile.derive(flask) as unknown as Record<string, unknown>;
    expect(Object.keys(p)).not.toContain("damage");
    expect(DeliveryProfile.derive.toString()).not.toContain("damage");
  });

  it("a feather-light arrival is inert", () => {
    const p = DeliveryProfile.derive({ ...flask, massKg: 0.001, speedMs: 1 });
    expect(p.isInert()).toBe(true);
    expect(DeliveryProfile.derive(flask).isInert()).toBe(false);
  });
});

describe("DeliveryProfile — AC 14: the wound path cannot tell carriers apart", () => {
  /**
   * The governing claim of the whole abstraction. Two completely
   * different objects — a thrown flask and a loosed arrow — reduced to
   * equal profiles must be indistinguishable to every downstream
   * consumer. If this ever fails, some consumer is reaching past the
   * contract at the carrier itself.
   */
  it("equal profiles are byte-identical whatever produced them", () => {
    const asFlask = DeliveryProfile.derive({
      ...flask,
      massKg: 0.05,
      speedMs: 40,
      channel: "point",
      balancedForFlight: true,
      toughness: 5,
      hardness: 200,
      payload: undefined,
    });
    const asArrow = DeliveryProfile.derive({
      ...arrow,
      massKg: 0.05,
      speedMs: 40,
      band: "near",
      envelope: "near",
    });

    expect(asFlask.energyJ).toBe(asArrow.energyJ);
    expect(asFlask.channel).toBe(asArrow.channel);
    expect(asFlask.stability).toBe(asArrow.stability);
    expect(asFlask.integrity).toBe(asArrow.integrity);
    expect(asFlask.hasPayload()).toBe(asArrow.hasPayload());
    expect(asFlask.beyondEnvelope).toBe(asArrow.beyondEnvelope);
  });
});

describe("DeliveryProfile — integrity decides what the room gets", () => {
  it("a brittle vessel shatters — which is what makes it a carrier", () => {
    const p = DeliveryProfile.derive(flask);
    expect(p.integrity).toBe("shatter");
    expect(p.breaksOnArrival()).toBe(true);
  });

  it("a tough projectile is recoverable — spent arrows persist", () => {
    const p = DeliveryProfile.derive(arrow);
    expect(p.integrity).toBe("recover");
    expect(p.breaksOnArrival()).toBe(false);
  });

  it("a soft projectile deforms rather than surviving", () => {
    const p = DeliveryProfile.derive({ ...arrow, hardness: 20 });
    expect(p.integrity).toBe("deform");
  });

  it("thresholds are config-injected, not literals", () => {
    const p = DeliveryProfile.derive(
      { ...arrow, toughness: 3 },
      { ...DEFAULT_DELIVERY_PROFILE_CONFIG, shatterToughness: 10 },
    );
    expect(p.integrity).toBe("shatter");
  });
});

describe("DeliveryProfile — stability steps the placement ladder", () => {
  it("a purpose-made flyer flies true", () => {
    expect(DeliveryProfile.derive(arrow).stability).toBe("true");
  });

  it("a thrown unbalanced object is only fair — honestly", () => {
    // A flask is heavy, payload-dominant and not shaped to fly.
    expect(DeliveryProfile.derive(flask).stability).toBe("fair");
  });

  it("past its envelope, anything is poor — and says so", () => {
    const p = DeliveryProfile.derive({ ...arrow, band: "far", envelope: "near" });
    expect(p.stability).toBe("poor");
    expect(p.stabilityIsPoor()).toBe(true);
    expect(p.beyondEnvelope).toBe(true);
  });
});

describe("DeliveryProfile — the payload is opaque", () => {
  it("carries an envelope through without inspecting it", () => {
    const env = { kind: "test-envelope" };
    const p = DeliveryProfile.derive({ ...flask, payload: env });
    expect(p.hasPayload()).toBe(true);
    expect(p.payload).toBe(env);
  });

  it("a kinetic carrier has none", () => {
    expect(DeliveryProfile.derive(arrow).hasPayload()).toBe(false);
  });
});

describe("DeliveryProfile — determinism", () => {
  it("no Math.random on any derivation path", () => {
    const sources = [
      DeliveryProfile.derive.toString(),
      // The private derivers are reachable through the class object.
      ...Object.getOwnPropertyNames(DeliveryProfile)
        .filter((k) => typeof (DeliveryProfile as never)[k] === "function")
        .map((k) => String((DeliveryProfile as never)[k])),
    ].join("\n");
    expect(sources).not.toContain("Math.random");
  });

  it("is referentially transparent", () => {
    for (const inputs of [flask, arrow]) {
      const a = DeliveryProfile.derive(inputs);
      const b = DeliveryProfile.derive(inputs);
      expect(a.energyJ).toBe(b.energyJ);
      expect(a.stability).toBe(b.stability);
      expect(a.integrity).toBe(b.integrity);
    }
  });

  it("every derivation lands inside its closed vocabulary", () => {
    for (const inputs of [flask, arrow]) {
      const p = DeliveryProfile.derive(inputs);
      expect(STABILITIES).toContain(p.stability);
      expect(INTEGRITIES).toContain(p.integrity);
    }
  });
});
