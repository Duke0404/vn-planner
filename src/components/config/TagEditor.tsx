import type { Tag } from '../../model/tags'
import { usePlannerStore } from '../../store/usePlannerStore'
import { ColorInput } from '../shared/ColorInput'

interface NodeProps {
  tag: Tag
  depth: number
}

function TagNode({ tag, depth }: NodeProps) {
  const updateTag = usePlannerStore(s => s.updateTag)
  const deleteTag = usePlannerStore(s => s.deleteTag)
  const addSubTag = usePlannerStore(s => s.addSubTag)

  return (
    <div style={{ paddingLeft: depth * 16 }} className="tag-node">
      <div className="tag-row">
        <ColorInput
          value={tag.color}
          onChange={color => updateTag(tag.id, { color })}
          title="Tag color"
        />
        <input
          type="text"
          value={tag.name}
          onChange={e => updateTag(tag.id, { name: e.target.value })}
          placeholder="Tag name"
          style={{ flex: 1 }}
        />
        <button type="button" className="icon-btn" onClick={() => addSubTag(tag.id)}>
          +sub
        </button>
        <button type="button" className="icon-btn danger" onClick={() => deleteTag(tag.id)}>
          ×
        </button>
      </div>
      {tag.children.map(child => (
        <TagNode key={child.id} tag={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export function TagEditor() {
  const tags = usePlannerStore(s => s.project.tags)
  const addRootTag = usePlannerStore(s => s.addRootTag)

  return (
    <div className="tag-editor">
      <div className="editor-section-title">Tags</div>
      {tags.map(t => (
        <TagNode key={t.id} tag={t} depth={0} />
      ))}
      <button className="add-btn" onClick={addRootTag}>
        + Add tag
      </button>
    </div>
  )
}
