import { useEffect, useRef } from 'react'
import { usePlannerStore } from '../../store/usePlannerStore'
import type { DialogKind } from '../../model/nodes'

export function NodeContextMenu() {
  const contextMenu = usePlannerStore(s => s.contextMenu)
  const closeContextMenu = usePlannerStore(s => s.closeContextMenu)
  const addDialogParallel = usePlannerStore(s => s.addDialogParallel)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenu) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeContextMenu()
    }

    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeContextMenu()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [contextMenu, closeContextMenu])

  if (!contextMenu || contextMenu.kind !== 'dialog') return null

  const dialogMenu = contextMenu

  function addParallelDialog(kind: DialogKind) {
    addDialogParallel(dialogMenu.sceneId, dialogMenu.visualId, kind)
    closeContextMenu()
  }

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: dialogMenu.x,
    top: dialogMenu.y,
    zIndex: 200,
  }

  return (
    <div ref={ref} className="node-context-menu" style={menuStyle} onContextMenu={e => e.preventDefault()}>
      <div className="context-menu-label">Add parallel dialog</div>
      <button type="button" className="context-menu-item" onClick={() => addParallelDialog('line')}>
        💬 Line
      </button>
      <button type="button" className="context-menu-item" onClick={() => addParallelDialog('choice')}>
        🔀 Choice
      </button>
      <button type="button" className="context-menu-item" onClick={() => addParallelDialog('conditional')}>
        ❓ Conditional
      </button>
    </div>
  )
}
