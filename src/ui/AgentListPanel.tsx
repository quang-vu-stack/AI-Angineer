import React, { useMemo, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { DEPARTMENT_META } from '../agents/roster';
import type { DepartmentId } from '../agents/types';

export const AgentListPanel: React.FC = () => {
  const agents = useGameStore((s) => s.agents);
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);
  const focusOnAgent = useGameStore((s) => s.focusOnAgent);

  const [deptFilter, setDeptFilter] = useState<DepartmentId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const filtered = useMemo(() => {
    return agents.filter((a) => {
      if (deptFilter !== 'all' && a.department !== deptFilter) return false;
      if (query.trim() && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [agents, deptFilter, query]);

  if (collapsed) {
    return (
      <button className="floating-toggle-left" onClick={() => setCollapsed(false)}>
        <Users size={16} /> 20 Nhân viên
      </button>
    );
  }

  return (
    <aside className="panel-left" data-testid="agent-list-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Users size={15} /> Nhân sự AI ({agents.length})
        </div>
        <button className="panel-close" onClick={() => setCollapsed(true)}>
          –
        </button>
      </div>

      <div className="panel-search">
        <Search size={13} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên..."
        />
      </div>

      <div className="dept-filters">
        <button
          className={`dept-chip ${deptFilter === 'all' ? 'active' : ''}`}
          onClick={() => setDeptFilter('all')}
        >
          Tất cả (20)
        </button>
        {(Object.keys(DEPARTMENT_META) as DepartmentId[]).map((dept) => (
          <button
            key={dept}
            className={`dept-chip ${deptFilter === dept ? 'active' : ''}`}
            onClick={() => setDeptFilter(dept)}
          >
            {DEPARTMENT_META[dept].label} ({DEPARTMENT_META[dept].count})
          </button>
        ))}
      </div>

      <div className="agent-list-scroll">
        {filtered.map((agent) => (
          <button
            key={agent.id}
            data-testid={`agent-item-${agent.id}`}
            className={`agent-row ${selectedAgentId === agent.id ? 'selected' : ''}`}
            onClick={() => focusOnAgent(agent.id)}
          >
            <span
              className="agent-dot"
              style={{ backgroundColor: DEPARTMENT_META[agent.department].accent }}
            />
            <div className="agent-row-main">
              <div className="agent-row-name">{agent.name}</div>
              <div className="agent-row-sub">
                {agent.id} • {agent.role}
              </div>
            </div>
            <span className="agent-state-pill">{agent.state}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};
