import { WAYPOINTS } from './waypointGraph';

function distSq(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return dx * dx + dz * dz;
}

function dist(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(distSq(a, b));
}

export function findNearestWaypointId(pos: [number, number, number]): string {
  let bestId = 'hall_n_mid';
  let bestD = Infinity;
  for (const node of Object.values(WAYPOINTS)) {
    const d = distSq(pos, node.position);
    if (d < bestD) {
      bestD = d;
      bestId = node.id;
    }
  }
  return bestId;
}

/**
 * A* search over the office waypoint graph.
 * Guarantees wall/furniture-free paths through doorways and corridors.
 */
export function findPathToWaypoint(
  startPos: [number, number, number],
  goalWaypointId: string
): [number, number, number][] {
  const goalNode = WAYPOINTS[goalWaypointId];
  if (!goalNode) return [];

  const startId = findNearestWaypointId(startPos);
  if (startId === goalWaypointId) {
    return [[...goalNode.position]];
  }

  const openSet = new Set<string>([startId]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([[startId, 0]]);
  const fScore = new Map<string, number>([
    [startId, dist(WAYPOINTS[startId].position, goalNode.position)],
  ]);

  while (openSet.size > 0) {
    let current = '';
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        current = id;
      }
    }

    if (current === goalWaypointId) {
      const path: [number, number, number][] = [];
      let curr: string | undefined = current;
      while (curr) {
        path.unshift([...WAYPOINTS[curr].position]);
        curr = cameFrom.get(curr);
      }
      return path;
    }

    openSet.delete(current);
    const currNode = WAYPOINTS[current];
    if (!currNode) continue;

    for (const neighborId of currNode.neighbors) {
      const neighborNode = WAYPOINTS[neighborId];
      if (!neighborNode) continue;
      const tentativeG =
        (gScore.get(current) ?? Infinity) + dist(currNode.position, neighborNode.position);
      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, current);
        gScore.set(neighborId, tentativeG);
        fScore.set(neighborId, tentativeG + dist(neighborNode.position, goalNode.position));
        openSet.add(neighborId);
      }
    }
  }

  return [[...goalNode.position]];
}
