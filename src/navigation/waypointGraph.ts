export interface WaypointNode {
  id: string;
  position: [number, number, number];
  neighbors: string[];
  roomId?: string;
}

/**
 * Office Layout Coordinate System (36m x 24m):
 * X: -18 .. +18
 * Z: -12 .. +12
 * Central Corridor Ring runs around the Central Meeting Room (X: -5..5, Z: -3.5..3.5):
 *   North Hallway: Z = -5.2
 *   South Hallway: Z = +5.2
 *   West Hallway:  X = -6.8
 *   East Hallway:  X = +6.8
 * All rooms connect ONLY through their doorways so agents never walk through walls or desks.
 */
export const WAYPOINTS: Record<string, WaypointNode> = {
  // === CENTRAL HALLWAY RING ===
  hall_nw: { id: 'hall_nw', position: [-6.8, 0, -5.2], neighbors: ['hall_n_mid', 'hall_w_mid', 'hall_nw_far', 'door_ceo', 'door_ops'] },
  hall_nw_far: { id: 'hall_nw_far', position: [-12.5, 0, -5.2], neighbors: ['hall_nw', 'door_ceo'] },
  hall_n_mid: { id: 'hall_n_mid', position: [0, 0, -5.2], neighbors: ['hall_nw', 'hall_ne', 'door_meeting_n', 'door_eng'] },
  hall_ne: { id: 'hall_ne', position: [6.8, 0, -5.2], neighbors: ['hall_n_mid', 'hall_e_mid', 'hall_ne_far', 'door_eng', 'door_design'] },
  hall_ne_far: { id: 'hall_ne_far', position: [12.5, 0, -5.2], neighbors: ['hall_ne', 'door_design'] },

  hall_w_mid: { id: 'hall_w_mid', position: [-6.8, 0, 0], neighbors: ['hall_nw', 'hall_sw', 'door_meeting_w'] },
  hall_e_mid: { id: 'hall_e_mid', position: [6.8, 0, 0], neighbors: ['hall_ne', 'hall_se', 'door_meeting_e'] },

  hall_sw: { id: 'hall_sw', position: [-6.8, 0, 5.2], neighbors: ['hall_w_mid', 'hall_s_mid', 'hall_sw_far', 'door_ai'] },
  hall_sw_far: { id: 'hall_sw_far', position: [-12.5, 0, 5.2], neighbors: ['hall_sw', 'door_ai'] },
  hall_s_mid: { id: 'hall_s_mid', position: [0, 0, 5.2], neighbors: ['hall_sw', 'hall_se', 'door_meeting_s', 'door_media'] },
  hall_se: { id: 'hall_se', position: [6.8, 0, 5.2], neighbors: ['hall_s_mid', 'hall_e_mid', 'hall_se_far', 'door_media', 'door_fin'] },
  hall_se_far: { id: 'hall_se_far', position: [12.5, 0, 5.2], neighbors: ['hall_se', 'door_fin'] },

  // === 1. CEO OFFICE (X: -18..-10, Z: -12..-6) ===
  door_ceo: { id: 'door_ceo', position: [-13.5, 0, -6.2], neighbors: ['hall_nw_far', 'hall_nw', 'desk_ceo_1'], roomId: 'ceo_office' },
  desk_ceo_1: { id: 'desk_ceo_1', position: [-14.0, 0, -9.2], neighbors: ['door_ceo'], roomId: 'ceo_office' },

  // === 2. OPERATIONS ROOM (X: -10..-3, Z: -12..-6) ===
  door_ops: { id: 'door_ops', position: [-6.5, 0, -6.2], neighbors: ['hall_nw', 'ops_hub'], roomId: 'operations_room' },
  ops_hub: { id: 'ops_hub', position: [-6.5, 0, -7.8], neighbors: ['door_ops', 'desk_ops_1', 'desk_ops_2'], roomId: 'operations_room' },
  desk_ops_1: { id: 'desk_ops_1', position: [-8.2, 0, -9.6], neighbors: ['ops_hub'], roomId: 'operations_room' },
  desk_ops_2: { id: 'desk_ops_2', position: [-4.8, 0, -9.6], neighbors: ['ops_hub'], roomId: 'operations_room' },

  // === 3. ENGINEERING ROOM (X: -3..9, Z: -12..-6) ===
  door_eng: { id: 'door_eng', position: [2.5, 0, -6.2], neighbors: ['hall_n_mid', 'hall_ne', 'eng_hub'], roomId: 'engineering_room' },
  eng_hub: { id: 'eng_hub', position: [2.5, 0, -8.2], neighbors: ['door_eng', 'desk_eng_1', 'desk_eng_2', 'desk_eng_3', 'desk_eng_4', 'desk_eng_5'], roomId: 'engineering_room' },
  desk_eng_1: { id: 'desk_eng_1', position: [-1.2, 0, -10.0], neighbors: ['eng_hub'], roomId: 'engineering_room' },
  desk_eng_2: { id: 'desk_eng_2', position: [1.3, 0, -10.0], neighbors: ['eng_hub'], roomId: 'engineering_room' },
  desk_eng_3: { id: 'desk_eng_3', position: [3.8, 0, -10.0], neighbors: ['eng_hub'], roomId: 'engineering_room' },
  desk_eng_4: { id: 'desk_eng_4', position: [6.4, 0, -10.0], neighbors: ['eng_hub'], roomId: 'engineering_room' },
  desk_eng_5: { id: 'desk_eng_5', position: [6.4, 0, -7.4], neighbors: ['eng_hub'], roomId: 'engineering_room' },

  // === 4. DESIGN 3D ROOM (X: 9..18, Z: -12..-6) ===
  door_design: { id: 'door_design', position: [13.0, 0, -6.2], neighbors: ['hall_ne', 'hall_ne_far', 'design_hub'], roomId: 'design3d_room' },
  design_hub: { id: 'design_hub', position: [13.5, 0, -8.0], neighbors: ['door_design', 'desk_design_1', 'desk_design_2', 'desk_design_3'], roomId: 'design3d_room' },
  desk_design_1: { id: 'desk_design_1', position: [11.2, 0, -9.8], neighbors: ['design_hub'], roomId: 'design3d_room' },
  desk_design_2: { id: 'desk_design_2', position: [13.8, 0, -9.8], neighbors: ['design_hub'], roomId: 'design3d_room' },
  desk_design_3: { id: 'desk_design_3', position: [16.2, 0, -9.8], neighbors: ['design_hub'], roomId: 'design3d_room' },

  // === 5. AI RESEARCH ROOM (X: -18..-6, Z: 6..12) ===
  door_ai: { id: 'door_ai', position: [-12.0, 0, 6.2], neighbors: ['hall_sw', 'hall_sw_far', 'ai_hub'], roomId: 'ai_research_room' },
  ai_hub: { id: 'ai_hub', position: [-12.0, 0, 8.0], neighbors: ['door_ai', 'desk_ai_1', 'desk_ai_2', 'desk_ai_3'], roomId: 'ai_research_room' },
  desk_ai_1: { id: 'desk_ai_1', position: [-15.2, 0, 9.8], neighbors: ['ai_hub'], roomId: 'ai_research_room' },
  desk_ai_2: { id: 'desk_ai_2', position: [-12.0, 0, 9.8], neighbors: ['ai_hub'], roomId: 'ai_research_room' },
  desk_ai_3: { id: 'desk_ai_3', position: [-8.8, 0, 9.8], neighbors: ['ai_hub'], roomId: 'ai_research_room' },

  // === 6. MEDIA ROOM (X: -6..6, Z: 6..12) ===
  door_media: { id: 'door_media', position: [0, 0, 6.2], neighbors: ['hall_s_mid', 'hall_se', 'media_hub'], roomId: 'media_room' },
  media_hub: { id: 'media_hub', position: [0, 0, 8.0], neighbors: ['door_media', 'desk_media_1', 'desk_media_2', 'desk_media_3'], roomId: 'media_room' },
  desk_media_1: { id: 'desk_media_1', position: [-3.4, 0, 9.8], neighbors: ['media_hub'], roomId: 'media_room' },
  desk_media_2: { id: 'desk_media_2', position: [0, 0, 9.8], neighbors: ['media_hub'], roomId: 'media_room' },
  desk_media_3: { id: 'desk_media_3', position: [3.4, 0, 9.8], neighbors: ['media_hub'], roomId: 'media_room' },

  // === 7. FINANCE & HR ROOM (X: 6..18, Z: 6..12) ===
  door_fin: { id: 'door_fin', position: [12.0, 0, 6.2], neighbors: ['hall_se', 'hall_se_far', 'fin_hub'], roomId: 'finance_hr_room' },
  fin_hub: { id: 'fin_hub', position: [12.0, 0, 8.0], neighbors: ['door_fin', 'desk_fin_1', 'desk_fin_2', 'desk_fin_3'], roomId: 'finance_hr_room' },
  desk_fin_1: { id: 'desk_fin_1', position: [8.8, 0, 9.8], neighbors: ['fin_hub'], roomId: 'finance_hr_room' },
  desk_fin_2: { id: 'desk_fin_2', position: [12.0, 0, 9.8], neighbors: ['fin_hub'], roomId: 'finance_hr_room' },
  desk_fin_3: { id: 'desk_fin_3', position: [15.2, 0, 9.8], neighbors: ['fin_hub'], roomId: 'finance_hr_room' },

  // === 8. CENTRAL MEETING ROOM (X: -5..5, Z: -3.5..3.5) ===
  door_meeting_n: { id: 'door_meeting_n', position: [0, 0, -3.6], neighbors: ['hall_n_mid', 'meeting_hub_n'], roomId: 'central_meeting_room' },
  door_meeting_s: { id: 'door_meeting_s', position: [0, 0, 3.6], neighbors: ['hall_s_mid', 'meeting_hub_s'], roomId: 'central_meeting_room' },
  door_meeting_w: { id: 'door_meeting_w', position: [-5.1, 0, 0], neighbors: ['hall_w_mid', 'meeting_hub_n', 'meeting_hub_s'], roomId: 'central_meeting_room' },
  door_meeting_e: { id: 'door_meeting_e', position: [5.1, 0, 0], neighbors: ['hall_e_mid', 'meeting_hub_n', 'meeting_hub_s'], roomId: 'central_meeting_room' },

  meeting_hub_n: { id: 'meeting_hub_n', position: [0, 0, -2.3], neighbors: ['door_meeting_n', 'door_meeting_w', 'door_meeting_e', 'meeting_seat_1', 'meeting_seat_2', 'meeting_seat_3', 'meeting_seat_4'], roomId: 'central_meeting_room' },
  meeting_hub_s: { id: 'meeting_hub_s', position: [0, 0, 2.3], neighbors: ['door_meeting_s', 'door_meeting_w', 'door_meeting_e', 'meeting_seat_5', 'meeting_seat_6', 'meeting_seat_7', 'meeting_seat_8'], roomId: 'central_meeting_room' },

  meeting_seat_1: { id: 'meeting_seat_1', position: [-2.4, 0, -1.6], neighbors: ['meeting_hub_n'], roomId: 'central_meeting_room' },
  meeting_seat_2: { id: 'meeting_seat_2', position: [-0.8, 0, -1.6], neighbors: ['meeting_hub_n'], roomId: 'central_meeting_room' },
  meeting_seat_3: { id: 'meeting_seat_3', position: [0.8, 0, -1.6], neighbors: ['meeting_hub_n'], roomId: 'central_meeting_room' },
  meeting_seat_4: { id: 'meeting_seat_4', position: [2.4, 0, -1.6], neighbors: ['meeting_hub_n'], roomId: 'central_meeting_room' },
  meeting_seat_5: { id: 'meeting_seat_5', position: [-2.4, 0, 1.6], neighbors: ['meeting_hub_s'], roomId: 'central_meeting_room' },
  meeting_seat_6: { id: 'meeting_seat_6', position: [-0.8, 0, 1.6], neighbors: ['meeting_hub_s'], roomId: 'central_meeting_room' },
  meeting_seat_7: { id: 'meeting_seat_7', position: [0.8, 0, 1.6], neighbors: ['meeting_hub_s'], roomId: 'central_meeting_room' },
  meeting_seat_8: { id: 'meeting_seat_8', position: [2.4, 0, 1.6], neighbors: ['meeting_hub_s'], roomId: 'central_meeting_room' },
};
