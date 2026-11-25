import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CEILING_LIGHT_POSITIONS,
  DESK_PLACEMENTS,
  PLANT_POSITIONS,
} from './officeLayout';

const dummy = new THREE.Object3D();

/**
 * Semi-realistic InstancedMesh batching for desks, legs, desk mats, dual/single monitors,
 * keyboards, laptops, mugs, ergonomic chairs (seat + backrest + base), layered plants, and LED fixtures.
 * Keeps draw calls low to sustain high FPS on laptops.
 */
export const InstancedFurniture: React.FC<{ castShadow: boolean }> = ({ castShadow }) => {
  const deskTopRef = useRef<THREE.InstancedMesh>(null);
  const deskLegLeftRef = useRef<THREE.InstancedMesh>(null);
  const deskLegRightRef = useRef<THREE.InstancedMesh>(null);
  const deskMatRef = useRef<THREE.InstancedMesh>(null);
  const monitorRef = useRef<THREE.InstancedMesh>(null);
  const monitorStandRef = useRef<THREE.InstancedMesh>(null);
  const secondMonitorRef = useRef<THREE.InstancedMesh>(null);
  const keyboardRef = useRef<THREE.InstancedMesh>(null);
  const laptopRef = useRef<THREE.InstancedMesh>(null);
  const mugRef = useRef<THREE.InstancedMesh>(null);
  const chairSeatRef = useRef<THREE.InstancedMesh>(null);
  const chairBackRef = useRef<THREE.InstancedMesh>(null);
  const chairBaseRef = useRef<THREE.InstancedMesh>(null);
  const potRef = useRef<THREE.InstancedMesh>(null);
  const foliageLowRef = useRef<THREE.InstancedMesh>(null);
  const foliageHighRef = useRef<THREE.InstancedMesh>(null);
  const lightFrameRef = useRef<THREE.InstancedMesh>(null);
  const lightBarRef = useRef<THREE.InstancedMesh>(null);

  const dualDesks = DESK_PLACEMENTS.filter((d) => d.hasDualMonitor);

  useLayoutEffect(() => {
    let dualIdx = 0;

    DESK_PLACEMENTS.forEach((d, i) => {
      const cos = Math.cos(d.rotationY);
      const sin = Math.sin(d.rotationY);
      const toWorld = (lx: number, ly: number, lz: number): [number, number, number] => [
        d.position[0] + lx * cos + lz * sin,
        ly,
        d.position[2] - lx * sin + lz * cos,
      ];

      // Desk tabletop (warm oak)
      dummy.position.set(...toWorld(0, 0.74, 0));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      deskTopRef.current?.setMatrixAt(i, dummy.matrix);

      // Desk metal leg frames (left & right)
      dummy.position.set(...toWorld(-0.74, 0.36, 0));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      deskLegLeftRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(...toWorld(0.74, 0.36, 0));
      dummy.updateMatrix();
      deskLegRightRef.current?.setMatrixAt(i, dummy.matrix);

      // Desk mat
      dummy.position.set(...toWorld(0, 0.785, 0.14));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      deskMatRef.current?.setMatrixAt(i, dummy.matrix);

      // Primary Monitor + Stand (back side of desk is local -Z)
      dummy.position.set(...toWorld(-0.18, 1.07, -0.22));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      monitorRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(...toWorld(-0.18, 0.87, -0.24));
      dummy.updateMatrix();
      monitorStandRef.current?.setMatrixAt(i, dummy.matrix);

      // Secondary Monitor (if dual monitor workstation)
      if (d.hasDualMonitor) {
        dummy.position.set(...toWorld(0.42, 1.06, -0.18));
        dummy.rotation.set(0, d.rotationY - 0.18, 0);
        dummy.updateMatrix();
        secondMonitorRef.current?.setMatrixAt(dualIdx, dummy.matrix);
        dualIdx += 1;
      }

      // Keyboard
      dummy.position.set(...toWorld(-0.14, 0.795, 0.12));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      keyboardRef.current?.setMatrixAt(i, dummy.matrix);

      // Laptop (side angled)
      dummy.position.set(...toWorld(0.48, 0.8, 0.08));
      dummy.rotation.set(0, d.rotationY - 0.25, 0);
      dummy.updateMatrix();
      laptopRef.current?.setMatrixAt(i, dummy.matrix);

      // Coffee mug
      dummy.position.set(...toWorld(-0.62, 0.83, 0.18));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      mugRef.current?.setMatrixAt(i, dummy.matrix);

      // Ergonomic Chair aligned to seat waypoint (local +Z = +0.85 in front of desk)
      dummy.position.set(...toWorld(0, 0.44, 0.85));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      chairSeatRef.current?.setMatrixAt(i, dummy.matrix);

      // Chair backrest is behind the seated person (local +Z = +1.06)
      dummy.position.set(...toWorld(0, 0.73, 1.06));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      chairBackRef.current?.setMatrixAt(i, dummy.matrix);

      // Chair pedestal base
      dummy.position.set(...toWorld(0, 0.22, 0.85));
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      chairBaseRef.current?.setMatrixAt(i, dummy.matrix);
    });

    [
      deskTopRef,
      deskLegLeftRef,
      deskLegRightRef,
      deskMatRef,
      monitorRef,
      monitorStandRef,
      secondMonitorRef,
      keyboardRef,
      laptopRef,
      mugRef,
      chairSeatRef,
      chairBackRef,
      chairBaseRef,
    ].forEach((ref) => {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    });

    PLANT_POSITIONS.forEach((p, i) => {
      dummy.position.set(p[0], 0.24, p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      potRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p[0], 0.74, p[2]);
      dummy.rotation.set(0, i * 0.7, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      foliageLowRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p[0], 1.08, p[2]);
      dummy.rotation.set(0, i * 1.3, 0);
      dummy.scale.set(0.76, 0.82, 0.76);
      dummy.updateMatrix();
      foliageHighRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (potRef.current) potRef.current.instanceMatrix.needsUpdate = true;
    if (foliageLowRef.current) foliageLowRef.current.instanceMatrix.needsUpdate = true;
    if (foliageHighRef.current) foliageHighRef.current.instanceMatrix.needsUpdate = true;

    CEILING_LIGHT_POSITIONS.forEach((p, i) => {
      dummy.position.set(p[0], p[1] + 0.04, p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lightFrameRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p[0], p[1], p[2]);
      dummy.updateMatrix();
      lightBarRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (lightFrameRef.current) lightFrameRef.current.instanceMatrix.needsUpdate = true;
    if (lightBarRef.current) lightBarRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      {/* Warm Oak Desk Tabletops */}
      <instancedMesh
        ref={deskTopRef}
        args={[undefined, undefined, DESK_PLACEMENTS.length]}
        castShadow={castShadow}
        receiveShadow
      >
        <boxGeometry args={[1.64, 0.07, 0.82]} />
        <meshStandardMaterial color="#b08968" roughness={0.48} metalness={0.05} />
      </instancedMesh>

      {/* Matte Steel Desk Legs */}
      <instancedMesh ref={deskLegLeftRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <boxGeometry args={[0.06, 0.7, 0.72]} />
        <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.65} />
      </instancedMesh>
      <instancedMesh ref={deskLegRightRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <boxGeometry args={[0.06, 0.7, 0.72]} />
        <meshStandardMaterial color="#1e293b" roughness={0.45} metalness={0.65} />
      </instancedMesh>

      {/* Dark Felt Desk Mats */}
      <instancedMesh ref={deskMatRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <boxGeometry args={[0.88, 0.012, 0.36]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </instancedMesh>

      {/* Primary Monitors */}
      <instancedMesh ref={monitorRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <boxGeometry args={[0.62, 0.36, 0.035]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#1d4ed8"
          emissiveIntensity={0.5}
          roughness={0.22}
          metalness={0.25}
        />
      </instancedMesh>

      {/* Monitor Stands */}
      <instancedMesh ref={monitorStandRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </instancedMesh>

      {/* Secondary Dual Monitors */}
      <instancedMesh ref={secondMonitorRef} args={[undefined, undefined, dualDesks.length]}>
        <boxGeometry args={[0.52, 0.32, 0.035]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#0284c7"
          emissiveIntensity={0.42}
          roughness={0.22}
          metalness={0.25}
        />
      </instancedMesh>

      {/* Keyboards */}
      <instancedMesh ref={keyboardRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <boxGeometry args={[0.38, 0.02, 0.14]} />
        <meshStandardMaterial color="#334155" roughness={0.55} />
      </instancedMesh>

      {/* Laptops */}
      <instancedMesh ref={laptopRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <boxGeometry args={[0.34, 0.025, 0.24]} />
        <meshStandardMaterial color="#64748b" metalness={0.65} roughness={0.28} />
      </instancedMesh>

      {/* Coffee Mugs */}
      <instancedMesh ref={mugRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 8]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.35} />
      </instancedMesh>

      {/* Ergonomic Office Chairs: Seat + Backrest + Pedestal */}
      <instancedMesh
        ref={chairSeatRef}
        args={[undefined, undefined, DESK_PLACEMENTS.length]}
        castShadow={castShadow}
      >
        <boxGeometry args={[0.48, 0.07, 0.46]} />
        <meshStandardMaterial color="#1e293b" roughness={0.75} />
      </instancedMesh>
      <instancedMesh
        ref={chairBackRef}
        args={[undefined, undefined, DESK_PLACEMENTS.length]}
        castShadow={castShadow}
      >
        <boxGeometry args={[0.44, 0.52, 0.06]} />
        <meshStandardMaterial color="#334155" roughness={0.68} />
      </instancedMesh>
      <instancedMesh ref={chairBaseRef} args={[undefined, undefined, DESK_PLACEMENTS.length]}>
        <cylinderGeometry args={[0.04, 0.22, 0.42, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.75} roughness={0.3} />
      </instancedMesh>

      {/* Ceramic Plant Pots */}
      <instancedMesh ref={potRef} args={[undefined, undefined, PLANT_POSITIONS.length]}>
        <cylinderGeometry args={[0.25, 0.19, 0.48, 12]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.68} />
      </instancedMesh>

      {/* Multi-tier Plant Foliage */}
      <instancedMesh
        ref={foliageLowRef}
        args={[undefined, undefined, PLANT_POSITIONS.length]}
        castShadow={castShadow}
      >
        <dodecahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#15803d" roughness={0.78} />
      </instancedMesh>
      <instancedMesh
        ref={foliageHighRef}
        args={[undefined, undefined, PLANT_POSITIONS.length]}
        castShadow={castShadow}
      >
        <dodecahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#16a34a" roughness={0.75} />
      </instancedMesh>

      {/* Ceiling Suspended LED Fixtures */}
      <instancedMesh ref={lightFrameRef} args={[undefined, undefined, CEILING_LIGHT_POSITIONS.length]}>
        <boxGeometry args={[2.32, 0.06, 0.42]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={lightBarRef} args={[undefined, undefined, CEILING_LIGHT_POSITIONS.length]}>
        <boxGeometry args={[2.18, 0.04, 0.3]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#f0f9ff"
          emissiveIntensity={1.15}
        />
      </instancedMesh>
    </group>
  );
};
