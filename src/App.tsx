import { useEffect } from 'react'
import { AppLayout } from './components/layout/AppLayout'
import { usePlannerStore } from './store/usePlannerStore'
import './App.css'

export default function App() {
  const undo = usePlannerStore(s => s.undo)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo])

  return <AppLayout />
}
