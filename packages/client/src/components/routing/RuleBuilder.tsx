/**
 * `RuleBuilder` — *from a frame…*, the envelope picker.
 *
 * ## ⭐ Why a picker rather than a text field
 *
 * **Tapping fields beats typing a predicate on glass.** On a phone the
 * routing table is a settings screen, and the one thing a settings
 * screen must not ask for is a hand-typed expression in a language
 * nobody has learned. So the flow is: pick a frame you have actually
 * seen, look at what it carries, tap the fields you want the rule to
 * key on.
 *
 * ⭐ It is also a teaching surface, and deliberately the same one the
 * radial is: *you learn what a frame carries by pointing at one, the
 * same way clicking a noun teaches the command.*
 *
 * ## ⚠ The fields it offers are the FACETS, and that is the point
 *
 * `weight`, `address`, `actor`, and the topic. Not the body, not the
 * timestamp, not `frameId` — a rule keyed on any of those would match
 * exactly one frame, forever. The picker offers what a standing
 * predicate can honestly be built from.
 */

import React from "react";
import styled from "styled-components";
import type {
  FeedDestination,
  FeedDisposition,
  FeedPredicate,
} from "@saxonberg/types";
import { FEED_DESTINATIONS } from "@saxonberg/types";
import { useStore, type Frame } from "../../store/index";
import { addRoutingRule, describePredicate } from "../../store/routingActions";
import { tokens } from "../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.sm};
  border: 1px solid ${tokens.color.fgEmphasis};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.md};
  max-width: 100%;
`;

const Label = styled.div`
  font-family: ${tokens.font.engraved};
  font-size: ${tokens.font.label};
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${tokens.color.sectionLabel};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.xs};
`;

const Field = styled.button<{ $on: boolean }>`
  font: inherit;
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.label};
  cursor: pointer;
  min-height: 44px;
  padding: 0 ${tokens.space.sm};
  background: ${(p) =>
    p.$on ? tokens.color.accentWash : tokens.color.surfaceSunken};
  color: ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.fgDim)};
  border: 1px solid
    ${(p) => (p.$on ? tokens.color.fgEmphasis : tokens.color.borderMuted)};
  border-radius: ${tokens.radius.sm};
  text-align: left;
  max-width: 100%;
  overflow-wrap: anywhere;
`;

const Built = styled.div`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  background: ${tokens.color.surfaceSunken};
  border: 1px solid ${tokens.color.borderMuted};
  border-radius: ${tokens.radius.sm};
  padding: ${tokens.space.sm};
  overflow-wrap: anywhere;
`;

const Note = styled.p`
  font-size: ${tokens.font.label};
  color: ${tokens.color.fgMuted};
  line-height: 1.5;
  margin: 0;
`;

export interface RuleBuilderProps {
  /** The frames to pick from — most recent first. */
  frames: readonly Frame[];
  onDone: () => void;
}

/** The four fields a standing predicate can honestly key on. */
type PickableAxis = "weight" | "address" | "actor" | "topic";
const AXES: readonly PickableAxis[] = ["weight", "address", "actor", "topic"];

export function RuleBuilder({
  frames,
  onDone,
}: RuleBuilderProps): React.ReactElement {
  const getTopicDescriptor = useStore((s) => s.getTopicDescriptor);
  const recent = React.useMemo(() => frames.slice(-8).reverse(), [frames]);
  const [pickedFrame, setPickedFrame] = React.useState<Frame | undefined>(
    recent[0],
  );
  const [picked, setPicked] = React.useState<Set<PickableAxis>>(
    new Set<PickableAxis>(["weight"]),
  );
  const [to, setTo] = React.useState<FeedDestination>("attention");
  const [disposition, setDisposition] =
    React.useState<FeedDisposition>("copy");

  const facets = pickedFrame
    ? getTopicDescriptor(pickedFrame.topic)
    : undefined;

  const valueFor = (axis: PickableAxis): string | undefined => {
    if (!pickedFrame || !facets) return undefined;
    if (axis === "topic") return pickedFrame.topic;
    return facets[axis];
  };

  const predicate: FeedPredicate = {};
  for (const axis of picked) {
    const value = valueFor(axis);
    if (value === undefined) continue;
    (predicate as Record<string, string>)[axis] = value;
  }

  return (
    <Wrap data-testid="rule-builder">
      <Label>From a frame</Label>
      <Row>
        {recent.map((f) => (
          <Field
            key={f.id}
            $on={pickedFrame?.id === f.id}
            data-testid={`builder-frame-${f.id}`}
            onClick={() => setPickedFrame(f)}
          >
            {f.topic}
          </Field>
        ))}
      </Row>

      <Label>Fields</Label>
      <Row>
        {AXES.map((axis) => {
          const value = valueFor(axis);
          if (value === undefined) return null;
          return (
            <Field
              key={axis}
              $on={picked.has(axis)}
              data-testid={`builder-field-${axis}`}
              onClick={() =>
                setPicked((s) => {
                  const next = new Set(s);
                  if (next.has(axis)) next.delete(axis);
                  else next.add(axis);
                  return next;
                })
              }
            >
              {axis} = {value}
            </Field>
          );
        })}
      </Row>

      <Label>Rule from this frame</Label>
      <Built data-testid="builder-predicate">
        {describePredicate({ when: predicate, to, disposition })}
      </Built>

      <Row>
        {FEED_DESTINATIONS.map((dest) => (
          <Field
            key={dest}
            $on={to === dest}
            data-testid={`builder-dest-${dest}`}
            onClick={() => setTo(dest)}
          >
            → {dest}
          </Field>
        ))}
      </Row>
      <Row>
        {(["move", "copy"] as const).map((d) => (
          <Field
            key={d}
            $on={disposition === d}
            data-testid={`builder-disposition-${d}`}
            onClick={() => setDisposition(d)}
          >
            {d}
          </Field>
        ))}
      </Row>

      <Row>
        <Field
          $on
          data-testid="builder-add"
          onClick={() => {
            addRoutingRule({ when: predicate, to, disposition });
            onDone();
          }}
        >
          add this rule
        </Field>
      </Row>

      {/*
        ⚠ An empty predicate is a rule that matches EVERYTHING, and
        placed above the catch-all it would make every rule below it
        dead. Saying so is cheaper than refusing, and more honest than
        silently declining to add it.
      */}
      {Object.keys(predicate).length === 0 && (
        <Note data-testid="builder-empty-warning">
          With no fields picked this matches every frame — it would sit
          above the catch-all and nothing below it would ever run.
        </Note>
      )}

      <Note>
        Tap fields above to add or drop them. You learn what a frame
        carries by pointing at one, the same way clicking a noun teaches
        the command.
      </Note>
    </Wrap>
  );
}
