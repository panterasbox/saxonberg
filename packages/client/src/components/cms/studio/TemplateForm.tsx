/**
 * TemplateForm — the ONLY place the data form lives (creation act #1:
 * instantiate a NEW content template pointing at an approved backing class).
 *
 * Header names the blueprint being instantiated; a target-path input names
 * where the template lands. The body is a Form/YAML toggle over the SAME merged
 * data object: the Form renders `describeClass` fields through the shared
 * `widgets/` registry over the slice overlay (baseData `{}` for a new template,
 * edits overlay it); the YAML view is an alternate editor of that data object
 * (`studioMergedData` serialized to YAML, parsed back on change). Save calls
 * `createTemplate` and surfaces the server DISPOSITION inline — committed
 * (offer "open in Files") or denied (the message, e.g. the wizard-lockdown
 * refusal) — never a bare boolean.
 *
 * A projection: it never validates authorization or command semantics; the
 * server re-validates on save.
 */

import React from "react";
import YAML from "yaml";
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

const BackBar = styled.div`
  padding: ${tokens.space.sm} ${tokens.space.md};
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${tokens.space.xs};
  padding: 0 ${tokens.space.md} ${tokens.space.sm};
`;

const HeadTitle = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.title};
  color: ${tokens.color.fg};
`;

const ClassRef = styled.span`
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-top: 1px solid ${tokens.color.borderMuted};
  border-bottom: 1px solid ${tokens.color.borderMuted};
  background: ${tokens.color.surface};
`;

const PathInput = styled.input`
  flex: 1;
  box-sizing: border-box;
  background: ${tokens.color.surfaceSunken};
  color: ${tokens.color.fg};
  border: 1px solid ${tokens.color.border};
  border-radius: ${tokens.radius.md};
  padding: ${tokens.space.xs} ${tokens.space.sm};
  font-family: ${tokens.font.mono};
  font-size: ${tokens.font.small};

  &:focus {
    outline: none;
    border-color: ${tokens.color.primary};
  }
`;

const ModeToggle = styled.button<{ $active: boolean }>`
  background: ${(p) =>
    p.$active ? tokens.color.primary : tokens.color.actionBg};
  color: ${(p) => (p.$active ? tokens.color.fg : tokens.color.fgMuted)};
  border: none;
  border-radius: ${tokens.radius.md};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
  padding: ${tokens.space.xs} ${tokens.space.md};
  cursor: pointer;
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

const Disposition = styled.div<{ $denied: boolean }>`
  display: flex;
  align-items: center;
  gap: ${tokens.space.md};
  padding: ${tokens.space.sm} ${tokens.space.md};
  border-bottom: 1px solid
    ${(p) => (p.$denied ? tokens.color.danger : tokens.color.borderMuted)};
  color: ${(p) => (p.$denied ? tokens.color.danger : tokens.color.accent)};
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.small};
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: ${tokens.space.md};
`;

const EditorBody = styled.div`
  flex: 1;
  min-height: 0;
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

const Spacer = styled.div`
  flex: 1;
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

