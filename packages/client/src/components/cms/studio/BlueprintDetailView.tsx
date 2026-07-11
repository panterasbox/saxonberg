/**
 * BlueprintDetailView — one blueprint's detail. Shows name, description, kind,
 * base class, the (expanded) mixin list, and classPath. The load-bearing
 * round-trip is the PRIMARY action "New template from this →" (act #1 — route
 * to the template form). The secondary "Author a new kind from this →" routes
 * to the composer pre-seeded with this blueprint's base + mixins (act #3).
 *
 * The view owns ZERO command/authorization semantics — buttons only navigate
 * the router; the server re-gates the eventual save. Every control previews
 * its action via a `title` hint (the CMS surface convention).
 */

import React from "react";
import styled from "styled-components";
import { useStore } from "../../../store/index";
import { tokens } from "../../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: ${tokens.space.md};
  gap: ${tokens.space.md};
`;

const TitleRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
`;

const Title = styled.h2`
  margin: 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.title};
  color: ${tokens.color.fg};
`;

const Star = styled.span`
  color: ${tokens.color.primary};
`;

const Badge = styled.span<{ $concrete: boolean }>`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1px ${tokens.space.xs};
  border-radius: ${tokens.radius.sm};
  color: ${(p) => (p.$concrete ? tokens.color.accent : tokens.color.fgMuted)};
  border: 1px solid
    ${(p) => (p.$concrete ? tokens.color.accent : tokens.color.border)};
`;

const Desc = styled.p`
  margin: 0;
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fgMuted};
`;

const Field = styled.div`
  display: flex;
  gap: ${tokens.space.sm};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const FieldLabel = styled.span`
  flex: none;
  width: 6rem;
  color: ${tokens.color.fgMuted};
`;

const FieldValue = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fg};
  word-break: break-word;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${tokens.space.md};
  margin-top: ${tokens.space.sm};
`;

const Button = styled.button`
  background: ${tokens.color.primary};
  border: none;
  border-radius: ${tokens.radius.md};
  color: ${tokens.color.fg};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.lg};
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${tokens.color.primaryHover};
  }
  &:disabled {
    background: ${tokens.color.actionBg};
    color: ${tokens.color.fgMuted};
    cursor: default;
  }
`;

const GhostButton = styled(Button)`
  background: transparent;
  border: 1px solid ${tokens.color.border};
  color: ${tokens.color.fgMuted};

  &:hover:not(:disabled) {
    color: ${tokens.color.fg};
    border-color: ${tokens.color.primary};
    background: transparent;
  }
`;

const BackBar = styled.div`
  padding: ${tokens.space.sm} 0;
`;

const Empty = styled.div`
  padding: ${tokens.space.md};
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-style: italic;
`;

export const BlueprintDetailView: React.FC = () => {
  const bp = useStore((s) => s.studio.selectedBlueprint);
  const beginTemplate = useStore((s) => s.studioBeginTemplate);
  const beginComposer = useStore((s) => s.studioBeginComposer);
  const goCatalogue = useStore((s) => s.studioGoCatalogue);
  const listPalette = useStore((s) => s.studioListPalette);
  const palette = useStore((s) => s.studio.palette);

  // The composer's pre-seed needs the palette's implied-mixin sets.
  React.useEffect(() => {
    if (palette === null) void listPalette();
  }, [palette, listPalette]);

  if (!bp) {
    return <Empty>No blueprint selected.</Empty>;
  }

  const instantiable = !!bp.classPath;

  return (
    <Wrap>
      <BackBar>
        <GhostButton
          type="button"
          title="Back to the kinds catalogue"
          onClick={() => goCatalogue()}
        >
          ← Back to catalogue
        </GhostButton>
      </BackBar>

      <TitleRow>
        {bp.blessed && <Star title="Blessed (curated)">★</Star>}
        <Title>{bp.name}</Title>
        <Badge $concrete={bp.kind === "concrete"}>{bp.kind}</Badge>
      </TitleRow>

      {bp.description && <Desc>{bp.description}</Desc>}

      <Field>
        <FieldLabel>Base class</FieldLabel>
        <FieldValue>{bp.baseClass}</FieldValue>
      </Field>
      <Field>
        <FieldLabel>Mixins</FieldLabel>
        <FieldValue>
          {bp.mixinNames.length > 0 ? bp.mixinNames.join(", ") : "(none)"}
        </FieldValue>
      </Field>
      {bp.classPath && (
        <Field>
          <FieldLabel>Class path</FieldLabel>
          <FieldValue>{bp.classPath}</FieldValue>
        </Field>
      )}

      <Actions>
        <Button
          type="button"
          disabled={!instantiable}
          title={
            instantiable
              ? `Create a new template instantiating ${bp.classPath}`
              : "This composition has no backing class yet — author a kind first"
          }
          onClick={() => beginTemplate(bp)}
        >
          New template from this →
        </Button>
        <GhostButton
          type="button"
          title={`Compose a new backing class starting from ${bp.name}`}
          onClick={() => beginComposer(bp)}
        >
          Author a new kind from this →
        </GhostButton>
      </Actions>
    </Wrap>
  );
};
