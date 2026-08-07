import { beforeEach, describe, expect, it } from "vitest";
import { useStore } from "../index";
import type { TopicDescriptor } from "@saxonberg/types";

/**
 * Reset the catalogue slice between cases so the module-level store
 * doesn't leak state across tests.
 */
function resetCatalogue(): void {
  useStore.setState({ topicCatalogue: new Map() });
}

describe("topic catalogue slice", () => {
  beforeEach(() => {
    resetCatalogue();
  });

  it("setTopicCatalogue replaces the map wholesale", () => {
    const seeds: TopicDescriptor[] = [
      {
        topic: "speech.vocal",
        family: "world.speech",
        label: "Say",
        description: "Speak aloud.",
        address: "ambient" as const,
        actor: "system" as const,
        weight: "diagnostic" as const,
        audience: "all" as const,
        durable: false,
        affordance: "decays" as const,
      },
      {
        topic: "world.speech",
        family: "world",
        label: "Speech",
        description: "Speech-family.",
        address: "ambient" as const,
        actor: "system" as const,
        weight: "diagnostic" as const,
        audience: "all" as const,
        durable: false,
        affordance: "decays" as const,
      },
    ];
    useStore.getState().setTopicCatalogue(seeds);
    const cat = useStore.getState().topicCatalogue;
    expect(cat.size).toBe(2);
    expect(cat.get("speech.vocal")?.label).toBe("Say");
  });

  it("getTopicDescriptor returns the authored descriptor when present", () => {
    useStore.getState().setTopicCatalogue([
      {
        topic: "speech.vocal",
        family: "world.speech",
        label: "Say",
        description: "Speak aloud.",
        address: "ambient" as const,
        actor: "system" as const,
        weight: "diagnostic" as const,
        audience: "all" as const,
        durable: false,
        affordance: "decays" as const,
      },
    ]);
    const d = useStore.getState().getTopicDescriptor("speech.vocal");
    expect(d).toEqual({
      topic: "speech.vocal",
      family: "world.speech",
      label: "Say",
      description: "Speak aloud.",
      address: "ambient" as const,
      actor: "system" as const,
      weight: "diagnostic" as const,
      audience: "all" as const,
      durable: false,
      affordance: "decays" as const,
    });
  });

  it("getTopicDescriptor inherits from a family ancestor when the leaf is unseeded", () => {
    useStore.getState().setTopicCatalogue([
      {
        topic: "system.log.command",
        family: "system.log",
        label: "Command",
        description: "Per-command log emissions.",
        address: "ambient" as const,
        actor: "system" as const,
        weight: "diagnostic" as const,
        audience: "all" as const,
        durable: false,
        affordance: "decays" as const,
      },
    ]);
    const d = useStore
      .getState()
      .getTopicDescriptor("system.log.command.info");
    expect(d).toEqual({
      topic: "system.log.command.info",
      family: "system.log.command",
      label: "Command (Info)",
      description: "Per-command log emissions.",
      address: "ambient" as const,
      actor: "system" as const,
      weight: "diagnostic" as const,
      audience: "all" as const,
      durable: false,
      affordance: "decays" as const,
    });
  });

  it("getTopicDescriptor falls back to a derived default when no ancestor exists", () => {
    const d = useStore.getState().getTopicDescriptor("foo.bar.baz");
    expect(d).toEqual({
      topic: "foo.bar.baz",
      family: "foo.bar",
      label: "Baz",
      description: "(no description)",
      address: "ambient" as const,
      actor: "system" as const,
      weight: "diagnostic" as const,
      audience: "all" as const,
      durable: false,
      affordance: "decays" as const,
    });
  });

  it("derived fallback handles a single-segment topic", () => {
    const d = useStore.getState().getTopicDescriptor("chatter");
    expect(d).toEqual({
      topic: "chatter",
      family: "",
      label: "Chatter",
      description: "(no description)",
      address: "ambient" as const,
      actor: "system" as const,
      weight: "diagnostic" as const,
      audience: "all" as const,
      durable: false,
      affordance: "decays" as const,
    });
  });
});
