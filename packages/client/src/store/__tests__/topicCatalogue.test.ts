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
        topic: "world.speech.say",
        family: "world.speech",
        label: "Say",
        description: "Speak aloud.",
      },
      {
        topic: "world.speech",
        family: "world",
        label: "Speech",
        description: "Speech-family.",
      },
    ];
    useStore.getState().setTopicCatalogue(seeds);
    const cat = useStore.getState().topicCatalogue;
    expect(cat.size).toBe(2);
    expect(cat.get("world.speech.say")?.label).toBe("Say");
  });

  it("getTopicDescriptor returns the authored descriptor when present", () => {
    useStore.getState().setTopicCatalogue([
      {
        topic: "world.speech.say",
        family: "world.speech",
        label: "Say",
        description: "Speak aloud.",
      },
    ]);
    const d = useStore.getState().getTopicDescriptor("world.speech.say");
    expect(d).toEqual({
      topic: "world.speech.say",
      family: "world.speech",
      label: "Say",
      description: "Speak aloud.",
    });
  });

  it("getTopicDescriptor inherits from a family ancestor when the leaf is unseeded", () => {
    useStore.getState().setTopicCatalogue([
      {
        topic: "system.log.command",
        family: "system.log",
        label: "Command",
        description: "Per-command log emissions.",
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
    });
  });

  it("getTopicDescriptor falls back to a derived default when no ancestor exists", () => {
    const d = useStore.getState().getTopicDescriptor("foo.bar.baz");
    expect(d).toEqual({
      topic: "foo.bar.baz",
      family: "foo.bar",
      label: "Baz",
      description: "(no description)",
    });
  });

  it("derived fallback handles a single-segment topic", () => {
    const d = useStore.getState().getTopicDescriptor("chatter");
    expect(d).toEqual({
      topic: "chatter",
      family: "",
      label: "Chatter",
      description: "(no description)",
    });
  });
});
