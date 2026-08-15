/**
 * `FacetFilterPanel` — filtering as a **standing predicate over topic
 * facets**, not a list of topic strings.
 *
 * ## ⭐⭐ Why this exists at all
 *
 * *Filters run on the topic facets, not on topic strings — so "quiet"
 * is one rule rather than a list of sixty paths that drifts every time
 * a topic is added.* That sentence is the whole reason the S2 facet
 * taxonomy was built, and this panel is where it pays.
 *
 * ⚠ The facet names were **verified against the shipped corpus**, not
 * taken from the reference art: the art was drawn before S2 landed, and
 * the plan flags the risk that they disagree. They do not — `address`
 * (`direct`/`personal`/`ambient`/`broadcast`), `actor`
 * (`self`/`person`/`world`/`system`) and `weight`
 * (`consequence`/`activity`/`chatter`/`diagnostic`) are exactly what
 * `TopicDescriptor` carries.
 *
 * ## ⚠ Every chip's count is DERIVED from the frames in view
 *
 * Counted at render, from the buffer beside it. A count tracked
 * alongside a list is a second source of truth for that list's size,
 * and the two disagree the first time one path forgets to update.
 * `SHOWING 9 of 9` is the same rule applied to the header.
 *
 * ## The tree is still here, and that is deliberate
 *
 * This panel does not replace the topic drawer below it. Facets fix
 * cross-cutting questions; only the TREE fixes subtree mutes
 * (*everything about the air in here*), which is a prefix operation no
 * facet can express. Both halves are needed — the topics doc says so,
 * and dropping either would lose a real capability.
 */

import React from "react";
import styled from "styled-components";
import type {
  FacetFilter,
  TopicAddress,
  TopicActor,
  TopicWeight,
} from "@saxonberg/types";
import { FILTER_PRESETS } from "@saxonberg/types";
import { useStore, type Frame } from "../store/index";
import { tokens } from "./ui";

/** The three axes, in the art's order. */
const ADDRESSES: readonly TopicAddress[] = [
  "direct",
  "personal",
  "ambient",
  "broadcast",
];
const ACTORS: readonly TopicActor[] = ["self", "person", "world", "system"];
const WEIGHTS: readonly TopicWeight[] = [
  "consequence",
  "activity",
  "chatter",
  "diagnostic",
];

/**
 * Does a frame's facets satisfy the filter?
 *
 * **Within an axis, OR; across axes, AND; an absent axis means any.**
 * An empty filter passes everything, which is what makes `Everything`
 * a preset rather than a special case.
 */
export function facetFilterPasses(
  filter: FacetFilter | undefined,
  facets: {
    address: TopicAddress;
    actor: TopicActor;
    weight: TopicWeight;
    /**
     * The topic string, for the `topics` allowlist. Optional so the
     * three facet axes can still be checked on their own; a filter that
     * names topics and is handed no topic passes nothing, which is the
     * safe direction — a filter that silently ignored its own rule
     * would show the player a feed their preset says they excluded.
     */
    topic?: string;
  },
): boolean {
  if (!filter) return true;
  if (filter.topics?.length) {
    const topic = facets.topic ?? '';
    const under = filter.topics.some(
      (t) => topic === t || topic.startsWith(`${t}.`),
    );
    if (!under) return false;
  }
  if (filter.address?.length && !filter.address.includes(facets.address)) {
    return false;
  }
  if (filter.actor?.length && !filter.actor.includes(facets.actor)) {
    return false;
  }
  if (filter.weight?.length && !filter.weight.includes(facets.weight)) {
    return false;
  }
  return true;
}

/** Add or drop one value on one axis. */
export function toggleFacet<K extends keyof FacetFilter>(
  filter: FacetFilter,
  axis: K,
  value: NonNullable<FacetFilter[K]>[number],
): FacetFilter {
  const current = (filter[axis] ?? []) as Array<typeof value>;
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const out: FacetFilter = { ...filter };
  if (next.length === 0) delete out[axis];
  else (out[axis] as Array<typeof value>) = next;
  return out;
}

