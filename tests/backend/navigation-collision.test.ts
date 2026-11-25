import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialAgents } from '../../src/agents/roster';
import { WAYPOINTS } from '../../src/navigation/waypointGraph';
import { isPointInsideObstacle, segmentIntersectsObstacle } from '../../src/navigation/collision';
import { findPathToWaypoint } from '../../src/navigation/pathfinder';

test('all 20 employees have distinct appearances and spawn outside obstacles facing their desks', () => {
  const agents = createInitialAgents();
  assert.equal(agents.length, 20);

  const signatures = new Set<string>();
  for (const agent of agents) {
    assert.equal(
      isPointInsideObstacle(agent.position[0], agent.position[2]),
      false,
      `Agent ${agent.id} spawns inside an obstacle at (${agent.position[0]}, ${agent.position[2]})`
    );
    const sig = [
      agent.appearance.hairStyle,
      agent.appearance.outfitStyle,
      agent.appearance.shirtColor,
      agent.appearance.hairColor,
      agent.appearance.heightScale,
      agent.appearance.buildScale,
      agent.appearance.facialHair,
      agent.appearance.accessory,
    ].join('|');
    signatures.add(sig);
  }
  assert.equal(signatures.size, 20, 'Every employee must have a unique appearance signature');
});

test('every waypoint and graph edge is strictly clear of desks, tables, and glass walls', () => {
  for (const node of Object.values(WAYPOINTS)) {
    assert.equal(
      isPointInsideObstacle(node.position[0], node.position[2], 0.18),
      false,
      `Waypoint ${node.id} overlaps an obstacle`
    );
    for (const neighborId of node.neighbors) {
      const neighbor = WAYPOINTS[neighborId];
      assert.ok(neighbor, `Missing neighbor ${neighborId} referenced by ${node.id}`);
      const hit = segmentIntersectsObstacle(
        node.position[0],
        node.position[2],
        neighbor.position[0],
        neighbor.position[2],
        0.18
      );
      assert.equal(
        hit,
        null,
        `Edge ${node.id} -> ${neighborId} clips through obstacle ${hit?.id ?? 'unknown'}`
      );
    }
  }
});

test('pathfinding routes every employee desk to central meeting seats without wall or furniture clipping', () => {
  const agents = createInitialAgents();
  for (const agent of agents) {
    const seatId = `meeting_seat_${(agent.numericIndex % 8) + 1}`;
    const path = findPathToWaypoint(agent.position, seatId);
    assert.ok(path.length >= 2, `Expected multi-step path for ${agent.id} -> ${seatId}`);
    for (let i = 0; i < path.length - 1; i++) {
      const hit = segmentIntersectsObstacle(
        path[i][0],
        path[i][2],
        path[i + 1][0],
        path[i + 1][2],
        0.18
      );
      assert.equal(
        hit,
        null,
        `Path segment ${i} for ${agent.id} -> ${seatId} clips through ${hit?.id ?? 'unknown'}`
      );
    }
  }
});
