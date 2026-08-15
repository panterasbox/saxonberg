/**
 * `AffordanceRadial` — *what can I do with this, and what is it made
 * of?*
 *
 * ## ⚠⚠ The art's layer 1 does not exist and must never be built
 *
 * The reference screen shows three layers, and the first is
 * `<thing mx="Tangible,Thermal,…">` — a composition digest riding the
 * MML. **It was cut.** Composition is not stable (`getActiveMixins`
 * unions augments, implants, species innates and on-shift conferral),
 * so a digest printed into scrollback goes stale exactly as a verb list
 * would; it duplicates the `stuff-id` already on the frame; and
 * hand-authored MML cannot be made to keep it current.
 *
 * What ships instead is `CommandApi.resolveAffordances` for
 * `(id, viewer, now)`, cached per `stuff-id`. A cold radial waits one
 * local round trip; warm opens are instant. A source-scan test asserts
 * no `mx` attribute is emitted anywhere.
 *
 * ## ⚠⚠ The geometry is FIXED and must not reflow
 *
 * Perception north, manipulation east, social west, movement south —
 * always, whatever the object affords. Muscle memory across objects is
 * the entire point of a radial, and a menu that rearranges itself to
 * fit its contents has none: the whole value is that `look` is in the
 * same place on an anvil, a person and a door. An empty quadrant
 * renders empty.
 *
 * ## The three states, and why `disabled` is not hidden
 *
 * - `enabled` — a click sends it.
 * - `disabled` — **dimmed, with the validator's own words**, verbatim.
 *   Hiding it would answer "why can't I?" with silence, and the reason
 *   already exists: a validator's return value is exactly what the
 *   player would have been shown had they typed the verb.
 * - `pending-operand` — the verb needs a second object no menu can
 *   know (`put <thing> in <what?>`). It names the field and opens the
 *   right prompt rather than guessing.
 *
 * ⚠ None of this is authorization. A verb reported `enabled` still
 * faces the full validator chain when it is actually run.
 */

import React from "react";
import styled from "styled-components";
import type { AffordanceEntry } from "@saxonberg/types";
import { useStore } from "../../store/index";
import { websocketClient } from "../../services/websocket";
import { tokens } from "../ui";

/** The four fixed slots. Order is the render order, not a ranking. */
export type RadialSlot = "north" | "east" | "west" | "south";

/**
 * Which slot a category sits in.
 *
 * ⭐ Client-side, and it is a *rendering* decision rather than a
 * semantic one — several server categories share a quadrant because
 * four slots is what a radial can hold and still be readable. What is
 * NOT a client decision is which category a verb is in; that rides the
 * wire, so this map never has to guess from a verb's name.
 *
 * ⚠ An unmapped category falls to `east`. Deliberate: `manipulation`
 * is the *doing* quadrant, so a new category lands beside the other
 * things you do to an object rather than being silently dropped —
 * absent from the menu is the one outcome a fixed geometry must never
 * produce.
 */
const SLOT_BY_CATEGORY: Readonly<Record<string, RadialSlot>> = {
  perception: "north",
  // manipulation — everything you DO to a thing
  inventory: "east",
  boundary: "east",
  bulk: "east",
  crafting: "east",
  device: "east",
  medical: "east",
  magic: "east",
  combat: "east",
  banking: "east",
  work: "east",
  domain: "east",
  // social
  social: "west",
  civics: "west",
  governance: "west",
  stream: "west",
  // movement
  movement: "south",
  posture: "south",
  tpa: "south",
};

const SLOT_LABEL: Readonly<Record<RadialSlot, string>> = {
  north: "perception",
  east: "manipulation",
  west: "social",
  south: "movement",
};

/**
 * Categories with no place on the radial.
 *
 * ⚠ `shell`, `author` and `system` are *interface* verbs, not things
 * you do to an object. A radial about an anvil offering `cockpit` or
 * `clone` would be a menu about the client wearing the mask of a menu
 * about the world.
 */
const OFF_RADIAL: ReadonlySet<string> = new Set([
  "shell",
  "author",
  "system",
  "charactergen",
]);

