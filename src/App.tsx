import Sidebar from './components/Sidebar';
import CanvasEditor from './components/CanvasEditor';
import RightPanel from './components/RightPanel';
import Toaster from './components/Toaster';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Pibooth Creator</h1>
          <p>Créez visuellement vos templates pour le plugin pibooth-picture-template, sans XML ni éditeur de diagramme.</p>
        </div>
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
