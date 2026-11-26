import { DESK_PLACEMENTS } from '../world/officeLayout';

export interface ObstacleBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  category: 'desk' | 'table' | 'wall';
}

function buildDeskObstacles(): ObstacleBox[] {
  return DESK_PLACEMENTS.map((desk) => {
    const isSideways = Math.abs(Math.abs(desk.rotationY) - Math.PI / 2) < 0.05;
    const halfW = isSideways ? 0.41 : 0.82;
    const halfD = isSideways ? 0.82 : 0.41;
    return {
      id: `obs_${desk.id}`,
      minX: desk.position[0] - halfW,
      maxX: desk.position[0] + halfW,
      minZ: desk.position[2] - halfD,
      maxZ: desk.position[2] + halfD,
      category: 'desk',
    };
  });
}

/**
 * Glass partition wall segments matching OfficeEnvironment.tsx.
 * Doorway openings are deliberately left unobstructed so agents pass cleanly through doors.
 */
const PARTITION_WALL_OBSTACLES: ObstacleBox[] = [
  // North room vertical dividers
  { id: 'wall_n_div_1', minX: -10.08, maxX: -9.92, minZ: -12, maxZ: -6, category: 'wall' },
  { id: 'wall_n_div_2', minX: -3.08, maxX: -2.92, minZ: -12, maxZ: -6, category: 'wall' },
  { id: 'wall_n_div_3', minX: 8.92, maxX: 9.08, minZ: -12, maxZ: -6, category: 'wall' },
  // North front glass wall (Z = -6) with doors at X = -13.4, -6.6, 2.5, 13.0
  { id: 'wall_n_f1', minX: -18.0, maxX: -14.4, minZ: -6.08, maxZ: -5.92, category: 'wall' },
  { id: 'wall_n_f2', minX: -12.4, maxX: -7.6, minZ: -6.08, maxZ: -5.92, category: 'wall' },
  { id: 'wall_n_f3', minX: -5.6, maxX: 1.5, minZ: -6.08, maxZ: -5.92, category: 'wall' },
  { id: 'wall_n_f4', minX: 3.5, maxX: 12.0, minZ: -6.08, maxZ: -5.92, category: 'wall' },
  { id: 'wall_n_f5', minX: 14.0, maxX: 18.0, minZ: -6.08, maxZ: -5.92, category: 'wall' },
  // South room vertical dividers
  { id: 'wall_s_div_1', minX: -6.08, maxX: -5.92, minZ: 6, maxZ: 12, category: 'wall' },
  { id: 'wall_s_div_2', minX: 5.92, maxX: 6.08, minZ: 6, maxZ: 12, category: 'wall' },
  // South front glass wall (Z = +6) with doors at X = -12.0, 0.0, 12.0
  { id: 'wall_s_f1', minX: -18.0, maxX: -13.0, minZ: 5.92, maxZ: 6.08, category: 'wall' },
  { id: 'wall_s_f2', minX: -11.0, maxX: -1.0, minZ: 5.92, maxZ: 6.08, category: 'wall' },
  { id: 'wall_s_f3', minX: 1.0, maxX: 11.0, minZ: 5.92, maxZ: 6.08, category: 'wall' },
  { id: 'wall_s_f4', minX: 13.0, maxX: 18.0, minZ: 5.92, maxZ: 6.08, category: 'wall' },
  // Central Meeting Room enclosure (X: -5..5, Z: -3.5..3.5) with doors at North(0,-3.5), South(0,3.5), East(5,0)
  { id: 'wall_m_n1', minX: -5.0, maxX: -1.0, minZ: -3.58, maxZ: -3.42, category: 'wall' },
  { id: 'wall_m_n2', minX: 1.0, maxX: 5.0, minZ: -3.58, maxZ: -3.42, category: 'wall' },
  { id: 'wall_m_s1', minX: -5.0, maxX: -1.0, minZ: 3.42, maxZ: 3.58, category: 'wall' },
  { id: 'wall_m_s2', minX: 1.0, maxX: 5.0, minZ: 3.42, maxZ: 3.58, category: 'wall' },
  // West wall is solid glass + LED progress screen (no west doorway)
  { id: 'wall_m_w', minX: -5.08, maxX: -4.92, minZ: -3.5, maxZ: 3.5, category: 'wall' },
  // East wall has center doorway at Z = -1..1
  { id: 'wall_m_e1', minX: 4.92, maxX: 5.08, minZ: -3.5, maxZ: -1.0, category: 'wall' },
  { id: 'wall_m_e2', minX: 4.92, maxX: 5.08, minZ: 1.0, maxZ: 3.5, category: 'wall' },
];

/**
 * Complete static AABB obstacles for all 20 desks, the central conference table,
 * and every glass partition wall. Prevents agents from clipping through furniture or walls.
 */
export const STATIC_OBSTACLES: ObstacleBox[] = [
  { id: 'meeting_table', minX: -2.95, maxX: 2.95, minZ: -1.02, maxZ: 1.02, category: 'table' },
  { id: 'coffee_table', minX: 10.75, maxX: 12.85, minZ: -0.43, maxZ: 0.43, category: 'table' },
  { id: 'coffee_bar', minX: 15.05, maxX: 16.15, minZ: -1.7, maxZ: 1.7, category: 'desk' },
  ...buildDeskObstacles(),
  ...PARTITION_WALL_OBSTACLES,
];

export function isPointInsideObstacle(x: number, z: number, radius = 0.24): boolean {
  if (x < -17.45 || x > 17.45 || z < -11.45 || z > 11.45) return true;
  for (const box of STATIC_OBSTACLES) {
    if (
      x > box.minX - radius &&
      x < box.maxX + radius &&
      z > box.minZ - radius &&
      z < box.maxZ + radius
    ) {
      return true;
    }
  }
  return false;
}

export function segmentIntersectsObstacle(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  radius = 0.2
): ObstacleBox | null {
  const dist = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(2, Math.ceil(dist / 0.15));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    for (const box of STATIC_OBSTACLES) {
      if (
        x > box.minX - radius &&
        x < box.maxX + radius &&
        z > box.minZ - radius &&
        z < box.maxZ + radius
      ) {
        return box;
      }
    }
  }
  return null;
}

export function clampOutsideObstacles(
  x: number,
  z: number,
  radius = 0.26
): [number, number] {
  let nx = Math.max(-17.4, Math.min(17.4, x));
  let nz = Math.max(-11.4, Math.min(11.4, z));

  for (let pass = 0; pass < 2; pass++) {
    for (const box of STATIC_OBSTACLES) {
      if (
        nx > box.minX - radius &&
        nx < box.maxX + radius &&
        nz > box.minZ - radius &&
        nz < box.maxZ + radius
      ) {
        const dLeft = Math.abs(nx - (box.minX - radius));
        const dRight = Math.abs(box.maxX + radius - nx);
        const dTop = Math.abs(nz - (box.minZ - radius));
        const dBottom = Math.abs(box.maxZ + radius - nz);
        const minD = Math.min(dLeft, dRight, dTop, dBottom);
        if (minD === dLeft) nx = box.minX - radius;
        else if (minD === dRight) nx = box.maxX + radius;
        else if (minD === dTop) nz = box.minZ - radius;
        else nz = box.maxZ + radius;
      }
    }
  }
  return [nx, nz];
}
