import type { RoomId } from '../agents/types';

export interface RoomDefinition {
  id: RoomId;
  name: string;
  bounds: { x: number; z: number; width: number; depth: number };
  floorColor: string;
  accentColor: string;
  cameraTarget: [number, number, number];
  cameraOffset: [number, number, number];
}

export const OFFICE_ROOMS: RoomDefinition[] = [
  {
    id: 'ceo_office',
    name: 'Phòng CEO',
    bounds: { x: -14, z: -9, width: 8, depth: 6 },
    floorColor: '#1e293b',
    accentColor: '#3b82f6',
    cameraTarget: [-14, 0.5, -9],
    cameraOffset: [-6, 8, 8],
  },
  {
    id: 'operations_room',
    name: 'Phòng Điều hành',
    bounds: { x: -6.5, z: -9, width: 7, depth: 6 },
    floorColor: '#1e2b3c',
    accentColor: '#60a5fa',
    cameraTarget: [-6.5, 0.5, -9],
    cameraOffset: [0, 8, 9],
  },
  {
    id: 'engineering_room',
    name: 'Phòng Lập trình',
    bounds: { x: 3, z: -9, width: 12, depth: 6 },
    floorColor: '#192a2c',
    accentColor: '#10b981',
    cameraTarget: [3, 0.5, -9],
    cameraOffset: [0, 9, 10],
  },
  {
    id: 'design3d_room',
    name: 'Phòng Thiết kế 3D',
    bounds: { x: 13.5, z: -9, width: 9, depth: 6 },
    floorColor: '#2a241f',
    accentColor: '#f59e0b',
    cameraTarget: [13.5, 0.5, -9],
    cameraOffset: [6, 8, 9],
  },
  {
    id: 'ai_research_room',
    name: 'Phòng Nghiên cứu AI',
    bounds: { x: -12, z: 9, width: 12, depth: 6 },
    floorColor: '#231e36',
    accentColor: '#8b5cf6',
    cameraTarget: [-12, 0.5, 9],
    cameraOffset: [-5, 8, 9],
  },
  {
    id: 'media_room',
    name: 'Phòng Truyền thông',
    bounds: { x: 0, z: 9, width: 12, depth: 6 },
    floorColor: '#2f1f2c',
    accentColor: '#ec4899',
    cameraTarget: [0, 0.5, 9],
    cameraOffset: [0, 8, 9],
  },
  {
    id: 'finance_hr_room',
    name: 'Phòng Tài chính & Nhân sự',
    bounds: { x: 12, z: 9, width: 12, depth: 6 },
    floorColor: '#1b2b34',
    accentColor: '#06b6d4',
    cameraTarget: [12, 0.5, 9],
    cameraOffset: [5, 8, 9],
  },
  {
    id: 'central_meeting_room',
    name: 'Phòng Họp Trung Tâm',
    bounds: { x: 0, z: 0, width: 10, depth: 7 },
    floorColor: '#242c3c',
    accentColor: '#38bdf8',
    cameraTarget: [0, 0.8, 0],
    cameraOffset: [0, 9, 11],
  },
];

export interface DeskPlacement {
  id: string;
  position: [number, number, number];
  rotationY: number;
  hasDualMonitor?: boolean;
}

export const DESK_PLACEMENTS: DeskPlacement[] = [
  // CEO
  { id: 'desk_ceo_1', position: [-14.0, 0, -10.3], rotationY: 0, hasDualMonitor: true },
  // Operations
  { id: 'desk_ops_1', position: [-8.2, 0, -10.6], rotationY: 0 },
  { id: 'desk_ops_2', position: [-4.8, 0, -10.6], rotationY: 0 },
  // Engineering (5)
  { id: 'desk_eng_1', position: [-1.2, 0, -10.9], rotationY: 0, hasDualMonitor: true },
  { id: 'desk_eng_2', position: [1.3, 0, -10.9], rotationY: 0, hasDualMonitor: true },
  { id: 'desk_eng_3', position: [3.8, 0, -10.9], rotationY: 0, hasDualMonitor: true },
  { id: 'desk_eng_4', position: [6.4, 0, -10.9], rotationY: 0, hasDualMonitor: true },
  { id: 'desk_eng_5', position: [7.4, 0, -7.4], rotationY: -Math.PI / 2, hasDualMonitor: true },
  // Design 3D (3)
  { id: 'desk_design_1', position: [11.2, 0, -10.8], rotationY: 0, hasDualMonitor: true },
  { id: 'desk_design_2', position: [13.8, 0, -10.8], rotationY: 0, hasDualMonitor: true },
  { id: 'desk_design_3', position: [16.2, 0, -10.8], rotationY: 0, hasDualMonitor: true },
  // AI Research (3)
  { id: 'desk_ai_1', position: [-15.2, 0, 10.8], rotationY: Math.PI, hasDualMonitor: true },
  { id: 'desk_ai_2', position: [-12.0, 0, 10.8], rotationY: Math.PI, hasDualMonitor: true },
  { id: 'desk_ai_3', position: [-8.8, 0, 10.8], rotationY: Math.PI, hasDualMonitor: true },
  // Media (3)
  { id: 'desk_media_1', position: [-3.4, 0, 10.8], rotationY: Math.PI },
  { id: 'desk_media_2', position: [0, 0, 10.8], rotationY: Math.PI, hasDualMonitor: true },
  { id: 'desk_media_3', position: [3.4, 0, 10.8], rotationY: Math.PI },
  // Finance & HR (3)
  { id: 'desk_fin_1', position: [8.8, 0, 10.8], rotationY: Math.PI },
  { id: 'desk_fin_2', position: [12.0, 0, 10.8], rotationY: Math.PI },
  { id: 'desk_fin_3', position: [15.2, 0, 10.8], rotationY: Math.PI },
];

export const PLANT_POSITIONS: [number, number, number][] = [
  [-17.0, 0, -11.0],
  [-10.6, 0, -11.0],
  [-2.5, 0, -11.0],
  [8.4, 0, -11.0],
  [17.1, 0, -11.0],
  [-17.1, 0, 11.0],
  [-6.6, 0, 11.0],
  [5.4, 0, 11.0],
  [17.1, 0, 11.0],
  [-5.6, 0, -3.9],
  [5.6, 0, -3.9],
  [-5.6, 0, 3.9],
  [5.6, 0, 3.9],
];

export const CEILING_LIGHT_POSITIONS: [number, number, number][] = [
  [-14, 3.4, -9],
  [-6.5, 3.4, -9],
  [3, 3.4, -9],
  [13.5, 3.4, -9],
  [-12, 3.4, 9],
  [0, 3.4, 9],
  [12, 3.4, 9],
  [0, 3.4, 0],
  [-9, 3.4, 0],
  [9, 3.4, 0],
];
