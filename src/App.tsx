import { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CanvasEditor from './components/CanvasEditor';
import RightPanel from './components/RightPanel';
import Toaster from './components/Toaster';
import { useStore } from './store';
import './App.css';

function useUndoRedoShortcuts() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (!ctrlOrCmd) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);
}

function UndoRedoButtons() {
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

  return (
    <div className="undo-redo-group">
      <button className="icon-button" title="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
        ↶
      </button>
      <button className="icon-button" title="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
        ↷
      </button>
    </div>
  );
}

export default function App() {
  useUndoRedoShortcuts();

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Pibooth Creator</h1>
          <p>Visually build templates for the pibooth-picture-template plugin — no XML, no diagram editor.</p>
        </div>
        <UndoRedoButtons />
      </header>
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <CanvasEditor />
        </main>
        <RightPanel />
      </div>
      <Toaster />
    </div>
  );
}
