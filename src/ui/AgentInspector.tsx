import React from 'react';
import { X, Briefcase, Coffee, Users } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { DEPARTMENT_META } from '../agents/roster';

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="metric-row">
    <div className="metric-head">
      <span>{label}</span>
      <span>{Math.round(value)}%</span>
    </div>
    <div className="metric-track">
      <div className="metric-fill" style={{ width: `${Math.round(value)}%`, background: color }} />
    </div>
  </div>
);

export const AgentInspector: React.FC = () => {
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);
  const agents = useGameStore((s) => s.agents);
  const selectAgent = useGameStore((s) => s.selectAgent);
  const commandAgent = useGameStore((s) => s.commandAgent);

  const agent = agents.find((a) => a.id === selectedAgentId);
  if (!agent) return null;

  const dept = DEPARTMENT_META[agent.department];

  return (
    <aside className="panel-right" data-testid="agent-inspector">
      <div className="panel-header">
        <div>
          <div className="inspector-name">{agent.name}</div>
          <div className="inspector-meta">
            {agent.id} • {agent.gender} • {agent.role}
          </div>
        </div>
        <button className="panel-close" onClick={() => selectAgent(null)}>
          <X size={15} />
        </button>
      </div>

      <div className="inspector-badges">
        <span className="badge" style={{ borderColor: dept.accent, color: dept.accent }}>
          {dept.label}
        </span>
        <span className="badge">{agent.state}</span>
      </div>

      <div className="inspector-section">
        <div className="section-label">Chỉ số hiện tại</div>
        <MetricBar label="Năng lượng" value={agent.energy} color="#22c55e" />
        <MetricBar label="Tâm trạng" value={agent.mood} color="#38bdf8" />
        <MetricBar label="Căng thẳng" value={agent.stress} color="#f97316" />
        <MetricBar label="Năng suất" value={agent.productivity} color="#a78bfa" />
      </div>

      <div className="inspector-section">
        <div className="section-label">Nhiệm vụ ({agent.taskProgress}%)</div>
        <div className="task-box">{agent.currentTask}</div>
      </div>

      <div className="inspector-section">
        <div className="section-label">Kỹ năng</div>
        <div className="skills-wrap">
          {agent.skills.map((s) => (
            <span key={s} className="skill-tag">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="inspector-section">
        <div className="section-label">Điều khiển nhanh</div>
        <div className="cmd-grid">
          <button className="hud-btn" onClick={() => commandAgent(agent.id, 'Working')}>
            <Briefcase size={13} /> Làm việc
          </button>
          <button className="hud-btn" onClick={() => commandAgent(agent.id, 'Meeting')}>
            <Users size={13} /> Phòng họp
          </button>
          <button className="hud-btn" onClick={() => commandAgent(agent.id, 'Resting')}>
            <Coffee size={13} /> Nghỉ ngơi
          </button>
        </div>
      </div>
    </aside>
  );
};
