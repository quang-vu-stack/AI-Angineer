import React from 'react';
import {
  Pause,
  Play,
  Save,
  RotateCcw,
  MessageSquare,
  Monitor,
  LayoutDashboard,
} from 'lucide-react';
import { SPEED_OPTIONS, useGameStore } from '../store/useGameStore';
import type { QualityLevel } from '../services/performanceMonitor';

function formatClock(simMinutes: number): string {
  const total = Math.floor(simMinutes) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const TopHUD: React.FC = () => {
  const day = useGameStore((s) => s.day);
  const simMinutes = useGameStore((s) => s.simMinutes);
  const isPaused = useGameStore((s) => s.isPaused);
  const speed = useGameStore((s) => s.speed);
  const quality = useGameStore((s) => s.quality);
  const showBubbles = useGameStore((s) => s.showSpeechBubbles);
  const perf = useGameStore((s) => s.perf);
  const agents = useGameStore((s) => s.agents);
  const managementPanelOpen = useGameStore((s) => s.managementPanelOpen);

  const togglePause = useGameStore((s) => s.togglePause);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const setQuality = useGameStore((s) => s.setQuality);
  const toggleSpeechBubbles = useGameStore((s) => s.toggleSpeechBubbles);
  const setManagementPanelOpen = useGameStore((s) => s.setManagementPanelOpen);
  const saveNow = useGameStore((s) => s.saveNow);
  const resetSimulation = useGameStore((s) => s.resetSimulation);

  const avgProductivity = Math.round(
    agents.reduce((acc, a) => acc + a.productivity, 0) / agents.length
  );

  return (
    <header className="hud-top" data-testid="top-hud">
      <div className="hud-brand">
        <div className="hud-title">AI COMPANY WORLD 3D</div>
        <div className="hud-subtitle">
          V0.2 Living Office • Ngày {day} • {formatClock(simMinutes)} • Năng suất: {avgProductivity}%
        </div>
      </div>

      <div className="hud-controls">
        <button
          className={`hud-btn ${managementPanelOpen ? 'btn-accent' : ''}`}
          onClick={() => setManagementPanelOpen(!managementPanelOpen)}
          data-testid="open-company-mgmt-btn"
          title="Quản trị Nhân sự, Tài chính, Dự án & Nhiệm vụ"
        >
          <LayoutDashboard size={14} />
          <span>Quản trị</span>
        </button>

        <button
          className={`hud-btn ${isPaused ? 'btn-accent' : ''}`}
          onClick={togglePause}
          data-testid="pause-toggle-btn"
          title="Tạm dừng / Tiếp tục"
        >
          {isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </button>

        <div className="hud-speed-group" data-testid="speed-controls">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt}
              className={`hud-chip ${speed === opt ? 'active' : ''}`}
              onClick={() => setSpeed(opt)}
              data-testid={`speed-btn-${opt}`}
            >
              {opt}x
            </button>
          ))}
        </div>

        <div className="hud-quality-group" data-testid="quality-controls">
          <Monitor size={14} />
          {(['low', 'medium', 'high'] as QualityLevel[]).map((lvl) => (
            <button
              key={lvl}
              className={`hud-chip ${quality === lvl ? 'active' : ''}`}
              onClick={() => setQuality(lvl)}
              data-testid={`quality-btn-${lvl}`}
            >
              {lvl.toUpperCase()}
            </button>
          ))}
        </div>

        <button
          className={`hud-btn ${showBubbles ? 'btn-active' : ''}`}
          onClick={toggleSpeechBubbles}
          title="Bật / Tắt bong bóng hội thoại"
        >
          <MessageSquare size={14} />
        </button>

        <button className="hud-btn" onClick={() => void saveNow()} title="Lưu IndexedDB">
          <Save size={14} />
        </button>

        <button className="hud-btn" onClick={() => void resetSimulation()} title="Đặt lại mô phỏng">
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="hud-perf" data-testid="perf-badge">
        <span>{perf.fps} FPS</span>
        <span>DC: {perf.drawCalls}</span>
        {perf.heapMB !== null && <span>{perf.heapMB} MB</span>}
      </div>
    </header>
  );
};