const Descr = styled.div`
  font-family: ${tokens.font.family};
  font-size: ${tokens.font.micro};
  color: ${tokens.color.fgMuted};
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
  padding: ${tokens.space.md};
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
  const setField = useStore((s) => s.studioSetField);
  const clearField = useStore((s) => s.studioClearField);
  const { value, isSet } = fieldState(studio, descriptor.name);
  const Widget = widgetFor(descriptor);
  return (
    <Row>
      <LabelRow>
        <FieldName>{descriptor.name}</FieldName>
        <MixinTag>{descriptor.mixin}</MixinTag>
        <Spacer />
        {isSet && (
          <ResetButton
            type="button"
            onClick={() => clearField(descriptor.name)}
          >
            clear
          </ResetButton>
        )}
      </LabelRow>
      {descriptor.description && <Descr>{descriptor.description}</Descr>}
      <Widget
        descriptor={descriptor}
        value={value}
        isSet={isSet}
        onChange={(v) => setField(descriptor.name, v)}
      />
    </Row>
  );
};

/**
 * The YAML editor over the merged data object. Buffers text locally so a
 * mid-edit invalid keystroke isn't discarded; commits through
 * `studioSetDataObject` only when the text parses to a plain object.
 */
const YamlEditor: React.FC = () => {
  const mergedData = useStore((s) => s.studioMergedData);
  const setDataObject = useStore((s) => s.studioSetDataObject);
  const initial = React.useMemo(() => {
    const data = mergedData();
    return Object.keys(data).length === 0 ? "" : YAML.stringify(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [text, setText] = React.useState(initial);
  const [invalid, setInvalid] = React.useState(false);
  return (
    <>
      {invalid && (
        <Disposition $denied role="status">
          Invalid YAML — not applied.
        </Disposition>
      )}
      <EditorBody>
        <MonacoLazy
          language="yaml"
          value={text}
          onChange={(next) => {
            setText(next);
            if (next.trim() === "") {
              setDataObject({});
              setInvalid(false);
              return;
            }
            try {
              const parsed: unknown = YAML.parse(next);
              if (
                parsed === null ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
              ) {
                setInvalid(true);
                return;
              }
              setDataObject(parsed as Record<string, unknown>);
              setInvalid(false);
            } catch {
              setInvalid(true);
            }
          }}
        />
      </EditorBody>
    </>
  );
};

export const TemplateForm: React.FC<{
  onOpenInFiles?: (path: string) => void;
}> = ({ onOpenInFiles }) => {
  const template = useStore((s) => s.studio.template);
  const description = useStore((s) => s.studio.description);
  const loading = useStore((s) => s.studio.loading);
  const error = useStore((s) => s.studio.error);
  const result = useStore((s) => s.studio.templateResult);
  const busy = useStore((s) => s.studio.busy);
  const csrf = useStore((s) => s.cms.csrf);
  const setPath = useStore((s) => s.studioSetTemplatePath);
  const toggleYaml = useStore((s) => s.studioToggleTemplateYaml);
  const createTemplate = useStore((s) => s.studioCreateTemplate);
  const selectBlueprint = useStore((s) => s.studioSelectBlueprint);
  const selected = useStore((s) => s.studio.selectedBlueprint);

  if (!template) {
    return <Empty>No template in progress.</Empty>;
  }

  const denied = result?.disposition === "denied";
  const committed = result?.disposition === "committed";
  const yamlMode = template.yamlMode;
  const pathValid = template.path.trim().startsWith("/");
  const canSave = !!csrf && pathValid && !busy;

  return (
    <Wrap>
      <BackBar>
        <GhostButton
          type="button"
          title="Back to the blueprint detail"
          onClick={() => selected && selectBlueprint(selected)}
        >
          ← Back to blueprint
        </GhostButton>
      </BackBar>

      <Header>
        <HeadTitle>
          New template · instantiating {template.blueprintName}
        </HeadTitle>
        <ClassRef>{template.classPath}</ClassRef>
      </Header>

      <Toolbar>
        <PathInput
          value={template.path}
          placeholder="/obj/MyCoin"
          spellCheck={false}
          aria-label="New template path"
          title="Where the new template lands (e.g. /obj/MyCoin)"
          onChange={(e) => setPath(e.target.value)}
        />
        <ModeToggle
          type="button"
          $active={!yamlMode}
          title="Edit the data as a field form"
          onClick={() => yamlMode && toggleYaml()}
        >
          Form
        </ModeToggle>
        <ModeToggle
          type="button"
          $active={yamlMode}
          title="Edit the same data as YAML"
          onClick={() => !yamlMode && toggleYaml()}
        >
          YAML
        </ModeToggle>
        <Button
          type="button"
          disabled={!canSave}
          title={
            pathValid
              ? `Create template ${template.path}`
              : "Enter an absolute target path (e.g. /obj/MyCoin)"
          }
          onClick={() => csrf && void createTemplate(csrf)}
        >
          {busy ? "Saving…" : "Save"}
        </Button>
      </Toolbar>

      {result && (
        <Disposition $denied={denied} role="status">
          {denied ? (
            <span>Denied: {result.message ?? "the save was refused"}</span>
          ) : (
            <>
              <span>Committed template {result.path ?? template.path}.</span>
              {committed && onOpenInFiles && (
                <GhostButton
                  type="button"
                  title="Open the new template in the Files tab"
                  onClick={() =>
                    onOpenInFiles(result.path ?? template.path)
                  }
                >
                  Open in Files →
                </GhostButton>
              )}
            </>
          )}
        </Disposition>
      )}

      {error && (
        <Disposition $denied role="status">
          {error}
        </Disposition>
      )}

      {yamlMode ? (
        <YamlEditor />
      ) : loading ? (
        <Empty>Describing class…</Empty>
      ) : !description ? (
        <Empty>No class schema loaded.</Empty>
      ) : description.fields.length === 0 ? (
        <Empty>This class exposes no authorable fields.</Empty>
      ) : (
        <Body>
          {description.fields.map((f) => (
            <FieldControl key={`${f.mixin}:${f.name}`} descriptor={f} />
          ))}
        </Body>
      )}
    </Wrap>
  );
};
