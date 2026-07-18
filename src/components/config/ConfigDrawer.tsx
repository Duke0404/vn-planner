import { usePlannerStore } from '../../store/usePlannerStore'
import { VariableEditor } from './VariableEditor'
import { TagEditor } from './TagEditor'
import { SpeakerEditor } from './SpeakerEditor'

export function ConfigDrawer() {
  const open = usePlannerStore(s => s.configOpen)
  const setOpen = usePlannerStore(s => s.setConfigOpen)

  if (!open) return null

  return (
    <div className="drawer-overlay" onClick={() => setOpen(false)}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header">
          <span className="drawer-title">⚙ Config</span>
          <button className="icon-btn" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="drawer-body">
          <VariableEditor />
          <div className="drawer-divider" />
          <TagEditor />
          <div className="drawer-divider" />
          <SpeakerEditor />
        </div>
      </div>
    </div>
  )
}
