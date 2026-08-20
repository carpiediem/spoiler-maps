import { useState } from 'react';
import { MapView } from './components/MapView';
import { TileSourceSidebar } from './components/TileSourceSidebar';
import './App.css';

function App() {
  const [tileUrl, setTileUrl] = useState<string | null>(null);

  return (
    <div className="app">
      <MapView tileUrl={tileUrl} />
      <TileSourceSidebar onApply={setTileUrl} />
    </div>
  );
}

export default App;