export function slotFor(entry: AffordanceEntry): RadialSlot | null {
  const category = entry.category;
  if (!category) return "east";
  if (OFF_RADIAL.has(category)) return null;
  return SLOT_BY_CATEGORY[category] ?? "east";
}

/**
 * Group a resolved verb list into the four fixed slots.
 *
 * Exported for the suite: the property worth pinning is that the four
 * keys are always present, whatever the input — that IS the fixed
 * geometry, expressed as data.
 */
export function groupIntoSlots(
  verbs: readonly AffordanceEntry[],
): Record<RadialSlot, AffordanceEntry[]> {
  const out: Record<RadialSlot, AffordanceEntry[]> = {
    north: [],
    east: [],
    west: [],
    south: [],
  };
  for (const entry of verbs) {
    const slot = slotFor(entry);
    if (slot) out[slot].push(entry);
  }
  return out;
}

/**
 * ⚠⚠ **How many refusals one quadrant shows before it counts the rest.**
 *
 * Found by driving: an ordinary fixture affords roughly forty verbs and
 * most of them are refused, so the first live radial was a scrolling
 * wall — the geometry was technically fixed and completely unreadable,
 * which is the same as not being fixed at all. Muscle memory needs a
 * SHAPE, and a shape needs a bound.
 *
 * ⭐ Enabled and pending-operand verbs are NEVER cut. The cap applies
 * only to refusals, and what it drops is COUNTED — dimming a verb with
 * its reason is the design fact, and silently omitting the rest without
 * saying how many would trade one honest surface for a tidy lie.
 */
const REFUSALS_SHOWN = 3;

const Sheet = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-areas:
    ". north ."
    "west centre east"
    ". south .";
  gap: ${tokens.space.sm};
  padding: ${tokens.space.md};
  background: ${tokens.color.surface};
  border: 1px solid ${tokens.color.borderEmphasis};
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.body};
  color: ${tokens.color.fg};
`;

const Quadrant = styled.div<{ $area: string }>`
  grid-area: ${(p) => p.$area};
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  min-width: 0;
  /* The quadrant scrolls INSIDE its slot rather than growing the sheet:
     a slot that stretches moves the other three, which is the reflow
     the fixed geometry exists to prevent. */
  /* Three rows plus gaps must fit the 80vh the overlay allows, or the
     sheet grows its own scrollbar and the four slots stop being
     simultaneously visible — which is the whole point of a radial. */
  max-height: 23vh;
  overflow-y: auto;
`;

const QuadrantLabel = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
`;

const Centre = styled.div`
  grid-area: centre;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: ${tokens.space.xs};
  padding: 0 ${tokens.space.sm};
`;

const CentreName = styled.div`
  font-family: ${tokens.font.serif};
  font-size: ${tokens.font.title};
  overflow-wrap: anywhere;
`;

const CentreMeta = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

const VerbButton = styled.button<{ $state: AffordanceEntry["state"] }>`
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  text-align: left;
  cursor: ${(p) => (p.$state === "disabled" ? "not-allowed" : "pointer")};
  background: ${tokens.color.surfaceAlt};
  border: 1px solid
    ${(p) =>
      p.$state === "pending-operand"
        ? tokens.color.info
        : tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  color: ${(p) =>
    p.$state === "disabled" ? tokens.color.fgMuted : tokens.color.fg};
  opacity: ${(p) => (p.$state === "disabled" ? 0.6 : 1)};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  min-height: 44px;
`;

/** The refusal, in the validator's own words. Never re-worded here. */
const Reason = styled.span`
  display: block;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
`;

/** `+4 more refused` — the count of what the cap dropped. */
const MoreRefused = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  padding: ${tokens.space.xs} ${tokens.space.sm};
`;

const Waiting = styled.div`
  padding: ${tokens.space.md};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

export interface AffordanceRadialProps {
  /** The subject. */
  stuffId: string;
  /** What to call it in the centre chip. */
  displayName: string;
  onSendCommand: (text: string) => void;
  onCommandPreview?: (command: string | null) => void;
}

