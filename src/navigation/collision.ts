export interface ObstacleBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Static AABB obstacles for office desks and central conference table.
 * Used as a safety guard alongside waypoint routing so agents never clip into furniture.
 */
export const STATIC_OBSTACLES: ObstacleBox[] = [
  // Central meeting table
  { id: 'meeting_table', minX: -3.2, maxX: 3.2, minZ: -1.1, maxZ: 1.1 },
  // CEO executive desk
  { id: 'ceo_desk', minX: -15.3, maxX: -12.7, minZ: -10.8, maxZ: -9.8 },
];

export function clampOutsideObstacles(
  x: number,
  z: number,
  radius = 0.32
): [number, number] {
  let nx = Math.max(-17.4, Math.min(17.4, x));
  let nz = Math.max(-11.4, Math.min(11.4, z));

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
  return [nx, nz];
}
