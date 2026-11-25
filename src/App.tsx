import React, { useEffect } from 'react';
import { OfficeScene } from './world/OfficeScene';
import { TopHUD } from './ui/TopHUD';
import { AgentListPanel } from './ui/AgentListPanel';
import { AgentInspector } from './ui/AgentInspector';
import { RoomQuickNav } from './ui/RoomQuickNav';
import { CompanyManagementPanel } from './ui/CompanyManagementPanel';
import { useGameStore } from './store/useGameStore';

export const App: React.FC = () => {
  const hydrate = useGameStore((s) => s.hydrateFromIndexedDB);
  const saveNow = useGameStore((s) => s.saveNow);
  const webglError = useGameStore((s) => s.webglError);

  useEffect(() => {
    void hydrate();
    const interval = window.setInterval(() => {
      void saveNow();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [hydrate, saveNow]);

  return (
    <main className="app-root">
      <OfficeScene />
      <TopHUD />
      {webglError && <div className="webgl-banner">{webglError}</div>}
      <AgentListPanel />
      <AgentInspector />
      <RoomQuickNav />
      <CompanyManagementPanel />
    </main>
  );
};

export default App;
