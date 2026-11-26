export interface WaypointNode {
  id: string;
  position: [number, number, number];
  neighbors: string[];
  roomId?: string;
  facingRotationY?: number;
}

/**
 * Office Layout Coordinate System (36m x 24m):
 * X: -18 .. +18
 * Z: -12 .. +12
 * Central Corridor Ring runs around the Central Meeting Room (X: -5..5, Z: -3.5..3.5):
 *   North Hallway: Z = -4.9
 *   South Hallway: Z = +4.9
 *   West Hallway:  X = -6.8
 *   East Hallway:  X = +6.8
 * Every room doorway connects perpendicularly to a dedicated corridor node right outside
 * its open doorway so agents NEVER clip diagonally through glass partition walls or desks.
 */
export const WAYPOINTS: Record<string, WaypointNode> = {
  // === CENTRAL HALLWAY RING (Orthogonal grid with aligned doorway approaches) ===
  hall_nw_ceo: {
    id: 'hall_nw_ceo',
    position: [-13.4, 0, -4.9],
    neighbors: ['hall_nw_ops', 'door_ceo'],
  },
  hall_nw_ops: {
    id: 'hall_nw_ops',
    position: [-6.6, 0, -4.9],
    neighbors: ['hall_nw_ceo', 'hall_n_mid', 'hall_w_mid', 'door_ops'],
  },
  hall_n_mid: {
    id: 'hall_n_mid',
    position: [0, 0, -4.9],
    neighbors: ['hall_nw_ops', 'hall_n_eng', 'door_meeting_n'],
  },
  hall_n_eng: {
    id: 'hall_n_eng',
    position: [2.5, 0, -4.9],
    neighbors: ['hall_n_mid', 'hall_ne', 'door_eng'],
  },
  hall_ne: {
    id: 'hall_ne',
    position: [6.8, 0, -4.9],
    neighbors: ['hall_n_eng', 'hall_e_mid', 'hall_ne_design'],
  },
  hall_ne_design: {
    id: 'hall_ne_design',
    position: [13.0, 0, -4.9],
    neighbors: ['hall_ne', 'door_design'],
  },

  hall_w_mid: {
    id: 'hall_w_mid',
    position: [-6.6, 0, 0],
    neighbors: ['hall_nw_ops', 'hall_sw', 'hq_west_arch'],
  },
  hall_e_mid: {
    id: 'hall_e_mid',
    position: [6.8, 0, 0],
    neighbors: ['hall_ne', 'hall_se', 'door_meeting_e', 'lounge_entry'],
  },

  hall_sw_ai: {
    id: 'hall_sw_ai',
    position: [-12.0, 0, 4.9],
    neighbors: ['hall_sw', 'door_ai'],
  },
  hall_sw: {
    id: 'hall_sw',
    position: [-6.6, 0, 4.9],
    neighbors: ['hall_w_mid', 'hall_sw_ai', 'hall_s_mid'],
  },
  hall_s_mid: {
    id: 'hall_s_mid',
    position: [0, 0, 4.9],
    neighbors: ['hall_sw', 'hall_se', 'door_meeting_s', 'door_media'],
  },
  hall_se: {
    id: 'hall_se',
    position: [6.8, 0, 4.9],
    neighbors: ['hall_s_mid', 'hall_e_mid', 'hall_se_fin'],
  },
  hall_se_fin: {
    id: 'hall_se_fin',
    position: [12.0, 0, 4.9],
    neighbors: ['hall_se', 'door_fin'],
  },

  // === 1. CEO OFFICE (X: -18..-10, Z: -12..-6) ===
  door_ceo: {
    id: 'door_ceo',
    position: [-13.4, 0, -6.4],
    neighbors: ['hall_nw_ceo', 'ceo_hub'],
    roomId: 'ceo_office',
  },
  ceo_hub: {
    id: 'ceo_hub',
    position: [-14.0, 0, -8.2],
    neighbors: ['door_ceo', 'desk_ceo_1'],
    roomId: 'ceo_office',
  },
  desk_ceo_1: {
    id: 'desk_ceo_1',
    position: [-14.0, 0, -9.45],
    neighbors: ['ceo_hub'],
    roomId: 'ceo_office',
    facingRotationY: Math.PI,
  },

  // === 2. OPERATIONS ROOM (X: -10..-3, Z: -12..-6) ===
  door_ops: {
    id: 'door_ops',
    position: [-6.6, 0, -6.4],
    neighbors: ['hall_nw_ops', 'ops_hub'],
    roomId: 'operations_room',
  },
  ops_hub: {
    id: 'ops_hub',
    position: [-6.5, 0, -8.2],
    neighbors: ['door_ops', 'desk_ops_1', 'desk_ops_2'],
    roomId: 'operations_room',
  },
  desk_ops_1: {
    id: 'desk_ops_1',
    position: [-8.2, 0, -9.75],
    neighbors: ['ops_hub'],
    roomId: 'operations_room',
    facingRotationY: Math.PI,
  },
  desk_ops_2: {
    id: 'desk_ops_2',
    position: [-4.8, 0, -9.75],
    neighbors: ['ops_hub'],
    roomId: 'operations_room',
    facingRotationY: Math.PI,
  },

  // === 3. ENGINEERING ROOM (X: -3..9, Z: -12..-6) ===
  door_eng: {
    id: 'door_eng',
    position: [2.5, 0, -6.4],
    neighbors: ['hall_n_eng', 'eng_hub'],
    roomId: 'engineering_room',
  },
  eng_hub: {
    id: 'eng_hub',
    position: [2.5, 0, -8.4],
    neighbors: [
      'door_eng',
      'desk_eng_1',
      'desk_eng_2',
      'desk_eng_3',
      'desk_eng_4',
      'desk_eng_5',
    ],
    roomId: 'engineering_room',
  },
  desk_eng_1: {
    id: 'desk_eng_1',
    position: [-1.2, 0, -10.05],
    neighbors: ['eng_hub'],
    roomId: 'engineering_room',
    facingRotationY: Math.PI,
  },
  desk_eng_2: {
    id: 'desk_eng_2',
    position: [1.3, 0, -10.05],
    neighbors: ['eng_hub'],
    roomId: 'engineering_room',
    facingRotationY: Math.PI,
  },
  desk_eng_3: {
    id: 'desk_eng_3',
    position: [3.8, 0, -10.05],
    neighbors: ['eng_hub'],
    roomId: 'engineering_room',
    facingRotationY: Math.PI,
  },
  desk_eng_4: {
    id: 'desk_eng_4',
    position: [6.4, 0, -10.05],
    neighbors: ['eng_hub'],
    roomId: 'engineering_room',
    facingRotationY: Math.PI,
  },
  desk_eng_5: {
    id: 'desk_eng_5',
    position: [6.55, 0, -7.4],
    neighbors: ['eng_hub'],
    roomId: 'engineering_room',
    facingRotationY: Math.PI / 2,
  },

  // === 4. DESIGN 3D ROOM (X: 9..18, Z: -12..-6) ===
  door_design: {
    id: 'door_design',
    position: [13.0, 0, -6.4],
    neighbors: ['hall_ne_design', 'design_hub'],
    roomId: 'design3d_room',
  },
  design_hub: {
    id: 'design_hub',
    position: [13.5, 0, -8.3],
    neighbors: ['door_design', 'desk_design_1', 'desk_design_2', 'desk_design_3'],
    roomId: 'design3d_room',
  },
  desk_design_1: {
    id: 'desk_design_1',
    position: [11.2, 0, -9.95],
    neighbors: ['design_hub'],
    roomId: 'design3d_room',
    facingRotationY: Math.PI,
  },
  desk_design_2: {
    id: 'desk_design_2',
    position: [13.8, 0, -9.95],
    neighbors: ['design_hub'],
    roomId: 'design3d_room',
    facingRotationY: Math.PI,
  },
  desk_design_3: {
    id: 'desk_design_3',
    position: [16.2, 0, -9.95],
    neighbors: ['design_hub'],
    roomId: 'design3d_room',
    facingRotationY: Math.PI,
  },

  // === 5. AI RESEARCH ROOM (X: -18..-6, Z: 6..12) ===
  door_ai: {
    id: 'door_ai',
    position: [-12.0, 0, 6.4],
    neighbors: ['hall_sw_ai', 'ai_hub'],
    roomId: 'ai_research_room',
  },
  ai_hub: {
    id: 'ai_hub',
    position: [-12.0, 0, 8.3],
    neighbors: ['door_ai', 'desk_ai_1', 'desk_ai_2', 'desk_ai_3'],
    roomId: 'ai_research_room',
  },
  desk_ai_1: {
    id: 'desk_ai_1',
    position: [-15.2, 0, 9.95],
    neighbors: ['ai_hub'],
    roomId: 'ai_research_room',
    facingRotationY: 0,
  },
  desk_ai_2: {
    id: 'desk_ai_2',
    position: [-12.0, 0, 9.95],
    neighbors: ['ai_hub'],
    roomId: 'ai_research_room',
    facingRotationY: 0,
  },
  desk_ai_3: {
    id: 'desk_ai_3',
    position: [-8.8, 0, 9.95],
    neighbors: ['ai_hub'],
    roomId: 'ai_research_room',
    facingRotationY: 0,
  },

  // === 6. MEDIA ROOM (X: -6..6, Z: 6..12) ===
  door_media: {
    id: 'door_media',
    position: [0, 0, 6.4],
    neighbors: ['hall_s_mid', 'media_hub'],
    roomId: 'media_room',
  },
  media_hub: {
    id: 'media_hub',
    position: [0, 0, 8.3],
    neighbors: ['door_media', 'desk_media_1', 'desk_media_2', 'desk_media_3'],
    roomId: 'media_room',
  },
  desk_media_1: {
    id: 'desk_media_1',
    position: [-3.4, 0, 9.95],
    neighbors: ['media_hub'],
    roomId: 'media_room',
    facingRotationY: 0,
  },
  desk_media_2: {
    id: 'desk_media_2',
    position: [0, 0, 9.95],
    neighbors: ['media_hub'],
    roomId: 'media_room',
    facingRotationY: 0,
  },
  desk_media_3: {
    id: 'desk_media_3',
    position: [3.4, 0, 9.95],
    neighbors: ['media_hub'],
    roomId: 'media_room',
    facingRotationY: 0,
  },

  // === 7. FINANCE & HR ROOM (X: 6..18, Z: 6..12) ===
  door_fin: {
    id: 'door_fin',
    position: [12.0, 0, 6.4],
    neighbors: ['hall_se_fin', 'fin_hub'],
    roomId: 'finance_hr_room',
  },
  fin_hub: {
    id: 'fin_hub',
    position: [12.0, 0, 8.3],
    neighbors: ['door_fin', 'desk_fin_1', 'desk_fin_2', 'desk_fin_3'],
    roomId: 'finance_hr_room',
  },
  desk_fin_1: {
    id: 'desk_fin_1',
    position: [8.8, 0, 9.95],
    neighbors: ['fin_hub'],
    roomId: 'finance_hr_room',
    facingRotationY: 0,
  },
  desk_fin_2: {
    id: 'desk_fin_2',
    position: [12.0, 0, 9.95],
    neighbors: ['fin_hub'],
    roomId: 'finance_hr_room',
    facingRotationY: 0,
  },
  desk_fin_3: {
    id: 'desk_fin_3',
    position: [15.2, 0, 9.95],
    neighbors: ['fin_hub'],
    roomId: 'finance_hr_room',
    facingRotationY: 0,
  },

  // === 8. CENTRAL MEETING ROOM (X: -5..5, Z: -3.5..3.5) ===
  // West wall holds the live Project Progress LED Display; access is via North, South & East doors.
  door_meeting_n: {
    id: 'door_meeting_n',
    position: [0, 0, -3.65],
    neighbors: ['hall_n_mid', 'meeting_hub_n'],
    roomId: 'central_meeting_room',
  },
  door_meeting_s: {
    id: 'door_meeting_s',
    position: [0, 0, 3.65],
    neighbors: ['hall_s_mid', 'meeting_hub_s'],
    roomId: 'central_meeting_room',
  },
  door_meeting_e: {
    id: 'door_meeting_e',
    position: [5.15, 0, 0],
    neighbors: ['hall_e_mid', 'meeting_hub_e'],
    roomId: 'central_meeting_room',
  },

  meeting_hub_e: {
    id: 'meeting_hub_e',
    position: [4.1, 0, 0],
    neighbors: ['door_meeting_e', 'meeting_hub_ne', 'meeting_hub_se'],
    roomId: 'central_meeting_room',
  },
  meeting_hub_ne: {
    id: 'meeting_hub_ne',
    position: [3.9, 0, -2.5],
    neighbors: ['meeting_hub_e', 'meeting_hub_n'],
    roomId: 'central_meeting_room',
  },
  meeting_hub_se: {
    id: 'meeting_hub_se',
    position: [3.9, 0, 2.5],
    neighbors: ['meeting_hub_e', 'meeting_hub_s'],
    roomId: 'central_meeting_room',
  },
  meeting_hub_n: {
    id: 'meeting_hub_n',
    position: [0, 0, -2.55],
    neighbors: [
      'door_meeting_n',
      'meeting_hub_ne',
      'meeting_seat_1',
      'meeting_seat_2',
      'meeting_seat_3',
      'meeting_seat_4',
    ],
    roomId: 'central_meeting_room',
  },
  meeting_hub_s: {
    id: 'meeting_hub_s',
    position: [0, 0, 2.55],
    neighbors: [
      'door_meeting_s',
      'meeting_hub_se',
      'meeting_seat_5',
      'meeting_seat_6',
      'meeting_seat_7',
      'meeting_seat_8',
    ],
    roomId: 'central_meeting_room',
  },

  meeting_seat_1: {
    id: 'meeting_seat_1',
    position: [-2.1, 0, -1.75],
    neighbors: ['meeting_hub_n'],
    roomId: 'central_meeting_room',
    facingRotationY: 0,
  },
  meeting_seat_2: {
    id: 'meeting_seat_2',
    position: [-0.7, 0, -1.75],
    neighbors: ['meeting_hub_n'],
    roomId: 'central_meeting_room',
    facingRotationY: 0,
  },
  meeting_seat_3: {
    id: 'meeting_seat_3',
    position: [0.7, 0, -1.75],
    neighbors: ['meeting_hub_n'],
    roomId: 'central_meeting_room',
    facingRotationY: 0,
  },
  meeting_seat_4: {
    id: 'meeting_seat_4',
    position: [2.1, 0, -1.75],
    neighbors: ['meeting_hub_n'],
    roomId: 'central_meeting_room',
    facingRotationY: 0,
  },
  meeting_seat_5: {
    id: 'meeting_seat_5',
    position: [-2.1, 0, 1.75],
    neighbors: ['meeting_hub_s'],
    roomId: 'central_meeting_room',
    facingRotationY: Math.PI,
  },
  meeting_seat_6: {
    id: 'meeting_seat_6',
    position: [-0.7, 0, 1.75],
    neighbors: ['meeting_hub_s'],
    roomId: 'central_meeting_room',
    facingRotationY: Math.PI,
  },
  meeting_seat_7: {
    id: 'meeting_seat_7',
    position: [0.7, 0, 1.75],
    neighbors: ['meeting_hub_s'],
    roomId: 'central_meeting_room',
    facingRotationY: Math.PI,
  },
  meeting_seat_8: {
    id: 'meeting_seat_8',
    position: [2.1, 0, 1.75],
    neighbors: ['meeting_hub_s'],
    roomId: 'central_meeting_room',
    facingRotationY: Math.PI,
  },
  // === 9. COFFEE, REST & COMMUNICATION LOUNGE (East Atrium X: 9.4..16.2, Z: -2.9..2.9) ===
  lounge_entry: {
    id: 'lounge_entry',
    position: [9.0, 0, 0],
    neighbors: ['hall_e_mid', 'lounge_hub_n', 'lounge_hub_s'],
    roomId: 'coffee_lounge',
  },
  lounge_hub_n: {
    id: 'lounge_hub_n',
    position: [9.4, 0, -1.55],
    neighbors: ['lounge_entry', 'lounge_seat_1'],
    roomId: 'coffee_lounge',
  },
  lounge_hub_s: {
    id: 'lounge_hub_s',
    position: [9.4, 0, 1.55],
    neighbors: ['lounge_entry', 'lounge_seat_3'],
    roomId: 'coffee_lounge',
  },
  lounge_seat_1: {
    id: 'lounge_seat_1',
    position: [11.1, 0, -1.55],
    neighbors: ['lounge_hub_n', 'lounge_seat_2'],
    roomId: 'coffee_lounge',
    facingRotationY: 0,
  },
  lounge_seat_2: {
    id: 'lounge_seat_2',
    position: [12.5, 0, -1.55],
    neighbors: ['lounge_seat_1', 'lounge_bar_n'],
    roomId: 'coffee_lounge',
    facingRotationY: 0,
  },
  lounge_seat_3: {
    id: 'lounge_seat_3',
    position: [11.1, 0, 1.55],
    neighbors: ['lounge_hub_s', 'lounge_seat_4'],
    roomId: 'coffee_lounge',
    facingRotationY: Math.PI,
  },
  lounge_seat_4: {
    id: 'lounge_seat_4',
    position: [12.5, 0, 1.55],
    neighbors: ['lounge_seat_3', 'lounge_bar_s'],
    roomId: 'coffee_lounge',
    facingRotationY: Math.PI,
  },
  lounge_bar_n: {
    id: 'lounge_bar_n',
    position: [14.1, 0, -1.55],
    neighbors: ['lounge_seat_2', 'lounge_coffee_bar'],
    roomId: 'coffee_lounge',
  },
  lounge_bar_s: {
    id: 'lounge_bar_s',
    position: [14.1, 0, 1.55],
    neighbors: ['lounge_seat_4', 'lounge_coffee_bar'],
    roomId: 'coffee_lounge',
  },
  lounge_coffee_bar: {
    id: 'lounge_coffee_bar',
    position: [14.1, 0, 0],
    neighbors: ['lounge_bar_n', 'lounge_bar_s'],
    roomId: 'coffee_lounge',
    facingRotationY: Math.PI / 2,
  },
  // === 10. CORPORATE WEST HQ WING (Reception, Boardroom, Interview & Training Center) ===
  hq_west_arch: {
    id: 'hq_west_arch',
    position: [-19.4, 0, 0],
    neighbors: ['hall_w_mid', 'reception_front', 'hq_corridor_n', 'hq_corridor_s'],
    roomId: 'reception_lobby',
  },
  reception_front: {
    id: 'reception_front',
    position: [-20.8, 0, 0],
    neighbors: ['hq_west_arch'],
    roomId: 'reception_lobby',
    facingRotationY: -Math.PI / 2,
  },
  hq_corridor_n: {
    id: 'hq_corridor_n',
    position: [-19.4, 0, -5.8],
    neighbors: ['hq_west_arch', 'board_hub_s', 'board_hub_n'],
    roomId: 'boardroom',
  },
  board_hub_s: {
    id: 'board_hub_s',
    position: [-22.2, 0, -5.8],
    neighbors: ['hq_corridor_n', 'board_seat_4', 'board_seat_5', 'board_seat_6'],
    roomId: 'boardroom',
  },
  board_hub_n: {
    id: 'board_hub_n',
    position: [-19.4, 0, -10.5],
    neighbors: ['hq_corridor_n', 'board_north_aisle'],
    roomId: 'boardroom',
  },
  board_north_aisle: {
    id: 'board_north_aisle',
    position: [-22.2, 0, -10.5],
    neighbors: ['board_hub_n', 'board_seat_1', 'board_seat_2', 'board_seat_3'],
    roomId: 'boardroom',
  },
  board_seat_1: { id: 'board_seat_1', position: [-23.4, 0, -9.65], neighbors: ['board_north_aisle'], roomId: 'boardroom', facingRotationY: 0 },
  board_seat_2: { id: 'board_seat_2', position: [-22.2, 0, -9.65], neighbors: ['board_north_aisle'], roomId: 'boardroom', facingRotationY: 0 },
  board_seat_3: { id: 'board_seat_3', position: [-21.0, 0, -9.65], neighbors: ['board_north_aisle'], roomId: 'boardroom', facingRotationY: 0 },
  board_seat_4: { id: 'board_seat_4', position: [-23.4, 0, -6.75], neighbors: ['board_hub_s'], roomId: 'boardroom', facingRotationY: Math.PI },
  board_seat_5: { id: 'board_seat_5', position: [-22.2, 0, -6.75], neighbors: ['board_hub_s'], roomId: 'boardroom', facingRotationY: Math.PI },
  board_seat_6: { id: 'board_seat_6', position: [-21.0, 0, -6.75], neighbors: ['board_hub_s'], roomId: 'boardroom', facingRotationY: Math.PI },

  hq_corridor_s: {
    id: 'hq_corridor_s',
    position: [-19.4, 0, 5.4],
    neighbors: ['hq_west_arch', 'training_hub', 'training_podium_aisle'],
    roomId: 'training_center',
  },
  training_hub: {
    id: 'training_hub',
    position: [-19.4, 0, 7.6],
    neighbors: ['hq_corridor_s', 'training_seat_1', 'training_seat_2', 'interview_seat_1'],
    roomId: 'training_center',
  },
  training_podium_aisle: {
    id: 'training_podium_aisle',
    position: [-23.6, 0, 5.4],
    neighbors: ['hq_corridor_s', 'training_podium_spot'],
    roomId: 'training_center',
  },
  training_podium_spot: {
    id: 'training_podium_spot',
    position: [-23.6, 0, 7.6],
    neighbors: ['training_podium_aisle'],
    roomId: 'training_center',
    facingRotationY: Math.PI / 2,
  },
  training_seat_1: { id: 'training_seat_1', position: [-21.55, 0, 6.9], neighbors: ['training_hub'], roomId: 'training_center', facingRotationY: -Math.PI / 2 },
  training_seat_2: { id: 'training_seat_2', position: [-21.55, 0, 8.3], neighbors: ['training_hub'], roomId: 'training_center', facingRotationY: -Math.PI / 2 },
  interview_seat_1: { id: 'interview_seat_1', position: [-20.6, 0, 9.55], neighbors: ['training_hub'], roomId: 'training_center', facingRotationY: 0 },
};

export function getSeatFacingRotation(position: [number, number, number]): number | null {
  let bestRot: number | null = null;
  let bestDistSq = 0.45 * 0.45;
  for (const node of Object.values(WAYPOINTS)) {
    if (node.facingRotationY === undefined) continue;
    const dx = node.position[0] - position[0];
    const dz = node.position[2] - position[2];
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestRot = node.facingRotationY;
    }
  }
  return bestRot;
}