const Section = styled.div`
  margin-bottom: ${tokens.space.md};
`;

const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
  margin-bottom: ${tokens.space.xs};
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
`;

const Chip = styled.button<{ $on: boolean }>`
  font: inherit;
  font-size: ${tokens.font.micro};
  cursor: pointer;
  min-height: 44px;
  padding: 0 ${tokens.space.sm};
  background: ${(p) =>
    p.$on ? tokens.color.accentWash : tokens.color.surfaceAlt};
  color: ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.fg)};
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
`;

const Count = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  margin-left: ${tokens.space.xs};
`;

const Showing = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  margin-bottom: ${tokens.space.sm};
`;

const Note = styled.p`
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgDim};
  line-height: 1.5;
  margin: ${tokens.space.sm} 0 0;
`;

export interface FacetFilterPanelProps {
  /** The frames in view — the denominator for every count here. */
  frames: readonly Frame[];
  filter: FacetFilter;
  onChange: (filter: FacetFilter) => void;
  /** Save the current set under a name — it becomes a tab. */
  onSaveSet?: (filter: FacetFilter) => void;
}

export function FacetFilterPanel({
  frames,
  filter,
  onChange,
  onSaveSet,
}: FacetFilterPanelProps): React.ReactElement {
  const getTopicDescriptor = useStore((s) => s.getTopicDescriptor);

  /** Every frame's facets, resolved once. */
  const resolved = React.useMemo(
    () =>
      frames.map((f) => {
        const d = getTopicDescriptor(f.topic);
        return {
          address: d.address,
          actor: d.actor,
          weight: d.weight,
          topic: f.topic,
        };
      }),
    [frames, getTopicDescriptor],
  );

  const passing = React.useMemo(
    () => resolved.filter((f) => facetFilterPasses(filter, f)).length,
    [resolved, filter],
  );

  /** How many frames in view carry this axis value. Derived, always. */
  const countFor = React.useCallback(
    (axis: "address" | "actor" | "weight", value: string) =>
      resolved.filter((f) => f[axis] === value).length,
    [resolved],
  );

  const axis = <K extends keyof FacetFilter>(
    label: string,
    key: K,
    values: readonly NonNullable<FacetFilter[K]>[number][],
  ) => (
    <Section>
      <Label>{label}</Label>
      <Chips>
        {values.map((value) => {
          const on = ((filter[key] ?? []) as string[]).includes(
            value as string,
          );
          return (
            <Chip
              key={String(value)}
              $on={on}
              data-testid={`facet-${String(key)}-${String(value)}`}
              aria-pressed={on}
              onClick={() => onChange(toggleFacet(filter, key, value))}
            >
              {String(value)}
              <Count data-testid={`facet-count-${String(value)}`}>
                {countFor(key as "address" | "actor" | "weight", String(value))}
              </Count>
            </Chip>
          );
        })}
      </Chips>
    </Section>
  );

  return (
    <div data-testid="facet-filter-panel">
      {/* ⚠ Derived from the list beside it, both halves. */}
      <Showing data-testid="filter-showing">
        SHOWING {passing} of {frames.length}
      </Showing>

      <Section>
        <Label>Presets</Label>
        <Chips>
          {FILTER_PRESETS.map((preset) => (
            <Chip
              key={preset.name}
              $on={JSON.stringify(preset.filter) === JSON.stringify(filter)}
              title={preset.note}
              data-testid={`preset-${preset.name}`}
              onClick={() => onChange({ ...preset.filter })}
            >
              {preset.name}
            </Chip>
          ))}
        </Chips>
      </Section>

      {axis("Address", "address", ADDRESSES)}
      {axis("Actor", "actor", ACTORS)}
      {axis("Weight", "weight", WEIGHTS)}

      {onSaveSet && (
        <Chip $on={false} onClick={() => onSaveSet(filter)}>
          save this set
        </Chip>
      )}

      <Note>
        Filters run on the topic facets, not on topic strings — so “quiet”
        is one rule rather than a list of sixty paths that drifts every time
        a topic is added.
      </Note>
    </div>
  );
}
