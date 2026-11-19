/**
 * Document builders — pure functions from what the client holds to a
 * {@link TooltipDoc} (tooltips D2).
 *
 * ⭐ A builder adds no fact its input lacks. Each one is the ONLY path from
 * its kind of subject to a document, and a card and a tooltip about the
 * same subject call the same builder, so the two cannot disagree.
 */

import type { TooltipDoc, TopicDescriptor } from "@saxonberg/types";

/**
 * A control's tooltip: what it does, and the command it runs. A control
 * previews no card, so it has no pin.
 */
export function controlDoc(label: string, command?: string, detail?: string): TooltipDoc {
  return {
    header: { name: label, kindWord: "control" },
    ...(detail ? { prose: detail } : {}),
    ...(command ? { command } : {}),
  };
}

/**
 * A scrollback frame's gutter: which topic it was filed under, and when.
 * Composed on the client from the topic catalogue; the click is the
 * gutter's own action menu, not a command.
 */
export function frameDoc(descriptor: TopicDescriptor, timestamp: number): TooltipDoc {
  return {
    header: { name: descriptor.label, kindWord: "topic" },
    ...(descriptor.description ? { prose: descriptor.description } : {}),
    facts: [
      { label: "topic", value: descriptor.topic, source: "client" },
      { label: "at", value: new Date(timestamp).toLocaleTimeString(), source: "client", at: timestamp },
    ],
    hint: "click — mute, solo, or open in a tab",
  };
}
