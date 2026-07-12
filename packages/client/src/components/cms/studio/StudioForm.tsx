/**
 * StudioForm — the schema-driven composer form.
 *
 * Renders `description.fields` (from `StudioApi.describeClass`) through the
 * widget registry, one control per authorable field. A header toggle
 * flips to the raw-JSON Monaco editor (advanced mode) over the SAME data:
 * both surfaces read/write the single slice overlay (`baseData` + `edits`
 * + `cleared`), and `studioSerialize()` produces the body the existing CMS
 * content-write path persists (byte-identical to the raw editor for an
 * unedited round-trip).
 *
 * The form is a projection: it never validates authorization or command
 * semantics; the server re-validates on save.
 */

import React from "react";
import styled from "styled-components";
import type { StudioFieldDescriptor } from "@saxonberg/types";
import { useStore } from "../../../store/index";
import { MonacoLazy } from "../MonacoLazy";
import { widgetFor } from "./widgets";
import { tokens } from "../../ui";

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const ModeToggle = styled.button<{ $active: boolean }>`
  background: ${(p) => (p.$active ? tokens.color.primary : tokens.color.actionBg)};
  color: ${(p) => (p.$active ? tokens.color.fg : tokens.color.fgMuted)};
  border: none;
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.md};
  cursor: pointer;
`;

const Spacer = styled.div`
  flex: 1;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: ${tokens.space.md};
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  padding: ${tokens.space.sm} 0;
  border-bottom: 1px solid ${tokens.color.borderMuted};
`;

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${tokens.space.sm};
`;

const FieldName = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};
  color: ${tokens.color.fg};
`;

const MixinTag = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.sectionLabel};
`;

const SourceTag = styled.span`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Desc = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const ResetButton = styled.button`
  background: transparent;
  border: none;
  color: ${tokens.color.accent};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  cursor: pointer;
  padding: 0;
`;

const EditorBody = styled.div`
  flex: 1;
  min-height: 0;
`;

const Empty = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: ${tokens.color.fgMuted};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  font-style: italic;
`;

/** Effective value + set-ness for one field, over the slice overlay. */
function fieldState(
  studio: {
    baseData: Record<string, unknown>;
    edits: Record<string, unknown>;
    cleared: string[];
  },
  name: string,
): { value: unknown; isSet: boolean } {
  if (Object.prototype.hasOwnProperty.call(studio.edits, name)) {
    return { value: studio.edits[name], isSet: true };
  }
  if (studio.cleared.includes(name)) {
    return { value: undefined, isSet: false };
  }
  if (Object.prototype.hasOwnProperty.call(studio.baseData, name)) {
    return { value: studio.baseData[name], isSet: true };
  }
  return { value: undefined, isSet: false };
}

const FieldControl: React.FC<{ descriptor: StudioFieldDescriptor }> = ({
  descriptor,
}) => {
  const studio = useStore((s) => s.studio);
  const studioSetField = useStore((s) => s.studioSetField);
  const studioClearField = useStore((s) => s.studioClearField);
  const { value, isSet } = fieldState(studio, descriptor.name);
  const Widget = widgetFor(descriptor);
  return (
    <Row>
      <LabelRow>
        <FieldName>{descriptor.name}</FieldName>
        <MixinTag>{descriptor.mixin}</MixinTag>
        <SourceTag>
          {isSet ? "local" : `inherited · ${descriptor.valueSource}`}
        </SourceTag>
        <Spacer />
        {isSet && (
          <ResetButton
            type="button"
            onClick={() => studioClearField(descriptor.name)}
          >
            reset to inherit
          </ResetButton>
        )}
      </LabelRow>
      {descriptor.description && <Desc>{descriptor.description}</Desc>}
      <Widget
        descriptor={descriptor}
        value={value}
        isSet={isSet}
        onChange={(v) => studioSetField(descriptor.name, v)}
      />
    </Row>
  );
};

export const StudioForm: React.FC = () => {
  const description = useStore((s) => s.studio.description);
  const advanced = useStore((s) => s.studio.advanced);
  const loading = useStore((s) => s.studio.loading);
  const studioToggleAdvanced = useStore((s) => s.studioToggleAdvanced);
  const studioSerialize = useStore((s) => s.studioSerialize);
  const studioLoadData = useStore((s) => s.studioLoadData);

  if (loading) {
    return <Empty>Describing class…</Empty>;
  }
  if (!description) {
    return <Empty>No class schema loaded.</Empty>;
  }

  return (
    <Wrap>
      <Toolbar>
        <ModeToggle
          type="button"
          $active={!advanced}
          onClick={() => {
            if (advanced) studioToggleAdvanced();
          }}
        >
          Form
        </ModeToggle>
        <ModeToggle
          type="button"
          $active={advanced}
          onClick={() => {
            if (!advanced) studioToggleAdvanced();
          }}
        >
          Raw JSON
        </ModeToggle>
        <Spacer />
        <SourceTag>{description.classPath}</SourceTag>
      </Toolbar>
      {advanced ? (
        <EditorBody>
          <MonacoLazy
            language="json"
            value={studioSerialize()}
            onChange={(text) => studioLoadData(text)}
          />
        </EditorBody>
      ) : (
        <Body>
          {description.fields.length === 0 ? (
            <Empty>This class exposes no authorable fields.</Empty>
          ) : (
            description.fields.map((f) => (
              <FieldControl key={`${f.mixin}:${f.name}`} descriptor={f} />
            ))
          )}
        </Body>
      )}
    </Wrap>
  );
};
