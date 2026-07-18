import { usePlannerStore, type Selection } from '../../store/usePlannerStore'
import {
  LineDialog,
  ChoiceDialog,
  ConditionalDialog,
  type DialogKind,
  type ChoiceOption,
} from '../../model/nodes'
import { ALL_COMPARE_OPS } from '../../model/CompareOp'
import { TagPicker } from '../shared/TagPicker'
import { SpeakerPicker } from '../shared/SpeakerPicker'
import { VariableSelect } from '../shared/VariableSelect'
import { VariableEffectEditor } from '../shared/VariableEffectEditor'

interface Props {
  selection: Selection & { type: 'dialog' }
}

export function DialogForm({ selection }: Props) {
  const { sceneId, visualId, dialogId } = selection

  const project = usePlannerStore(s => s.project)
  const updateDialogField = usePlannerStore(s => s.updateDialogField)
  const switchKind = usePlannerStore(s => s.switchKind)
  const deleteDialog = usePlannerStore(s => s.deleteDialog)
  const addChoiceOption = usePlannerStore(s => s.addChoiceOption)
  const updateChoiceOption = usePlannerStore(s => s.updateChoiceOption)
  const removeChoiceOption = usePlannerStore(s => s.removeChoiceOption)
  const startLinkPick = usePlannerStore(s => s.startLinkPick)
  const pushHistory = usePlannerStore(s => s.pushHistory)

  const scene = project.scenes.find(s => s.id === sceneId)
  const visual = scene?.visuals.find(v => v.id === visualId)
  const dialog = visual?.dialogs.find(d => d.id === dialogId)

  if (!dialog) return <div className="form-empty">Select a dialog</div>

  function handleDelete() {
    const msg = deleteDialog(sceneId, visualId, dialogId)
    if (msg) alert(msg)
  }

  function handleKindChange(kind: DialogKind) {
    if (kind !== dialog!.kind) switchKind(sceneId, visualId, dialogId, kind)
  }

  const dialogNames =
    scene?.visuals.reduce<Record<string, string>>((acc, v) => {
      for (const d of v.dialogs) {
        if (d.kind === 'line') acc[d.id] = (d as LineDialog).text.slice(0, 30) || `(line)`
        else if (d.kind === 'choice') acc[d.id] = (d as ChoiceDialog).text.slice(0, 30) || `(choice)`
        else acc[d.id] = `(conditional)`
      }
      return acc
    }, {}) ?? {}

  return (
    <div className="dialog-form">
      <div className="form-header">
        <span className="form-title">Dialog</span>
        <button className="icon-btn danger" onClick={handleDelete} title="Delete dialog">
          Delete
        </button>
      </div>

      <div className="form-row">
        <label>Kind</label>
        <div className="kind-tabs">
          {(['line', 'choice', 'conditional'] as DialogKind[]).map(k => (
            <button
              key={k}
              type="button"
              className={`kind-tab ${dialog.kind === k ? 'active' : ''}`}
              onClick={() => handleKindChange(k)}
            >
              {k === 'line' ? '💬 Line' : k === 'choice' ? '🔀 Choice' : '❓ Cond.'}
            </button>
          ))}
        </div>
      </div>

      <div className="form-row">
        <label>Tags</label>
        <TagPicker
          value={dialog.tagIds}
          onChange={tagIds => updateDialogField(sceneId, visualId, dialogId, { tagIds })}
        />
      </div>

      {(dialog.kind === 'line' || dialog.kind === 'choice') && (
        <>
          {dialog.kind === 'line' && (
            <div className="form-row">
              <label>Speaker</label>
              <SpeakerPicker
                value={(dialog as LineDialog).speakerId}
                onChange={speakerId =>
                  updateDialogField(sceneId, visualId, dialogId, {
                    speakerId,
                  } as Partial<LineDialog>)
                }
              />
            </div>
          )}
          <div className="form-row">
            <label>Text</label>
            <textarea
              value={
                dialog.kind === 'line'
                  ? (dialog as LineDialog).text
                  : (dialog as ChoiceDialog).text
              }
              onChange={e =>
                updateDialogField(sceneId, visualId, dialogId, {
                  text: e.target.value,
                } as Partial<LineDialog>)
              }
              onBlur={pushHistory}
              placeholder={
                dialog.kind === 'choice'
                  ? 'Prompt text (optional). Markdown: **bold**, *italic*, `code`…'
                  : 'Dialog text. Markdown: **bold**, *italic*, `code`, [link](url)…'
              }
              rows={4}
            />
          </div>
        </>
      )}

      {dialog.kind === 'choice' && (
        <div className="form-section">
          <div className="section-title">Options</div>
          {(dialog as ChoiceDialog).options.map((opt, i) => (
            <ChoiceOptionEditor
              key={opt.id}
              option={opt}
              index={i}
              dialogNames={dialogNames ?? {}}
              onUpdate={updated => updateChoiceOption(sceneId, visualId, dialogId, updated)}
              onRemove={() => removeChoiceOption(sceneId, visualId, dialogId, opt.id)}
              onPickLink={() =>
                startLinkPick({
                  sourceId: dialogId,
                  slot: { optionId: opt.id },
                  visualId,
                  sceneId,
                })
              }
              onBlur={pushHistory}
            />
          ))}
          <button
            className="add-btn"
            onClick={() => addChoiceOption(sceneId, visualId, dialogId)}
          >
            + Add option
          </button>
        </div>
      )}

      {dialog.kind === 'conditional' && (
        <div className="form-section">
          <div className="section-title">Condition</div>
          <div className="conditional-row">
            <span>if</span>
            <VariableSelect
              value={(dialog as ConditionalDialog).condition.variableId}
              onChange={id =>
                updateDialogField(sceneId, visualId, dialogId, {
                  condition: { ...(dialog as ConditionalDialog).condition, variableId: id },
                } as Partial<ConditionalDialog>)
              }
            />
            <select
              value={(dialog as ConditionalDialog).condition.op}
              onChange={e =>
                updateDialogField(sceneId, visualId, dialogId, {
                  condition: {
                    ...(dialog as ConditionalDialog).condition,
                    op: e.target.value as never,
                  },
                } as Partial<ConditionalDialog>)
              }
            >
              {ALL_COMPARE_OPS.map(op => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={(dialog as ConditionalDialog).condition.value}
              onChange={e =>
                updateDialogField(sceneId, visualId, dialogId, {
                  condition: {
                    ...(dialog as ConditionalDialog).condition,
                    value: Number(e.target.value),
                  },
                } as Partial<ConditionalDialog>)
              }
              onBlur={pushHistory}
              style={{ width: 70 }}
            />
          </div>
          <div className="form-row branch-row">
            <label>True →</label>
            <span className="linked-dialog">
              {(dialog as ConditionalDialog).trueNextId
                ? (dialogNames?.[(dialog as ConditionalDialog).trueNextId!] ?? 'linked')
                : 'none'}
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                startLinkPick({ sourceId: dialogId, slot: 'trueNextId', visualId, sceneId })
              }
            >
              Pick…
            </button>
          </div>
          <div className="form-row branch-row">
            <label>False →</label>
            <span className="linked-dialog">
              {(dialog as ConditionalDialog).falseNextId
                ? (dialogNames?.[(dialog as ConditionalDialog).falseNextId!] ?? 'linked')
                : 'none'}
            </span>
            <button
              type="button"
              className="link-btn"
              onClick={() =>
                startLinkPick({ sourceId: dialogId, slot: 'falseNextId', visualId, sceneId })
              }
            >
              Pick…
            </button>
          </div>
        </div>
      )}

      {dialog.kind === 'line' && (
        <div className="form-row branch-row">
          <label>Next →</label>
          <span className="linked-dialog">
            {(dialog as LineDialog).nextId
              ? (dialogNames?.[(dialog as LineDialog).nextId!] ?? 'linked')
              : 'none (terminal)'}
          </span>
          <button
            type="button"
            className="link-btn"
            onClick={() =>
              startLinkPick({ sourceId: dialogId, slot: 'nextId', visualId, sceneId })
            }
          >
            Pick…
          </button>
          {(dialog as LineDialog).nextId && (
            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                updateDialogField(sceneId, visualId, dialogId, {
                  nextId: null,
                } as Partial<LineDialog>)
              }
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Choice option sub-component ─────────────────────────────────────────────

interface ChoiceOptionEditorProps {
  option: ChoiceOption
  index: number
  dialogNames: Record<string, string>
  onUpdate: (opt: ChoiceOption) => void
  onRemove: () => void
  onPickLink: () => void
  onBlur: () => void
}

function ChoiceOptionEditor({
  option,
  index,
  dialogNames,
  onUpdate,
  onRemove,
  onPickLink,
  onBlur,
}: ChoiceOptionEditorProps) {
  return (
    <div className="choice-option">
      <div className="option-header">
        <span className="option-label">Option {index + 1}</span>
        <button className="icon-btn danger" onClick={onRemove} title="Remove option">
          ×
        </button>
      </div>
      <div className="form-row">
        <label>Label</label>
        <input
          type="text"
          value={option.label}
          onChange={e => onUpdate({ ...option, label: e.target.value })}
          onBlur={onBlur}
          placeholder="Option label…"
        />
      </div>
      <div className="form-row">
        <label>Effects</label>
        <VariableEffectEditor
          effects={option.effects}
          onChange={effects => onUpdate({ ...option, effects })}
        />
      </div>
      <div className="form-row branch-row">
        <label>→ Next</label>
        <span className="linked-dialog">
          {option.nextId ? (dialogNames[option.nextId] ?? 'linked') : 'none'}
        </span>
        <button type="button" className="link-btn" onClick={onPickLink}>
          Pick…
        </button>
      </div>
    </div>
  )
}
