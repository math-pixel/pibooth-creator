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
      <button className="icon-button" title="Annuler (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
        ↶
      </button>
      <button className="icon-button" title="Rétablir (Ctrl+Y)" onClick={redo} disabled={!canRedo}>
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
          <p>Créez visuellement vos templates pour le plugin pibooth-picture-template, sans XML ni éditeur de diagramme.</p>
        </div>
        <UndoRedoButtons />
        <div className="app-header-badge" title="Les images de premier plan (cadres, overlays) sont nativement supportées par le plugin via l'ordre des calques (équivalent de l'option « To Front » de draw.io).">
          ✓ Premier plan supporté nativement par pibooth
        </div>
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
