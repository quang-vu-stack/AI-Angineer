import type { AgentEntity } from '../agents/types';
import type { CompanyTask, MemoryRecord, SimulationSnapshot } from './interfaces';
import { needsRecovery, selectWork } from './decisionPolicy';

/** Experience is a simulation estimate derived from retained completed tasks, not a payroll rank. */
export type ExperienceLevel = 'junior' | 'specialist' | 'senior' | 'lead';
export type CareerGoal = 'recover' | 'off_shift' | 'deliver' | 'unblock' | 'mentor' | 'learn';
export interface CareerProfile {
  experiencePoints: number;
  completedTasks: number;
  level: ExperienceLevel;
  nextLevel: ExperienceLevel | null;
  pointsToNext: number;
  reviewEligible: boolean;
}
const milestones: ReadonlyArray<{level: ExperienceLevel; points: number}> = [
  {level:'junior',points:0}, {level:'specialist',points:60},
  {level:'senior',points:180}, {level:'lead',points:360},
];
const points = {low:10, medium:20, high:30};

export function careerProfile(agentId: string, assigned: readonly CompanyTask[]): CareerProfile {
  const completed = [...new Map(assigned.filter(t => t.assignedAgentId === agentId &&
    t.status === 'completed' && t.progress === 100).map(t => [t.id,t])).values()];
  const experiencePoints = completed.reduce((sum,t)=>sum+points[t.priority],0);
  let index=0;
  for(let i=1;i<milestones.length;i++) if(experiencePoints>=milestones[i].points) index=i;
  const next=milestones[index+1];
  return {experiencePoints,completedTasks:completed.length,level:milestones[index].level,
    nextLevel:next?.level??null,pointsToNext:next?next.points-experiencePoints:0,
    reviewEligible:index>0};
}

export interface CareerPlan {
  goal: CareerGoal;
  taskId?: string;
  profile: CareerProfile;
}
export function planCareer(agent: AgentEntity, snapshot: SimulationSnapshot,
  assigned: readonly CompanyTask[]): CareerPlan {
  const own=assigned.filter(t=>t.assignedAgentId===agent.id);
  const profile=careerProfile(agent.id,own);
  if(needsRecovery(agent)) return {goal:'recover',profile};
  const hour=snapshot.simMinutes/60;
  if(hour<8||hour>=18||(hour>=12&&hour<13)) return {goal:'off_shift',profile};
  const task=selectWork(own);
  if(task) return {goal:'deliver',taskId:task.id,profile};
  if(own.some(t=>t.status==='blocked')) return {goal:'unblock',profile};
  return {goal:profile.level==='senior'||profile.level==='lead'?'mentor':'learn',profile};
}

/** One career reflection per day, only after real completed work; memory already persists in V0.3. */
export function careerReflection(agentId: string, day: number, profile: CareerProfile,
  recent: readonly MemoryRecord[]): Omit<MemoryRecord,'id'|'timestampSimMinutes'> | null {
  if(profile.completedTasks===0 || recent.some(m=>m.agentId===agentId && m.day===day &&
    m.kind==='reflection' && m.summary.startsWith('Tự đánh giá nghề nghiệp:'))) return null;
  return {agentId,day,kind:'reflection',importance:5,
    summary:'Tự đánh giá nghề nghiệp: '+profile.completedTasks+' nhiệm vụ hoàn thành, '+profile.experiencePoints+' điểm kinh nghiệm. '+
      (profile.nextLevel?'Cần '+profile.pointsToNext+' điểm để đạt mốc tiếp theo.':'Đã đạt mốc kinh nghiệm cao nhất.')};
}
