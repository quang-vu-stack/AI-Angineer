import React from 'react';
import { X, Briefcase, Coffee, Users, Video, GraduationCap } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { DEPARTMENT_META } from '../agents/roster';
import { personalityFor } from '../ai/agentPersonality';
import { planCareer, type CareerGoal, type ExperienceLevel } from '../ai/careerPolicy';

const LEVEL_META: Record<ExperienceLevel, { label: string; color: string }> = {
  junior: { label: 'Junior', color: '#94a3b8' },
  specialist: { label: 'Specialist', color: '#38bdf8' },
  senior: { label: 'Senior', color: '#a78bfa' },
  lead: { label: 'Lead', color: '#fbbf24' },
};

const GOAL_LABEL_VI: Record<CareerGoal, string> = {
  deliver: 'Hoàn thành nhiệm vụ được giao',
  recover: 'Phục hồi năng lượng & giảm áp lực',
  off_shift: 'Ngoài giờ làm việc chính',
  unblock: 'Tháo gỡ nhiệm vụ đang bị chặn',
  mentor: 'Hướng dẫn & kèm cặp đồng nghiệp',
  learn: 'Tự đào tạo & nâng cao kỹ năng',
};

const MetricBar: React.FC<{ label: string; value: number; color: string; suffix?: string }> = ({
  label,
  value,
  color,
  suffix = '%',
}) => (
  <div className="metric-row">
    <div className="metric-head">
      <span>{label}</span>
      <span>
        {Math.round(value)}
        {suffix}
      </span>
    </div>
    <div className="metric-track">
      <div
        className="metric-fill"
        style={{ width: `${Math.min(100, Math.max(0, Math.round(value)))}%`, background: color }}
      />
    </div>
  </div>
);

export const AgentInspector: React.FC = () => {
  const selectedAgentId = useGameStore((s) => s.selectedAgentId);
  const agents = useGameStore((s) => s.agents);
  const company = useGameStore((s) => s.company);
  const companyVersion = useGameStore((s) => s.companyVersion);
  const day = useGameStore((s) => s.day);
  const simMinutes = useGameStore((s) => s.simMinutes);
  const followSelectedAgent = useGameStore((s) => s.followSelectedAgent);
  const toggleFollowSelectedAgent = useGameStore((s) => s.toggleFollowSelectedAgent);
  const selectAgent = useGameStore((s) => s.selectAgent);
  const commandAgent = useGameStore((s) => s.commandAgent);

  const agent = agents.find((a) => a.id === selectedAgentId);
  if (!agent) return null;

  void companyVersion;
  const dept = DEPARTMENT_META[agent.department];
  const personality = personalityFor(agent.id);
  const stressThreshold = 70 + Math.round(personality.resilience / 10);
  const socialCooldownMin = 60 - Math.round(personality.sociability / 3);

  // Strictly real career data from src/ai/careerPolicy.ts (zero fake XP)
  const careerPlan = planCareer(
    agent,
    { simMinutes, day, agents, activeMeetingRoomId: null },
    company.tasks.getAllTasks()
  );
  const profile = careerPlan.profile;
  const levelInfo = LEVEL_META[profile.level];
  const nextMilestoneXp = profile.experiencePoints + profile.pointsToNext;
  const xpPercent =
    profile.nextLevel === null || nextMilestoneXp <= 0
      ? 100
      : Math.min(100, Math.round((profile.experiencePoints / nextMilestoneXp) * 100));

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
        <button
          className={`hud-chip ${followSelectedAgent ? 'active' : ''}`}
          onClick={toggleFollowSelectedAgent}
          data-testid="follow-agent-btn"
          title="Theo dõi nhân viên bằng camera"
        >
          <Video size={11} /> {followSelectedAgent ? 'Đang theo dõi' : 'Theo dõi'}
        </button>
      </div>

      <div className="inspector-section" data-testid="agent-career-profile">
        <div className="section-label">Cấp độ & Mục tiêu nghề nghiệp</div>
        <div className="inspector-badges" style={{ marginBottom: 6 }}>
          <span
            className="badge"
            style={{ borderColor: levelInfo.color, color: levelInfo.color, fontWeight: 700 }}
            data-testid="agent-career-level"
          >
            {levelInfo.label}
          </span>
          <span className="badge" data-testid="agent-career-xp">
            {profile.experiencePoints} XP ({profile.completedTasks} xong)
          </span>
        </div>
        <div className="metric-track" style={{ marginBottom: 5 }}>
          <div
            className="metric-fill"
            style={{ width: `${xpPercent}%`, background: levelInfo.color }}
          />
        </div>
        <div className="inspector-meta" data-testid="agent-career-goal">
          Mục tiêu: {GOAL_LABEL_VI[careerPlan.goal]}
          {profile.nextLevel ? ` • Còn ${profile.pointsToNext} XP lên ${LEVEL_META[profile.nextLevel].label}` : ' • Cấp cao nhất'}
        </div>
      </div>

      <div className="inspector-section">
        <div className="section-label">Chỉ số hiện tại</div>
        <MetricBar label="Năng lượng" value={agent.energy} color="#22c55e" />
        <MetricBar label="Tâm trạng" value={agent.mood} color="#38bdf8" />
        <MetricBar label="Căng thẳng" value={agent.stress} color="#f97316" />
        <MetricBar label="Năng suất" value={agent.productivity} color="#a78bfa" />
      </div>

      <div className="inspector-section" data-testid="agent-ai-personality">
        <div className="section-label">Tính cách & Chỉ số AI</div>
        <MetricBar label="Tập trung (Focus)" value={personality.focus} color="#38bdf8" suffix="" />
        <MetricBar
          label="Hòa đồng (Sociability)"
          value={personality.sociability}
          color="#f472b6"
          suffix=""
        />
        <MetricBar
          label="Bền bỉ (Resilience)"
          value={personality.resilience}
          color="#10b981"
          suffix=""
        />
        <div className="inspector-meta">
          Ngưỡng áp lực: {stressThreshold}% • Chu kỳ giao tiếp: {socialCooldownMin}p
        </div>
      </div>

      <div className="inspector-section">
        <div className="section-label">Nhiệm vụ ({agent.taskProgress}%)</div>
        <div className="task-box">{agent.currentTask || 'Chưa có nhiệm vụ đang mở'}</div>
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
            <Coffee size={13} /> Cà phê / Nghỉ
          </button>
          <button
            className="hud-btn"
            onClick={() =>
              commandAgent(
                agent.id,
                'Talking',
                profile.level === 'senior' || profile.level === 'lead'
                  ? 'training_podium_spot'
                  : agent.numericIndex % 2 === 0
                    ? 'training_seat_1'
                    : 'training_seat_2'
              )
            }
          >
            <GraduationCap size={13} /> Đào tạo
          </button>
        </div>
      </div>
    </aside>
  );
};