/**
 * What one entry sends when clicked.
 *
 * ⚠ A `pending-operand` verb sends the verb ALONE, on purpose: the
 * dispatcher's own prompt substrate asks for the missing operand, and
 * it asks better than a menu could — it knows the candidate set. The
 * entry names the field so the label can say what is about to be asked
 * for, which is the difference between a click that stalls and a click
 * that continues.
 */
function commandFor(entry: AffordanceEntry, keyword: string): string {
  return `${entry.verb} ${keyword}`;
}

export function AffordanceRadial({
  stuffId,
  displayName,
  onSendCommand,
  onCommandPreview,
}: AffordanceRadialProps): React.ReactElement {
  const answer = useStore((s) => s.affordances[stuffId]);
  const unresolvable = useStore((s) => !!s.affordanceUnresolvable[stuffId]);
  const preview = onCommandPreview ?? (() => undefined);

  React.useEffect(() => {
    websocketClient.resolveAffordances(stuffId);
  }, [stuffId]);

  if (unresolvable) {
    // ⚠ One reason, because the server gives one: "no such object" and
    // "you may not see that" are the same answer, and separating them
    // would map what is hidden nearby.
    return <Waiting data-testid="radial-unresolvable">nothing to act on</Waiting>;
  }
  if (!answer) {
    // The cold open. One local round trip, and the wait is stated
    // rather than papered over with an empty menu that then fills in.
    return <Waiting data-testid="radial-waiting">reading…</Waiting>;
  }

  const slots = groupIntoSlots(answer.verbs);
  const keyword = displayName;

  const renderSlot = (slot: RadialSlot) => {
    /*
     * ⭐ Available first, refusals after, and the refusals bounded.
     * Sorting rather than filtering keeps the promise the design makes
     * — "unavailable verbs render dimmed with their reason" — while
     * stopping forty of them burying the four you can actually run.
     */
    const all = slots[slot];
    const available = all.filter((e) => e.state !== "disabled");
    const refused = all.filter((e) => e.state === "disabled");
    const shownRefusals = refused.slice(0, REFUSALS_SHOWN);
    const hidden = refused.length - shownRefusals.length;
    const shown = [...available, ...shownRefusals];
    return (
    <Quadrant $area={slot} key={slot} data-testid={`radial-${slot}`}>
      <QuadrantLabel>{SLOT_LABEL[slot]}</QuadrantLabel>
      {shown.map((entry) => {
        const command = commandFor(entry, keyword);
        return (
          <VerbButton
            key={entry.verb}
            $state={entry.state}
            data-verb={entry.verb}
            data-state={entry.state}
            title={`Click to send: ${command}`}
            disabled={entry.state === "disabled"}
            onClick={() => onSendCommand(command)}
            onMouseEnter={() => preview(command)}
            onMouseLeave={() => preview(null)}
          >
            {entry.verb}
            {entry.state === "disabled" && entry.reason && (
              <Reason>{entry.reason}</Reason>
            )}
            {entry.state === "pending-operand" && entry.operand && (
              <Reason>needs {entry.operand}</Reason>
            )}
          </VerbButton>
        );
      })}
      {hidden > 0 && (
        <MoreRefused data-testid={`radial-${slot}-more`}>
          +{hidden} more refused
        </MoreRefused>
      )}
    </Quadrant>
    );
  };

  return (
    <Sheet data-testid="affordance-radial" data-stuff-id={stuffId}>
      {renderSlot("north")}
      {renderSlot("west")}
      <Centre>
        <CentreName>{displayName}</CentreName>
        {/*
          The composition count, derived from the list itself — never
          tracked beside it. `0 mixins` is a real answer: an
          unidentified thing tells you nothing about itself, and the
          resolver returns an empty composition rather than a redacted
          one.
        */}
        <CentreMeta data-testid="radial-composition-count">
          {/*
            ⚠ The KIND is the server's answer, not a guess from the
            composition. It runs the same `RecognitionApi.kindOf` gates
            the prose path uses, so a masked being reads `npc` here and
            in the scrollback rather than one surface giving the other
            away.
          */}
          {answer.kind} · {answer.composition.length} mixins
        </CentreMeta>
      </Centre>
      {renderSlot("east")}
      {renderSlot("south")}
    </Sheet>
  );
}
