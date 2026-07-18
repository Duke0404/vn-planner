import { useCallback, useRef, useState } from 'react'
import { usePlannerStore } from '../../store/usePlannerStore'
import { PlannerGraph } from '../graph/PlannerGraph'
import { DialogForm } from '../dialog/DialogForm'
import { SceneVisualForm } from '../dialog/SceneVisualForm'
import { VariableRangesSidebar } from '../sidebar/VariableRangesSidebar'
import { ConfigDrawer } from '../config/ConfigDrawer'

export function AppLayout() {
  const addScene = usePlannerStore(s => s.addScene)
  const undo = usePlannerStore(s => s.undo)
  const history = usePlannerStore(s => s.history)
  const setConfigOpen = usePlannerStore(s => s.setConfigOpen)
  const exportProject = usePlannerStore(s => s.exportProject)
  const importProject = usePlannerStore(s => s.importProject)
  const selection = usePlannerStore(s => s.selection)
  const fileRef = useRef<HTMLInputElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleImport = useCallback(() => {
    fileRef.current?.click()
  }, [])

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        if (typeof ev.target?.result === 'string') {
          importProject(ev.target.result)
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [importProject],
  )

  return (
    <div className="app-layout">
      <header className="toolbar">
        <span className="app-title">🎭 VN Planner</span>
        <div className="toolbar-actions">
          <button
            className="btn"
            onClick={undo}
            disabled={!history.length}
            title="Undo (Ctrl+Z)"
          >
            ↩ Undo
          </button>
          <button className="btn" onClick={() => setConfigOpen(true)}>⚙ Config</button>
        </div>
        <div className="toolbar-right">
          <button className="btn" onClick={exportProject}>Export ↓</button>
          <button className="btn" onClick={handleImport}>Import ↑</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </header>

      <div className="main-content">
        <div className="graph-area">
          <button
            type="button"
            className="graph-add-scene-btn icon-btn"
            title="Add parallel scene"
            onClick={addScene}
          >
            +
          </button>
          <PlannerGraph />
        </div>

        {!sidebarOpen && (
          <button
            type="button"
            className="sidebar-reopen"
            onClick={() => setSidebarOpen(true)}
            title="Open inspector panel"
          >
            ⟨
          </button>
        )}

        <aside className={`right-panels ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="right-panels-header">
            <span className="right-panels-title">Inspector</span>
            <button
              type="button"
              className="icon-btn sidebar-collapse-btn"
              onClick={() => setSidebarOpen(false)}
              title="Collapse panel"
            >
              ⟩
            </button>
          </div>
          <div className="form-panel">
            {selection?.type === 'dialog' ? (
              <DialogForm selection={selection} />
            ) : selection?.type === 'scene' || selection?.type === 'visual' ? (
              <SceneVisualForm selection={selection} />
            ) : (
              <div className="form-empty">
                <p>Select a node to edit it.</p>
                <p className="text-muted">Click a scene, visual, or dialog in the graph.</p>
              </div>
            )}
          </div>
          <VariableRangesSidebar />
        </aside>
      </div>

      <ConfigDrawer />
    </div>
  )
}
