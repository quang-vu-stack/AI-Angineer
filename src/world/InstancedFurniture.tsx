import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CEILING_LIGHT_POSITIONS,
  DESK_PLACEMENTS,
  PLANT_POSITIONS,
} from './officeLayout';

const dummy = new THREE.Object3D();

/**
 * InstancedMesh batching for desks, monitors, laptops, chairs, plants and ceiling lights.
 * Keeps total draw calls low to sustain 60 FPS on Windows laptops.
 */
export const InstancedFurniture: React.FC<{ castShadow: boolean }> = ({ castShadow }) => {
  const deskTopRef = useRef<THREE.InstancedMesh>(null);
  const monitorRef = useRef<THREE.InstancedMesh>(null);
  const laptopRef = useRef<THREE.InstancedMesh>(null);
  const chairRef = useRef<THREE.InstancedMesh>(null);
  const potRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const lightBarRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    DESK_PLACEMENTS.forEach((d, i) => {
      // Desk tabletop
      dummy.position.set(d.position[0], 0.74, d.position[2]);
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      deskTopRef.current?.setMatrixAt(i, dummy.matrix);

      // Monitor
      const monOffsetZ = d.rotationY === Math.PI ? 0.18 : -0.18;
      dummy.position.set(d.position[0] - 0.18, 1.06, d.position[2] + monOffsetZ);
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      monitorRef.current?.setMatrixAt(i, dummy.matrix);

      // Laptop
      dummy.position.set(d.position[0] + 0.34, 0.81, d.position[2] + monOffsetZ * 0.4);
      dummy.rotation.set(0, d.rotationY - 0.2, 0);
      dummy.updateMatrix();
      laptopRef.current?.setMatrixAt(i, dummy.matrix);

      // Chair positioned in front of desk
      const chairOffsetZ =
        d.rotationY === Math.PI ? -0.82 : d.rotationY === 0 ? 0.82 : 0;
      const chairOffsetX = d.rotationY === -Math.PI / 2 ? -0.82 : 0;
      dummy.position.set(d.position[0] + chairOffsetX, 0.42, d.position[2] + chairOffsetZ);
      dummy.rotation.set(0, d.rotationY, 0);
      dummy.updateMatrix();
      chairRef.current?.setMatrixAt(i, dummy.matrix);
    });

    if (deskTopRef.current) deskTopRef.current.instanceMatrix.needsUpdate = true;
    if (monitorRef.current) monitorRef.current.instanceMatrix.needsUpdate = true;
    if (laptopRef.current) laptopRef.current.instanceMatrix.needsUpdate = true;
    if (chairRef.current) chairRef.current.instanceMatrix.needsUpdate = true;

    PLANT_POSITIONS.forEach((p, i) => {
      dummy.position.set(p[0], 0.25, p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      potRef.current?.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p[0], 0.82, p[2]);
      dummy.updateMatrix();
      foliageRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (potRef.current) potRef.current.instanceMatrix.needsUpdate = true;
    if (foliageRef.current) foliageRef.current.instanceMatrix.needsUpdate = true;

    CEILING_LIGHT_POSITIONS.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      lightBarRef.current?.setMatrixAt(i, dummy.matrix);
    });
    if (lightBarRef.current) lightBarRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      {/* Desks */}
      <instancedMesh
        ref={deskTopRef}
        args={[undefined, undefined, DESK_PLACEMENTS.length]}
        castShadow={castShadow}
        receiveShadow
      >
        <boxGeometry args={[1.65, 0.08, 0.82]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.45} metalness={0.1} />
      </instancedMesh>

      {/* Monitors */}
      <instancedMesh
        ref={monitorRef}
        args={[undefined, undefined, DESK_PLACEMENTS.length]}
      >
        <boxGeometry args={[0.62, 0.36, 0.04]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#1e40af"
          emissiveIntensity={0.45}
          roughness={0.25}
        />
      </instancedMesh>

      {/* Laptops */}
      <instancedMesh
        ref={laptopRef}
        args={[undefined, undefined, DESK_PLACEMENTS.length]}
      >
        <boxGeometry args={[0.34, 0.03, 0.24]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </instancedMesh>

      {/* Office Chairs */}
      <instancedMesh
        ref={chairRef}
        args={[undefined, undefined, DESK_PLACEMENTS.length]}
        castShadow={castShadow}
      >
        <boxGeometry args={[0.52, 0.56, 0.52]} />
        <meshStandardMaterial color="#334155" roughness={0.75} />
      </instancedMesh>

      {/* Plant Pots */}
      <instancedMesh ref={potRef} args={[undefined, undefined, PLANT_POSITIONS.length]}>
        <cylinderGeometry args={[0.24, 0.18, 0.48, 10]} />
        <meshStandardMaterial color="#78716c" roughness={0.85} />
      </instancedMesh>

      {/* Plant Foliage */}
      <instancedMesh
        ref={foliageRef}
        args={[undefined, undefined, PLANT_POSITIONS.length]}
        castShadow={castShadow}
      >
        <dodecahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </instancedMesh>

      {/* Ceiling LED Bars */}
      <instancedMesh
        ref={lightBarRef}
        args={[undefined, undefined, CEILING_LIGHT_POSITIONS.length]}
      >
        <boxGeometry args={[2.2, 0.07, 0.32]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#e0f2fe"
          emissiveIntensity={0.95}
        />
      </instancedMesh>
    </group>
  );
};
