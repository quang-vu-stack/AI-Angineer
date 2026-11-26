import type { RoomId } from '../../agents/types';

export type ModuleCategory = 'executive' | 'department' | 'meeting' | 'brand' | 'training' | 'lounge';

export interface HQExpansionSlot {
  id: string;
  position: [number, number, number];
  rotationY: number;
  reservedFor: 'desk' | 'pod' | 'kiosk';
}

export interface HQModuleSpec {
  id: RoomId;
  name: string;
  category: ModuleCategory;
  wing: 'core' | 'west_hq';
  bounds: { x: number; z: number; width: number; depth: number };
  floorColor: string;
  accentColor: string;
  cameraTarget: [number, number, number];
  cameraOffset: [number, number, number];
  /** Pre-planned spatial slots for scaling beyond 20 employees in V0.5+ */
  expansionSlots: HQExpansionSlot[];
}

/**
 * Modular Corporate HQ Registry (44m x 24m: Core X -18..+18, West HQ Wing X -26..-18).
 * Enables adding new department wings, floors, or workstation slots declaratively
 * without rewriting existing navigation or 3D scene code.
 */
export const HQ_MODULES: HQModuleSpec[] = [
  {
    id: 'reception_lobby',
    name: 'Sảnh Lễ Tân',
    category: 'brand',
    wing: 'west_hq',
    bounds: { x: -22, z: 0, width: 8, depth: 7.4 },
    floorColor: '#1b263b',
    accentColor: '#38bdf8',
    cameraTarget: [-22, 0.9, 0],
    cameraOffset: [4, 8.5, 9.5],
    expansionSlots: [
      { id: 'exp_reception_kiosk_1', position: [-20.0, 0, -2.5], rotationY: Math.PI / 2, reservedFor: 'kiosk' },
    ],
  },
  {
    id: 'boardroom',
    name: 'Phòng HĐQT',
    category: 'executive',
    wing: 'west_hq',
    bounds: { x: -22, z: -8.2, width: 8, depth: 7.4 },
    floorColor: '#241e20',
    accentColor: '#f59e0b',
    cameraTarget: [-22, 0.9, -8.2],
    cameraOffset: [4, 8.5, 9.5],
    expansionSlots: [],
  },
  {
    id: 'training_center',
    name: 'Phỏng vấn & Đào tạo',
    category: 'training',
    wing: 'west_hq',
    bounds: { x: -22, z: 8.2, width: 8, depth: 7.4 },
    floorColor: '#1a2a2a',
    accentColor: '#14b8a6',
    cameraTarget: [-22, 0.9, 8.2],
    cameraOffset: [4, 8.5, 9.5],
    expansionSlots: [
      { id: 'exp_train_desk_5', position: [-20.2, 0, 10.6], rotationY: Math.PI, reservedFor: 'desk' },
      { id: 'exp_train_desk_6', position: [-22.6, 0, 10.6], rotationY: Math.PI, reservedFor: 'desk' },
    ],
  },
];

export const HQ_WORLD_BOUNDS = {
  minX: -26,
  maxX: 18,
  minZ: -12,
  maxZ: 12,
  width: 44,
  depth: 24,
  centerX: -4,
} as const;
