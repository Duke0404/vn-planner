import { usePlannerStore, type Selection } from '../../store/usePlannerStore'
import { TagPicker } from '../shared/TagPicker'

interface Props {
  selection: Selection & { type: 'scene' | 'visual' }
}

export function SceneVisualForm({ selection }: Props) {
  const project = usePlannerStore(s => s.project)
  const updateSceneName = usePlannerStore(s => s.updateSceneName)
  const updateSceneTags = usePlannerStore(s => s.updateSceneTags)
  const deleteScene = usePlannerStore(s => s.deleteScene)
  const updateVisualName = usePlannerStore(s => s.updateVisualName)
  const updateVisualDescription = usePlannerStore(s => s.updateVisualDescription)
  const updateVisualTags = usePlannerStore(s => s.updateVisualTags)
  const deleteVisual = usePlannerStore(s => s.deleteVisual)
  const pushHistory = usePlannerStore(s => s.pushHistory)

  if (selection.type === 'scene') {
    const scene = project.scenes.find(s => s.id === selection.sceneId)
    if (!scene) return null

    return (
      <div className="dialog-form">
        <div className="form-header">
          <span className="form-title">🎬 Scene</span>
          <button className="icon-btn danger" onClick={() => deleteScene(selection.sceneId)}>
            Delete
          </button>
        </div>
        <div className="form-row">
          <label>Name</label>
          <input
            type="text"
            value={scene.name}
            onChange={e => updateSceneName(selection.sceneId, e.target.value)}
            onBlur={pushHistory}
            placeholder="Scene name…"
          />
        </div>
        <div className="form-row">
          <label>Tags</label>
          <TagPicker
            value={scene.tagIds}
            onChange={tagIds => updateSceneTags(selection.sceneId, tagIds)}
          />
        </div>
      </div>
    )
  }

  const scene = project.scenes.find(s => s.id === selection.sceneId)
  const visual = scene?.visuals.find(v => v.id === selection.visualId)
  if (!visual) return null

  return (
    <div className="dialog-form">
      <div className="form-header">
        <span className="form-title">🖼 Visual</span>
        <button
          className="icon-btn danger"
          onClick={() => deleteVisual(selection.sceneId, selection.visualId)}
        >
          Delete
        </button>
      </div>
      <div className="form-row">
        <label>Name</label>
        <input
          type="text"
          value={visual.name}
          onChange={e => updateVisualName(selection.sceneId, selection.visualId, e.target.value)}
          onBlur={pushHistory}
          placeholder="Visual name…"
        />
      </div>
      <div className="form-row">
        <label>Description</label>
        <textarea
          value={visual.description}
          onChange={e =>
            updateVisualDescription(selection.sceneId, selection.visualId, e.target.value)
          }
          onBlur={pushHistory}
          placeholder="Visual description…"
          rows={3}
        />
      </div>
      <div className="form-row">
        <label>Tags</label>
        <TagPicker
          value={visual.tagIds}
          onChange={tagIds => updateVisualTags(selection.sceneId, selection.visualId, tagIds)}
        />
      </div>
    </div>
  )
}
