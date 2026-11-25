export type DepartmentId =
  | 'operations'
  | 'engineering'
  | 'design'
  | 'ai_research'
  | 'media'
  | 'finance_hr';

export type RoomId =
  | 'ceo_office'
  | 'operations_room'
  | 'engineering_room'
  | 'design3d_room'
  | 'ai_research_room'
  | 'media_room'
  | 'finance_hr_room'
  | 'central_meeting_room';

export type AgentState =
  | 'Idle'
  | 'Walking'
  | 'Working'
  | 'Sitting'
  | 'Talking'
  | 'Meeting'
  | 'Resting';

export type Gender = 'Nam' | 'Nữ';

export interface AgentAppearance {
  shirtColor: string;
  pantsColor: string;
  skinColor: string;
  hairColor: string;
  heightScale: number;
  hasGlasses: boolean;
}

export interface AgentEntity {
  id: string;
  numericIndex: number;
  name: string;
  gender: Gender;
  role: string;
  department: DepartmentId;
  departmentLabel: string;
  homeRoomId: RoomId;
  homeRoomDoorId: string;
  deskWaypointId: string;
  appearance: AgentAppearance;

  // Spatial state
  position: [number, number, number];
  rotationY: number;
  path: [number, number, number][];
  pathIndex: number;
  pendingStateAfterWalk: AgentState | null;

  // Behavioral state
  state: AgentState;
  stateTimerSec: number;

  // Metrics (0..100)
  energy: number;
  mood: number;
  stress: number;
  productivity: number;

  // Skills & Task
  skills: string[];
  currentTask: string;
  taskProgress: number;

  // Speech bubble
  speechText: string | null;
  speechRemainingSec: number;
}
