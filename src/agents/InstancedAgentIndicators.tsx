import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AgentEntity } from './types';

export const AGENT_STATE_COLOR: Record<AgentEntity['state'], string> = {
  Idle: '#94a3b8',
  Walking: '#38bdf8',
  Working: '#22c55e',
  Sitting: '#a3e635',
  Talking: '#f472b6',
  Meeting: '#a78bfa',
  Resting: '#fbbf24',
};

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

/**
 * Renders all 20 overhead status dots and pulsing rings in just 2 draw calls
 * instead of 40 separate meshes.
 */
export const InstancedAgentIndicators: React.FC<{ agents: AgentEntity[] }> = ({ agents }) => {
  const dotRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const count = agents.length;

  const dotGeo = useMemo(() => new THREE.SphereGeometry(0.05, 8, 8), []);
  const haloGeo = useMemo(() => {
    const g = new THREE.RingGeometry(0.075, 0.105, 16);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  useFrame((state) => {
    if (!dotRef.current || !haloRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const isSeated =
        a.state === 'Working' ||
        a.state === 'Sitting' ||
        a.state === 'Meeting' ||
        a.state === 'Resting';
      const yBase = (isSeated ? -0.22 : 0) + 1.88 * a.appearance.heightScale;

      dummy.position.set(a.position[0], yBase, a.position[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      dotRef.current.setMatrixAt(i, dummy.matrix);

      const pulse = 1 + Math.sin(t * 3.5 + a.numericIndex * 1.17) * 0.15;
      dummy.scale.set(pulse, 1, pulse);
      dummy.updateMatrix();
      haloRef.current.setMatrixAt(i, dummy.matrix);

      tmpColor.set(AGENT_STATE_COLOR[a.state]);
      dotRef.current.setColorAt(i, tmpColor);
      haloRef.current.setColorAt(i, tmpColor);
    }
    dotRef.current.instanceMatrix.needsUpdate = true;
    haloRef.current.instanceMatrix.needsUpdate = true;
    if (dotRef.current.instanceColor) dotRef.current.instanceColor.needsUpdate = true;
    if (haloRef.current.instanceColor) haloRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={dotRef} args={[dotGeo, undefined, count]}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={haloRef} args={[haloGeo, undefined, count]}>
        <meshBasicMaterial transparent opacity={0.65} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  );
};
